const {
  createPayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
  cancelPayment,
} = require('./payment.service');
const { success, created } = require('../../common/utils/response');

async function handleCreatePayment(req, res, next) {
  try {
    const payment = await createPayment(req.user, req.body, req.headers.authorization?.split(' ')[1]);
    return created(res, payment);
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
      req.headers.authorization?.split(' ')[1],
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
  handleGetPaymentById,
  handleGetPayments,
  handleUpdatePaymentStatus,
  handleCancelPayment,
};

