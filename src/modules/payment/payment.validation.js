const { z } = require('zod');
const { PAYMENT_STATUS } = require('../../common/constants/paymentStatus');

const createPaymentSchema = {
  body: z.object({
    bookingId: z.string().min(1),
    amount: z.number().positive(),
    currency: z.string().min(1),
    paymentMethod: z.string().min(1),
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
    status: z.nativeEnum(PAYMENT_STATUS),
  }),
};

const cancelPaymentSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

module.exports = {
  createPaymentSchema,
  getPaymentByIdSchema,
  getPaymentsQuerySchema,
  updatePaymentStatusSchema,
  cancelPaymentSchema,
};

