const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    code:    { type: String, required: true, unique: true },
    email:   { type: String, required: true, lowercase: true },
    phone:   { type: String, required: true },
    address: { type: String, required: true },
    logoUrl: String,
    logoPublicId: String,
    currency:   { type: String, default: 'INR' },
    taxPercent: { type: Number, default: 5 },

    // Receipt / billing fields
    gstin:      String,
    website:    String,
    serviceChargePercent: { type: Number, default: 0 },

    // Bill-level taxes applied once on the full subtotal (not per item)
    billTaxes: [
      {
        name:  { type: String, required: true },
        rate:  { type: Number, required: true, default: 0 },
        type:  { type: String, enum: ['PERCENTAGE', 'FLAT'], default: 'PERCENTAGE' },
        enabled: { type: Boolean, default: true }
      }
    ],

    // SaaS subscription
    plan: { type: String, enum: ['BASIC', 'STANDARD', 'PREMIUM'], default: 'BASIC' },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    tableLimit: { type: Number, default: 10 }, // only Super Admin may change
    subscriptionExpiresAt: Date,

    settings: {
      orderTypes: {
        dining: { type: Boolean, default: true },
        takeaway: { type: Boolean, default: true },
        delivery: { type: Boolean, default: false } // "Coming soon"
      },
      theme: { type: String, default: 'light' }
    },

    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

restaurantSchema.index({ status: 1, isDeleted: 1 });
module.exports = mongoose.model('Restaurant', restaurantSchema);
