const { z } = require('zod');
const { PAYMENT_STATUS } = require('../../common/constants/paymentStatus');

const createPaymentSchema = {
  body: z.object({
    bookingId: z.string().min(1),
    amount: z.number().positive(),
    // New canonical fields
    currency: z.string().min(1).optional(),
    paymentMethod: z.string().min(1).optional(),
    // Legacy compatibility fields from booking-service integration payload
    customerEmail: z.string().email().optional(),
    callbackUrl: z.string().url().optional(),
    description: z.string().min(1).optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

const createInternalPaymentSchema = {
  body: z.object({
    bookingId: z.string().min(1),
    userId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().min(1).optional(),
    paymentMethod: z.string().min(1).optional(),
    customerEmail: z.string().email().optional(),
    callbackUrl: z.string().url().optional(),
    description: z.string().min(1).optional(),
    metadata: z.record(z.any()).optional(),
  }),
};

const getPaymentByIdSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

const getPaymentsQuerySchema = {
  query: z.object({
    all: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
};

const updatePaymentStatusSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum(Object.values(PAYMENT_STATUS)),
  }),
};

const completePaymentSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.enum([PAYMENT_STATUS.SUCCESS, PAYMENT_STATUS.FAILED]),
  }),
};

const cancelPaymentSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

module.exports = {
  createPaymentSchema,
  createInternalPaymentSchema,
  getPaymentByIdSchema,
  getPaymentsQuerySchema,
  updatePaymentStatusSchema,
  completePaymentSchema,
  cancelPaymentSchema,
};

