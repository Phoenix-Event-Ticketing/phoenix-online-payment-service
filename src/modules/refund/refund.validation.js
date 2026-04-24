const { z } = require('zod');

const createRefundSchema = {
  body: z.object({
    paymentId: z.string().min(1),
    refundAmount: z.number().positive(),
    refundReason: z.string().min(1),
  }),
};

const getRefundByIdSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
};

const getRefundsByPaymentSchema = {
  params: z.object({
    paymentId: z.string().min(1),
  }),
};

const getRefundsQuerySchema = {
  query: z.object({
    all: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
  }),
};

const updateRefundStatusSchema = {
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    status: z.string().min(1),
  }),
};

module.exports = {
  createRefundSchema,
  getRefundByIdSchema,
  getRefundsByPaymentSchema,
  getRefundsQuerySchema,
  updateRefundStatusSchema,
};

