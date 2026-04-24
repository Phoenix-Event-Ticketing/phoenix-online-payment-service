const Payment = require('./payment.model');
const PaymentAuditLog = require('./paymentAudit.model');
const { PAYMENT_METHODS } = require('./payment.constants');
const {
  PAYMENT_STATUS,
  canTransition,
} = require('../../common/constants/paymentStatus');
const { AppError, badRequest, notFound, forbidden } = require('../../common/errors');
const {
  getBookingById,
  markBookingAsPaid,
  markBookingPaymentFailed,
} = require('../../integrations/bookingService.client');

// Helper function to create audit log entries
async function createAuditLog(eventType, paymentId, actorId, oldStatus = null, newStatus = null, metadata = {}) {
  await PaymentAuditLog.create({
    eventType,
    paymentId,
    actorId,
    oldStatus,
    newStatus,
    metadata,
  });
}

async function createPayment(user, payload, authToken) {
  const {
    bookingId,
    userId,
    amount,
    currency,
    paymentMethod,
    metadata,
    customerEmail,
    callbackUrl,
    description,
  } = payload;

  if (amount <= 0) {
    throw badRequest('Amount must be positive');
  }

  // Verify booking exists; Booking Service can also enforce ownership.
  await getBookingById(bookingId, authToken);

  const resolvedUserId = userId || user?.id;
  if (!resolvedUserId) {
    throw badRequest('userId is required for payment creation');
  }

  const payment = await Payment.create({
    bookingId,
    userId: resolvedUserId,
    amount,
    currency: currency || 'LKR',
    paymentMethod: paymentMethod || 'CARD',
    status: PAYMENT_STATUS.PENDING,
    metadata: {
      ...(metadata || {}),
      ...(customerEmail ? { customerEmail } : {}),
      ...(callbackUrl ? { callbackUrl } : {}),
      ...(description ? { description } : {}),
    },
  });

  await createAuditLog(
    'PAYMENT_CREATED',
    payment.paymentId,
    user.id,
    null,
    PAYMENT_STATUS.PENDING,
    {
      bookingId,
      amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
    }
  );

  return payment;
}

async function getPaymentById(user, paymentId) {
  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw notFound('Payment not found');
  }

  if (user.role !== 'ADMIN' && payment.userId !== user.id) {
    throw forbidden('You do not have access to this payment');
  }

  return payment;
}

async function getPayments(user, { all } = {}) {
  if (user.role === 'ADMIN' && all) {
    return Payment.find().sort({ createdAt: -1 });
  }

  return Payment.find({ userId: user.id }).sort({ createdAt: -1 });
}

// Helper function to handle booking marking when payment succeeds
function normalizePaymentMethod(paymentMethod) {
  if (!paymentMethod) return undefined;
  const normalized = String(paymentMethod).trim().toUpperCase();
  if (!Object.values(PAYMENT_METHODS).includes(normalized)) {
    throw badRequest('Unsupported payment method', 'INVALID_PAYMENT_METHOD');
  }
  return normalized;
}

async function handleSuccessfulPayment(payment, actor, oldStatus, newStatus, authToken) {
  try {
    await markBookingAsPaid(payment.bookingId, payment.paymentId, authToken);
  } catch (err) {
    await createAuditLog(
      'BOOKING_MARK_PAID_FAILED',
      payment.paymentId,
      actor.id,
      oldStatus,
      newStatus,
      {
        bookingId: payment.bookingId,
        error: err.message,
      }
    );
    throw new AppError(
      'Payment succeeded but booking confirmation failed',
      502,
      'BOOKING_SYNC_FAILED',
      {
        bookingId: payment.bookingId,
        paymentId: payment.paymentId,
      },
    );
  }
}

function applyPaymentMethodOverride(payment, paymentMethod) {
  const normalized = normalizePaymentMethod(paymentMethod);
  if (!normalized) return false;
  if (payment.paymentMethod === normalized) {
    return false;
  }
  payment.paymentMethod = normalized;
  return true;
}

function isBankTransfer(payment) {
  return payment.paymentMethod === PAYMENT_METHODS.BANK_TRANSFER;
}

