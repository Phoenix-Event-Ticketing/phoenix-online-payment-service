const {
  createPayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
  cancelPayment,
} = require('./payment.service');
const { success, created } = require('../../common/utils/response');

function extractBearerToken(header) {
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }
  return header.substring('Bearer '.length);
}

async function handleCreatePayment(req, res, next) {
  try {
    const payment = await createPayment(req.user, req.body, extractBearerToken(req.headers.authorization));
    const normalizedPayment = typeof payment?.toObject === 'function' ? payment.toObject() : payment;
    return created(res, {
      ...normalizedPayment,
      id: normalizedPayment.paymentId || normalizedPayment.id,
      paymentReferenceId: normalizedPayment.paymentId || normalizedPayment.paymentReferenceId,
    });
  } catch (err) {
    return next(err);
  }
}

async function handleCreateInternalPayment(req, res, next) {
  try {
    const payment = await createPayment(req.user, req.body, undefined);
    const normalizedPayment = typeof payment?.toObject === 'function' ? payment.toObject() : payment;
    return created(res, {
      ...normalizedPayment,
      id: normalizedPayment.paymentId || normalizedPayment.id,
      paymentReferenceId: normalizedPayment.paymentId || normalizedPayment.paymentReferenceId,
    });
  } catch (err) {
    return next(err);
  }
}

async function handleGetPaymentById(req, res, next) {
  try {
    const payment = await getPaymentById(req.user, req.params.id);
    return success(res, payment);
  } catch (err) {
    return next(err);
  }
}

async function handleGetPayments(req, res, next) {
  try {
    const payments = await getPayments(req.user, { all: req.query.all });
    return success(res, payments);
  } catch (err) {
    return next(err);
  }
}

async function handleUpdatePaymentStatus(req, res, next) {
  try {
    const payment = await updatePaymentStatus(
      req.user,
      req.params.id,
      req.body.status,
      extractBearerToken(req.headers.authorization),
    );
    return success(res, payment);
  } catch (err) {
    return next(err);
  }
}

async function handleCancelPayment(req, res, next) {
  try {
    const payment = await cancelPayment(req.user, req.params.id);
    return success(res, payment);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  handleCreatePayment,
  handleCreateInternalPayment,
  handleGetPaymentById,
  handleGetPayments,
  handleUpdatePaymentStatus,
  handleCancelPayment,
};

