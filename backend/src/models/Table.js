const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    number: { type: Number, required: true },
    name: String,
    capacity: { type: Number, default: 4 },
    seatsOccupied: { type: Number, default: 0 },
    qrCode: { type: String, required: true, unique: true }, // opaque token embedded in QR url
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

tableSchema.index({ restaurantId: 1, outletId: 1, number: 1 }, { unique: true });
module.exports = mongoose.model('Table', tableSchema);
