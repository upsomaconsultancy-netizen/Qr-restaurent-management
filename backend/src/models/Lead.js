const mongoose = require('mongoose');

/**
 * Demo / sales lead captured from the public marketing landing page
 * ("Book a Demo" form). Not tenant-scoped — these are prospects, visible
 * only to the platform SUPER_ADMIN.
 */
const leadSchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true, maxlength: 120 },
    phone:   { type: String, required: true, trim: true, maxlength: 20 },
    email:   { type: String, trim: true, lowercase: true, maxlength: 160, default: null },
    address: { type: String, trim: true, maxlength: 400 },
    message: { type: String, trim: true, maxlength: 1000, default: null },

    status: { type: String, enum: ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'], default: 'NEW' },
    source: { type: String, default: 'landing_book_demo' },

    // Lightweight attribution for follow-up (no PII beyond what user submitted)
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },

    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Super-admin list view: newest first, optionally filtered by status.
leadSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
