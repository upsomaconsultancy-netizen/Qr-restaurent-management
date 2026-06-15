const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    name: { type: String, required: true },
    unit: { type: String, default: 'pcs' }, // kg, g, l, ml, pcs
    currentStock: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 0 },
    supplier: { name: String, phone: String },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
