const mongoose = require('mongoose');

const outletSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name:    { type: String, required: true, trim: true },
    address: { type: String, required: true },
    phone:   String,
    email:   String,
    status:  { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
    tableLimit: { type: Number, default: 0 }, // max tables this outlet can create (0 = not set / use restaurant limit)
    googleReviewLink: String, // optional override; falls back to restaurant.googleReviewLink if empty
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

outletSchema.index({ restaurantId: 1, isDeleted: 1 });
module.exports = mongoose.model('Outlet', outletSchema);
