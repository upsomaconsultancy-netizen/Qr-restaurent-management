const mongoose = require('mongoose');

const DISCOUNT_TYPES = ['PERCENTAGE', 'FLAT'];

/**
 * A customer discount owned by a restaurant and scoped to a single outlet.
 * Assigned to one or more customer mobile numbers; any active, in-window
 * discount auto-applies to every future order placed with that mobile at the
 * outlet until it expires, is deactivated, or the mobile is unassigned.
 */
const discountSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId:     { type: mongoose.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    name:  { type: String, required: true, trim: true },
    type:  { type: String, enum: DISCOUNT_TYPES, required: true },
    value: { type: Number, required: true, min: 0 },           // percent (0-100) or flat ₹ amount
    startDate:  { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    isActive:   { type: Boolean, default: true },
    // Mobile numbers this discount is assigned to (normalized strings).
    assignedMobiles: { type: [String], default: [], index: true },
    createdBy:     { type: mongoose.Types.ObjectId, ref: 'User' },
    createdByName: String,
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

discountSchema.index({ restaurantId: 1, outletId: 1, isDeleted: 1 });
// Fast checkout lookup: active discounts assigned to a mobile at an outlet.
discountSchema.index({ outletId: 1, assignedMobiles: 1, isActive: 1, isDeleted: 1 });

/** PERCENTAGE: value capped at 100. FLAT: value capped at subtotal. Returns ₹ off. */
discountSchema.methods.computeAmount = function (subtotal) {
  if (this.type === 'PERCENTAGE') {
    const pct = Math.min(Math.max(this.value, 0), 100);
    return Math.round(subtotal * pct) / 100;
  }
  return Math.min(Math.max(this.value, 0), subtotal);
};

/** True if active, not deleted, and within its start/expiry window for `now`.
 *  Start/expiry are whole-day boundaries: a discount starting "today" is live
 *  immediately and one expiring "today" stays valid until end of day. */
discountSchema.methods.isLive = function (now = new Date()) {
  if (!this.isActive || this.isDeleted) return false;
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  if (this.startDate && new Date(this.startDate) > todayEnd) return false;
  if (this.expiryDate && new Date(this.expiryDate) < todayStart) return false;
  return true;
};

module.exports = mongoose.model('Discount', discountSchema);
module.exports.DISCOUNT_TYPES = DISCOUNT_TYPES;
