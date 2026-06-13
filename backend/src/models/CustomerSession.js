const mongoose = require('mongoose');
const crypto = require('crypto');

const customerSessionSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true },
    tableId:      { type: mongoose.Types.ObjectId, ref: 'Table', required: true },
    sessionId:    { type: mongoose.Types.ObjectId, ref: 'TableSession', required: true },
    customerName: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    sessionToken: { type: String, required: true },
    lastActivity: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Per-table uniqueness scoped to a dining session (same mobile can return next day)
customerSessionSchema.index({ sessionId: 1, mobileNumber: 1 }, { unique: true });
customerSessionSchema.index({ restaurantId: 1, mobileNumber: 1 });
customerSessionSchema.index({ restaurantId: 1, createdAt: -1 });
customerSessionSchema.index({ sessionToken: 1 }, { unique: true });

customerSessionSchema.statics.generateToken = () =>
  crypto.randomBytes(32).toString('hex');

module.exports = mongoose.model('CustomerSession', customerSessionSchema);
