const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', index: true },
    sessionId: { type: mongoose.Types.ObjectId, ref: 'TableSession', index: true },
    orderIds: [{ type: mongoose.Types.ObjectId, ref: 'Order' }],
    amount: { type: Number, required: true },
    // 'OTHER' is accepted by the mark-paid controller, so it must be valid here
    // too — otherwise an OTHER payment throws a schema validation error.
    method: { type: String, enum: ['CASH', 'UPI', 'CARD', 'OTHER'], required: true },
    collectedBy: { type: mongoose.Types.ObjectId, ref: 'User' }, // waiter/cashier who marked paid
    collectedByName: String,
    collectedByEmail: String,
    collectedAt: { type: Date, default: Date.now },
    reference: String // UPI txn id / card ref
  },
  { timestamps: true }
);

// Staff-performance analytics: $match on { restaurantId, createdAt range },
// optionally outletId, grouped by collectedBy.
paymentSchema.index({ restaurantId: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
