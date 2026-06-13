const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema(
  { name: String, price: Number },
  { _id: true }
);
const addonSchema = new mongoose.Schema(
  { name: String, price: Number },
  { _id: true }
);

const menuItemSchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    categoryId: { type: mongoose.Types.ObjectId, ref: 'Category', required: true, index: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    imageUrl: String,
    imagePublicId: String,
    foodType: { type: String, enum: ['VEG', 'NON_VEG', 'JAIN'], default: 'VEG' },
    spicyLevel: { type: Number, min: 0, max: 3, default: 0 },
    prepTimeMinutes: { type: Number, default: 15 },
    variants: [variantSchema],
    addons: [addonSchema],
    isCombo: { type: Boolean, default: false },
    comboItems: [{ type: mongoose.Types.ObjectId, ref: 'MenuItem' }],
    isAvailable: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    taxes: [
      {
        name: String,
        rate: Number
      }
    ],
    // inventory hook: raw materials consumed per unit sold
    recipe: [
      {
        inventoryItemId: { type: mongoose.Types.ObjectId, ref: 'InventoryItem' },
        qty: Number
      }
    ]
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurantId: 1, isAvailable: 1, isDeleted: 1 });
module.exports = mongoose.model('MenuItem', menuItemSchema);
