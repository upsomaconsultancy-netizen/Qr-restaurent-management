const mongoose = require('mongoose');

/**
 * One dining session per table. Created when a customer scans the QR and
 * places the first order; all subsequent orders join the same session so the
 * "live bill" aggregates correctly. Closed when the bill is settled.
 */
const tableSessionSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    tableId: { type: mongoose.Types.ObjectId, ref: 'Table', required: true, index: true },
    sessionToken: { type: String, required: true, unique: true }, // held by the customer's browser
    status: { type: String, enum: ['OPEN', 'CLOSED'], default: 'OPEN' },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date
  },
  { timestamps: true }
);

tableSessionSchema.index({ restaurantId: 1, tableId: 1, status: 1 });
module.exports = mongoose.model('TableSession', tableSessionSchema);
