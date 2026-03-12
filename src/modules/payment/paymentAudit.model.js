const mongoose = require('mongoose');

const paymentAuditSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
    },
    paymentId: {
      type: String,
      required: true,
      index: true,
    },
    actorId: {
      type: String,
      required: true,
    },
    oldStatus: {
      type: String,
    },
    newStatus: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

module.exports = mongoose.model('PaymentAuditLog', paymentAuditSchema);

