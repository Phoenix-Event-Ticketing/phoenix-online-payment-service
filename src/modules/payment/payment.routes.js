const express = require('express');
const auth = require('../../middleware/auth.middleware');
const { authorize, ROLES } = require('../../middleware/role.middleware');
const validate = require('../../middleware/validate.middleware');
const { mutationRateLimit } = require('../../middleware/rateLimit.middleware');
const {
  createPaymentSchema,
  getPaymentByIdSchema,
  getPaymentsQuerySchema,
  updatePaymentStatusSchema,
  cancelPaymentSchema,
} = require('./payment.validation');
const {
  handleCreatePayment,
  handleGetPaymentById,
  handleGetPayments,
  handleUpdatePaymentStatus,
  handleCancelPayment,
} = require('./payment.controller');

const router = express.Router();

// Create payment
router.post(
  '/api/payments',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  mutationRateLimit,
  validate(createPaymentSchema),
  handleCreatePayment,
);

// List payments: user sees own; admin can pass ?all=true to see all
router.get(
  '/api/payments',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  validate(getPaymentsQuerySchema),
  handleGetPayments,
);

// Get payment by id
router.get(
  '/api/payments/:id',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  validate(getPaymentByIdSchema),
  handleGetPaymentById,
);

// Update payment status (admin only)
router.patch(
  '/api/payments/:id/status',
  auth,
  authorize([ROLES.ADMIN]),
  mutationRateLimit,
  validate(updatePaymentStatusSchema),
  handleUpdatePaymentStatus,
);

// Cancel payment (owner or admin)
router.patch(
  '/api/payments/:id/cancel',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  mutationRateLimit,
  validate(cancelPaymentSchema),
  handleCancelPayment,
);

module.exports = router;

