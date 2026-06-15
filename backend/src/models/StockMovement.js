const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', index: true },
    inventoryItemId: { type: mongoose.Types.ObjectId, ref: 'InventoryItem', required: true, index: true },
    type: { type: String, enum: ['PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'WASTAGE'], required: true },
    qty: { type: Number, required: true }, // positive = in, negative = out
    cost: Number,
    orderId: { type: mongoose.Types.ObjectId, ref: 'Order' }, // for auto-consumption
    userId: { type: mongoose.Types.ObjectId, ref: 'User' },
    note: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('StockMovement', stockMovementSchema);
