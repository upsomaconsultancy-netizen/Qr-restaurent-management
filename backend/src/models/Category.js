const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    restaurantId: { type: mongoose.Types.ObjectId, ref: 'Restaurant', required: true, index: true },
    name: { type: String, required: true },
    parentId: { type: mongoose.Types.ObjectId, ref: 'Category', default: null }, // subcategories
    imageUrl: String,
    imagePublicId: String,
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Category', categorySchema);
