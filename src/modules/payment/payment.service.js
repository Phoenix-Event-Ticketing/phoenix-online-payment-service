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
} = require('../../integrations/bookingService.client');

async function createPayment(user, payload, authToken) {
  const { bookingId, amount, currency, paymentMethod, metadata } = payload;

  if (amount <= 0) {
    throw badRequest('Amount must be positive');
  }

  // Verify booking exists; Booking Service can also enforce ownership.
  await getBookingById(bookingId, authToken);

  const payment = await Payment.create({
    bookingId,
    userId: user.id,
    amount,
    currency,
    paymentMethod,
    status: PAYMENT_STATUS.PENDING,
    metadata,
  });

  await PaymentAuditLog.create({
    eventType: 'PAYMENT_CREATED',
    paymentId: payment.paymentId,
    actorId: user.id,
    newStatus: PAYMENT_STATUS.PENDING,
    metadata: {
      bookingId,
      amount,
      currency,
      paymentMethod,
    },
  });

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

  await PaymentAuditLog.create({
    eventType: 'PAYMENT_STATUS_UPDATED',
    paymentId: payment.paymentId,
    actorId: actor.id,
    oldStatus,
    newStatus,
  });

  if (newStatus === PAYMENT_STATUS.SUCCESS) {
    try {
      await markBookingAsPaid(payment.bookingId, payment.paymentId, authToken);
    } catch (err) {
      await PaymentAuditLog.create({
        eventType: 'BOOKING_MARK_PAID_FAILED',
        paymentId: payment.paymentId,
        actorId: actor.id,
        oldStatus,
        newStatus,
        metadata: {
          bookingId: payment.bookingId,
          error: err.message,
        },
      });
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

  await PaymentAuditLog.create({
    eventType: 'PAYMENT_CANCELLED',
    paymentId: payment.paymentId,
    actorId: actor.id,
    oldStatus,
    newStatus: PAYMENT_STATUS.CANCELLED,
  });

  return payment;
}

module.exports = {
  createPayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
  cancelPayment,
};

