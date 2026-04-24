const express = require('express');
const auth = require('../../middleware/auth.middleware');
const { authorize, ROLES } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const { mutationRateLimit } = require('../../middleware/rateLimit.middleware');
const {
  createRefundSchema,
  getRefundByIdSchema,
  getRefundsByPaymentSchema,
  updateRefundStatusSchema,
} = require('./refund.validation');
const {
  handleCreateRefund,
  handleProcessRefund,
  handleGetRefundById,
  handleGetRefundsForPayment,
} = require('./refund.controller');

const router = express.Router();

// Create refund request
router.post(
  '/refunds',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  mutationRateLimit,
  validate(createRefundSchema),
  handleCreateRefund,
);

// Process refund (admin only) - update status
router.patch(
  '/refunds/:id/status',
  auth,
  authorize([ROLES.ADMIN]),
  mutationRateLimit,
  validate(updateRefundStatusSchema),
  handleProcessRefund,
);

// Get refund by id
router.get(
  '/refunds/:id',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  validate(getRefundByIdSchema),
  handleGetRefundById,
);

// Get refunds by payment id
router.get(
  '/refunds/payment/:paymentId',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  validate(getRefundsByPaymentSchema),
  handleGetRefundsForPayment,
);

module.exports = router;

