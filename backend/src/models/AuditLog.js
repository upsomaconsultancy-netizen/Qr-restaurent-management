const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', index: true },
    userId: { type: mongoose.Types.ObjectId, ref: 'User' },
    role: String,
    action: { type: String, required: true }, // e.g. ORDER_CREATED, PAYMENT_MARKED_PAID, LOGIN
    entity: String,
    entityId: String,
    ip: String,
    userAgent: String,
    meta: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

auditLogSchema.index({ restaurantId: 1, createdAt: -1 });
module.exports = mongoose.model('AuditLog', auditLogSchema);
