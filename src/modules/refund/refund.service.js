const Payment = require('../payment/payment.model');
const PaymentAuditLog = require('../payment/paymentAudit.model');
const { PAYMENT_STATUS } = require('../../common/constants/paymentStatus');
const { Refund, REFUND_STATUS } = require('./refund.model');
const { badRequest, notFound, forbidden } = require('../../common/errors');

function asSafeString(value, fieldName) {
  if (typeof value !== 'string') {
    throw badRequest(`${fieldName} must be a string`, 'INVALID_INPUT_TYPE');
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw badRequest(`${fieldName} is required`, 'INVALID_INPUT');
  }
  return trimmed;
}

async function requestRefund(user, payload) {
  const { paymentId, refundAmount, refundReason } = payload;
  const safePaymentId = asSafeString(paymentId, 'paymentId');

  if (refundAmount <= 0) {
    throw badRequest('Refund amount must be positive');
  }

  const payment = await Payment.findOne({ paymentId: safePaymentId });
  if (!payment) {
    throw notFound('Payment not found');
  }

  if (user.role !== 'ADMIN' && payment.userId !== user.id) {
    throw forbidden('You do not have access to refund this payment');
  }

  if (payment.status !== PAYMENT_STATUS.SUCCESS) {
    throw badRequest(
      'Only successful payments can be refunded',
      'REFUND_ONLY_SUCCESS',
    );
  }

  if (refundAmount > payment.amount) {
    throw badRequest(
      'Refund amount cannot exceed original payment amount',
      'REFUND_AMOUNT_EXCEEDS_PAYMENT',
    );
  }

  const refund = await Refund.create({
    paymentId: safePaymentId,
    userId: user.id,
    refundAmount,
    refundReason,
    refundStatus: REFUND_STATUS.REQUESTED,
  });

  const oldPaymentStatus = payment.status;
  payment.status = PAYMENT_STATUS.REFUNDED;
  await payment.save();

  await PaymentAuditLog.create({
    eventType: 'REFUND_REQUESTED',
    paymentId: safePaymentId,
    actorId: user.id,
    oldStatus: oldPaymentStatus,
    newStatus: payment.status,
    metadata: {
      refundId: refund.refundId,
      refundAmount,
    },
  });

  return refund;
}

async function processRefund(actor, refundId, status) {
  const safeRefundId = asSafeString(refundId, 'refundId');
  const safeStatus = asSafeString(status, 'status');

  const refund = await Refund.findOne({ refundId: safeRefundId });
  if (!refund) {
    throw notFound('Refund not found');
  }

  if (actor.role !== 'ADMIN') {
    throw forbidden('Only admins can process refunds');
  }

  if (!Object.values(REFUND_STATUS).includes(safeStatus)) {
    throw badRequest('Invalid refund status');
  }

  const oldStatus = refund.refundStatus;
  refund.refundStatus = safeStatus;
  await refund.save();

  const payment = await Payment.findOne({ paymentId: refund.paymentId });
  if (payment && safeStatus === REFUND_STATUS.COMPLETED) {
    const oldPaymentStatus = payment.status;
    payment.status = PAYMENT_STATUS.REFUNDED;
    await payment.save();

    await PaymentAuditLog.create({
      eventType: 'PAYMENT_REFUNDED',
      paymentId: payment.paymentId,
      actorId: actor.id,
      oldStatus: oldPaymentStatus,
      newStatus: payment.status,
      metadata: {
        refundId: refund.refundId,
      },
    });
  }

  await PaymentAuditLog.create({
    eventType: 'REFUND_STATUS_UPDATED',
    paymentId: refund.paymentId,
    actorId: actor.id,
    oldStatus,
    newStatus: safeStatus,
    metadata: {
      refundId: refund.refundId,
    },
  });

  return refund;
}

async function getRefundById(user, refundId) {
  const safeRefundId = asSafeString(refundId, 'refundId');
  const refund = await Refund.findOne({ refundId: safeRefundId });
  if (!refund) {
    throw notFound('Refund not found');
  }

  if (user.role !== 'ADMIN' && refund.userId !== user.id) {
    throw forbidden('You do not have access to this refund');
  }

  return refund;
}

async function getRefundsForPayment(user, paymentId) {
  const safePaymentId = asSafeString(paymentId, 'paymentId');
  const query =
    user.role === 'ADMIN'
      ? { paymentId: safePaymentId }
      : { paymentId: safePaymentId, userId: user.id };
  return Refund.find(query).sort({ createdAt: -1 });
}

async function getRefunds(user, { all } = {}) {
  if (user.role === 'ADMIN' && all) {
    return Refund.find().sort({ createdAt: -1 });
  }

  if (user.role === 'ADMIN') {
    return Refund.find().sort({ createdAt: -1 });
  }

  return Refund.find({ userId: user.id }).sort({ createdAt: -1 });
}

module.exports = {
  requestRefund,
  processRefund,
  getRefundById,
  getRefundsForPayment,
  getRefunds,
};

