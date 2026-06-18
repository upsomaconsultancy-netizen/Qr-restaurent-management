const mongoose = require('mongoose');

/**
 * A voluntary tip given by a customer to the waiter who served their food.
 * Intentionally kept OUT of the billing math (Order.total, Payment.amount) and
 * the receipt — a tip is a gratuity, not part of the bill the customer pays.
 * One tip document per customer session (upserted if the customer adds again).
 */
const tipSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', index: true },
    sessionId: { type: mongoose.Types.ObjectId, ref: 'TableSession' },
    customerSessionId: { type: mongoose.Types.ObjectId, ref: 'CustomerSession', index: true, unique: true },
    tableId: { type: mongoose.Types.ObjectId, ref: 'Table' },

    customerName: String,
    customerPhone: String,

    amount: { type: Number, required: true, min: 1 },

    // The waiter who served the customer's food — the tip is credited to them.
    waiterId: { type: mongoose.Types.ObjectId, ref: 'User', index: true },
    waiterName: String,
    waiterEmail: String,

    items: [String],          // snapshot of item names for the staff tips table
    orderIds: [{ type: mongoose.Types.ObjectId, ref: 'Order' }]
  },
  { timestamps: true }
);

// Staff tips view: list by waiter (WAITER) or by outlet (OWNER/MANAGER), newest first.
tipSchema.index({ restaurantId: 1, createdAt: -1 });
tipSchema.index({ waiterId: 1, createdAt: -1 });
tipSchema.index({ outletId: 1, createdAt: -1 });

module.exports = mongoose.model('Tip', tipSchema);
