const Payment = require('./payment.model');
const PaymentAuditLog = require('./paymentAudit.model');
const {
  PAYMENT_STATUS,
  canTransition,
} = require('../../common/constants/paymentStatus');
const { badRequest, notFound, forbidden } = require('../../common/errors');
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

  const payment = await Payment.create({
    bookingId,
    userId: user.id,
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
  }
}

async function updatePaymentStatus(actor, paymentId, newStatus, authToken) {
  const payment = await Payment.findOne({ paymentId });
  if (!payment) {
    throw notFound('Payment not found');
  }

  const oldStatus = payment.status;

  if (!canTransition(oldStatus, newStatus)) {
    throw badRequest(
      `Invalid payment status transition from ${oldStatus} to ${newStatus}`,
      'INVALID_STATUS_TRANSITION',
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
    }
  }

  return payment;
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
  cancelPayment,
};

