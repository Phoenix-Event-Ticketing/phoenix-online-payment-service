const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const REFUND_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
};

const refundSchema = new mongoose.Schema(
  {
    refundId: {
      type: String,
      required: true,
      unique: true,
      default: uuidv4,
      index: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    refundReason: {
      type: String,
      required: true,
    },
    refundStatus: {
      type: String,
      enum: Object.values(REFUND_STATUS),
      default: REFUND_STATUS.REQUESTED,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = {
  Refund: mongoose.model('Refund', refundSchema),
  REFUND_STATUS,
};