async function updatePaymentStatus(actor, paymentId, newStatus, authToken, paymentMethod) {
  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw notFound('Payment not found');
  }

  const oldStatus = payment.status;
  const methodChanged = applyPaymentMethodOverride(payment, paymentMethod);
  const bankTransferApprovalShortcut =
    isBankTransfer(payment)
    && oldStatus === PAYMENT_STATUS.PENDING
    && (newStatus === PAYMENT_STATUS.SUCCESS || newStatus === PAYMENT_STATUS.FAILED);

  if (oldStatus === newStatus) {
    if (methodChanged) {
      await payment.save();
      await createAuditLog(
        'PAYMENT_METHOD_UPDATED',
        payment.paymentId,
        actor.id,
        oldStatus,
        newStatus,
        { paymentMethod }
      );
      return payment;
    }
    await createAuditLog(
      'PAYMENT_STATUS_NOOP',
      payment.paymentId,
      actor.id,
      oldStatus,
      newStatus,
      { reason: 'duplicate status update' }
    );
    return payment;
  }

  if (!canTransition(oldStatus, newStatus) && !bankTransferApprovalShortcut) {
    throw badRequest(
      `Invalid payment status transition from ${oldStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
    );
  }

  if (bankTransferApprovalShortcut) {
    payment.status = PAYMENT_STATUS.PROCESSING;
    await payment.save();
    await createAuditLog(
      'PAYMENT_STATUS_UPDATED',
      payment.paymentId,
      actor.id,
      PAYMENT_STATUS.PENDING,
      PAYMENT_STATUS.PROCESSING,
      { reason: 'bank transfer admin approval shortcut' },
    );
  }

  payment.status = newStatus;
  await payment.save();

  await createAuditLog(
    'PAYMENT_STATUS_UPDATED',
    payment.paymentId,
    actor.id,
    oldStatus,
    newStatus
  );

  if (newStatus === PAYMENT_STATUS.SUCCESS) {
    await handleSuccessfulPayment(payment, actor, oldStatus, newStatus, authToken);
  } else if (newStatus === PAYMENT_STATUS.FAILED) {
    try {
      await markBookingPaymentFailed(
        payment.bookingId,
        payment.transactionReference || payment.paymentId,
        authToken,
      );
    } catch (err) {
      await createAuditLog(
        'BOOKING_MARK_FAILED_FAILED',
        payment.paymentId,
        actor.id,
        oldStatus,
        newStatus,
        {
          bookingId: payment.bookingId,
          error: err.message,
        }
      );
      throw new AppError(
        'Payment failed but booking failure callback did not sync',
        502,
        'BOOKING_SYNC_FAILED',
        {
          bookingId: payment.bookingId,
          paymentId: payment.paymentId,
        },
      );
    }
  }

  return payment;
}

async function completePayment(actor, paymentId, newStatus, authToken, paymentMethod) {
  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw notFound('Payment not found');
  }

  if (actor.role !== 'ADMIN' && payment.userId !== actor.id) {
    throw forbidden('You do not have access to complete this payment');
  }
  if (isBankTransfer(payment) && actor.role !== 'ADMIN') {
    throw forbidden(
      'Bank transfer payments must be approved by an admin',
      'BANK_TRANSFER_ADMIN_APPROVAL_REQUIRED',
    );
  }

  if (newStatus !== PAYMENT_STATUS.SUCCESS && newStatus !== PAYMENT_STATUS.FAILED) {
    throw badRequest('Unsupported completion status', 'INVALID_COMPLETION_STATUS');
  }

  applyPaymentMethodOverride(payment, paymentMethod);

  if (payment.status === newStatus) {
    await createAuditLog(
      'PAYMENT_COMPLETION_NOOP',
      payment.paymentId,
      actor.id,
      payment.status,
      newStatus,
      { reason: 'duplicate completion request' }
    );
    return payment;
  }

  const transitionStatus =
    payment.status === PAYMENT_STATUS.PENDING ? PAYMENT_STATUS.PROCESSING : payment.status;

  if (transitionStatus !== payment.status) {
    payment.status = transitionStatus;
    await payment.save();
    await createAuditLog(
      'PAYMENT_STATUS_UPDATED',
      payment.paymentId,
      actor.id,
      PAYMENT_STATUS.PENDING,
      PAYMENT_STATUS.PROCESSING,
    );
  }

  return updatePaymentStatus(actor, paymentId, newStatus, authToken, paymentMethod);
}

async function cancelPayment(actor, paymentId) {
  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw notFound('Payment not found');
  }

  if (actor.role !== 'ADMIN' && payment.userId !== actor.id) {
    throw forbidden('You do not have access to cancel this payment');
  }

  const oldStatus = payment.status;

  if (!canTransition(oldStatus, PAYMENT_STATUS.CANCELLED)) {
    throw badRequest(
      `Payment cannot be cancelled from status ${oldStatus}`,
      'INVALID_CANCEL_STATUS',
    );
  }

  payment.status = PAYMENT_STATUS.CANCELLED;
  await payment.save();

  await createAuditLog(
    'PAYMENT_CANCELLED',
    payment.paymentId,
    actor.id,
    oldStatus,
    PAYMENT_STATUS.CANCELLED
  );

  return payment;
}

module.exports = {
  createPayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
  completePayment,
  cancelPayment,
};

