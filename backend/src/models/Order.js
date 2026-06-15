const mongoose = require('mongoose');

const ITEM_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'DONE', 'READY_TO_SERVE', 'SERVED', 'CANCELLED'];
const ORDER_STATUSES = ['PENDING', 'ACCEPTED', 'PREPARING', 'DONE', 'READY_TO_SERVE', 'SERVED', 'PAYMENT_COMPLETED', 'CLOSED', 'CANCELLED'];

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: { type: mongoose.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,                 // snapshot at order time
    unitPrice: Number,            // snapshot (base + variant)
    variant: { name: String, price: Number },
    addons: [{ name: String, price: Number }],
    qty: { type: Number, min: 1, required: true },
    lineTotal: Number,
    taxes: [
      {
        name: String,
        rate: Number,
        amount: Number
      }
    ],
    taxAmount: Number,
    status: { type: String, enum: ITEM_STATUSES, default: 'PENDING' },
    // item locking: once SERVED the item is immutable for the customer
    servedAt: Date,
    locked: { type: Boolean, default: false },
    servedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    servedByName: String,
    servedByEmail: String,
    statusUpdatedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    statusUpdatedByName: String,
    statusUpdatedByEmail: String,
    notes: String
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    outletId: { type: mongoose.Types.ObjectId, ref: 'Outlet', required: true, index: true },
    tableId: { type: mongoose.Types.ObjectId, ref: 'Table', index: true },
    sessionId:         { type: mongoose.Types.ObjectId, ref: 'TableSession', index: true },
    customerSessionId: { type: mongoose.Types.ObjectId, ref: 'CustomerSession', index: true },
    orderNumber: { type: Number, required: true },
    orderType: { type: String, enum: ['DINING', 'TAKEAWAY', 'DELIVERY'], default: 'DINING' },
    items: [orderItemSchema],
    status: { type: String, enum: ORDER_STATUSES, default: 'PENDING' },

    subtotal: Number,
    taxPercent: Number,
    taxes: [
      {
        name: String,
        amount: Number
      }
    ],
    taxAmount: Number,
    billTaxes: {
      type: [
        new mongoose.Schema(
          { name: String, rate: Number, type: String, amount: Number },
          { _id: false }
        )
      ],
      default: []
    },
    billTaxAmount: { type: Number, default: 0 },
    total: Number,

    paymentStatus: { type: String, enum: ['UNPAID', 'PAID'], default: 'UNPAID' },
    paymentMode:   { type: String, enum: ['CASH', 'CARD', 'UPI', 'OTHER'], default: null },
    servedAt: { type: Date, default: null },
    paidAt:        { type: Date, default: null },
    placedBy: { type: String, enum: ['CUSTOMER', 'STAFF'], default: 'CUSTOMER' },
    placedByUserId: { type: mongoose.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    updatedByName: String,
    updatedByEmail: String,
    paidBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    paidByName: String,
    paidByEmail: String,
    customerName: String,
    customerPhone: String,
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

orderSchema.index({ restaurantId: 1, status: 1, createdAt: -1 });
// Unique order numbers are per-outlet, not per-restaurant — prevents cross-outlet duplicate key errors
orderSchema.index({ outletId: 1, orderNumber: 1 }, { unique: true });
orderSchema.index({ restaurantId: 1, customerSessionId: 1, createdAt: -1 });
orderSchema.index({ restaurantId: 1, paymentStatus: 1 });
orderSchema.index({ outletId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
module.exports.ITEM_STATUSES = ITEM_STATUSES;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
