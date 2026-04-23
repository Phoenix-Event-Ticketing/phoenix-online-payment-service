const express = require('express');
const auth = require('../../middleware/auth.middleware');
const { authorizeInternal } = require('../../middleware/internalAuth.middleware');
const { authorize, ROLES } = require('../../middleware/role.middleware');
const { INTERNAL_PERMISSIONS } = require('../../common/constants/internalPermissions');
const validate = require('../../middleware/validate.middleware');
const { mutationRateLimit } = require('../../middleware/rateLimit.middleware');
const {
  createPaymentSchema,
  createInternalPaymentSchema,
  getPaymentByIdSchema,
  getPaymentsQuerySchema,
  updatePaymentStatusSchema,
  cancelPaymentSchema,
} = require('./payment.validation');
const {
  handleCreatePayment,
  handleCreateInternalPayment,
  handleGetPaymentById,
  handleGetPayments,
  handleUpdatePaymentStatus,
  handleCancelPayment,
} = require('./payment.controller');

const router = express.Router();

// Create payment
router.post(
  '/payments',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  mutationRateLimit,
  validate(createPaymentSchema),
  handleCreatePayment,
);

// Internal create payment for booking-service.
router.post(
  '/internal/payments',
  authorizeInternal([INTERNAL_PERMISSIONS.CREATE_PAYMENT_INTERNAL]),
  mutationRateLimit,
  validate(createInternalPaymentSchema),
  handleCreateInternalPayment,
);

// List payments: user sees own; admin can pass ?all=true to see all
router.get(
  '/payments',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  validate(getPaymentsQuerySchema),
  handleGetPayments,
);

// Get payment by id
router.get(
  '/payments/:id',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  validate(getPaymentByIdSchema),
  handleGetPaymentById,
);

// Update payment status (admin only)
router.patch(
  '/payments/:id/status',
  auth,
  authorize([ROLES.ADMIN]),
  mutationRateLimit,
  validate(updatePaymentStatusSchema),
  handleUpdatePaymentStatus,
);

// Cancel payment (owner or admin)
router.patch(
  '/payments/:id/cancel',
  auth,
  authorize([ROLES.USER, ROLES.ADMIN]),
  mutationRateLimit,
  validate(cancelPaymentSchema),
  handleCancelPayment,
);

module.exports = router;

