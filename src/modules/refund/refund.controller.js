const {
  requestRefund,
  processRefund,
  getRefundById,
  getRefundsForPayment,
  getRefunds,
} = require('./refund.service');
const { created, success } = require('../../common/utils/response');

async function handleCreateRefund(req, res, next) {
  try {
    const refund = await requestRefund(req.user, req.body);
    return created(res, refund);
  } catch (err) {
    return next(err);
  }
}

async function handleProcessRefund(req, res, next) {
  try {
    const refund = await processRefund(req.user, req.params.id, req.body.status);
    return success(res, refund);
  } catch (err) {
    return next(err);
  }
}

async function handleGetRefundById(req, res, next) {
  try {
    const refund = await getRefundById(req.user, req.params.id);
    return success(res, refund);
  } catch (err) {
    return next(err);
  }
}

async function handleGetRefundsForPayment(req, res, next) {
  try {
    const refunds = await getRefundsForPayment(req.user, req.params.paymentId);
    return success(res, refunds);
  } catch (err) {
    return next(err);
  }
}

async function handleGetRefunds(req, res, next) {
  try {
    const refunds = await getRefunds(req.user, { all: req.query.all });
    return success(res, refunds);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  handleCreateRefund,
  handleProcessRefund,
  handleGetRefundById,
  handleGetRefundsForPayment,
  handleGetRefunds,
};

