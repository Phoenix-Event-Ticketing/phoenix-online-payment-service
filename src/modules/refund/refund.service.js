const Payment = require('../payment/payment.model');
const PaymentAuditLog = require('../payment/paymentAudit.model');
const { PAYMENT_STATUS } = require('../../common/constants/paymentStatus');
const { Refund, REFUND_STATUS } = require('./refund.model');
const { badRequest, notFound, forbidden } = require('../../common/errors');

async function requestRefund(user, payload) {
  const { paymentId, refundAmount, refundReason } = payload;

  if (refundAmount <= 0) {
    throw badRequest('Refund amount must be positive');
  }

  const payment = await Payment.findOne({ paymentId });
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
    paymentId,
    userId: user.id,
    refundAmount,
    refundReason,
    refundStatus: REFUND_STATUS.REQUESTED,
  });

  await PaymentAuditLog.create({
    eventType: 'REFUND_REQUESTED',
    paymentId,
    actorId: user.id,
    oldStatus: payment.status,
    newStatus: payment.status,
    metadata: {
      refundId: refund.refundId,
      refundAmount,
    },
  });

  return refund;
}

async function processRefund(actor, refundId, status) {
  const refund = await Refund.findOne({ refundId });
  if (!refund) {
    throw notFound('Refund not found');
  }

  if (actor.role !== 'ADMIN') {
    throw forbidden('Only admins can process refunds');
  }

  if (!Object.values(REFUND_STATUS).includes(status)) {
    throw badRequest('Invalid refund status');
  }

  const oldStatus = refund.refundStatus;
  refund.refundStatus = status;
  await refund.save();

  const payment = await Payment.findOne({ paymentId: refund.paymentId });
  if (payment && status === REFUND_STATUS.COMPLETED) {
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
    newStatus: status,
    metadata: {
      refundId: refund.refundId,
    },
  });

  return refund;
}

async function getRefundById(user, refundId) {
  const refund = await Refund.findOne({ refundId });
  if (!refund) {
    throw notFound('Refund not found');
  }

  if (user.role !== 'ADMIN' && refund.userId !== user.id) {
    throw forbidden('You do not have access to this refund');
  }

  return refund;
}

async function getRefundsForPayment(user, paymentId) {
  const query = user.role === 'ADMIN' ? { paymentId } : { paymentId, userId: user.id };
  return Refund.find(query).sort({ createdAt: -1 });
}

module.exports = {
  requestRefund,
  processRefund,
  getRefundById,
  getRefundsForPayment,
};

