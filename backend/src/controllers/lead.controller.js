const Joi = require('joi');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');

const createSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  phone: Joi.string().pattern(/^[0-9+\-\s()]{7,20}$/).required()
    .messages({ 'string.pattern.base': 'Please enter a valid phone number.' }),
  email: Joi.string().email().allow('', null),
  address: Joi.string().min(3).max(400).required(),
  message: Joi.string().max(1000).allow('', null)
});

/**
 * POST /api/public/leads
 * Public "Book a Demo" submission from the marketing landing page.
 */
exports.create = async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw ApiError.badRequest('Please fill the form correctly.', error.details.map(d => d.message));

  const lead = await Lead.create({
    name: value.name,
    phone: value.phone,
    email: value.email || null,
    address: value.address,
    message: value.message || null,
    ipAddress: req.ip,
    userAgent: (req.headers['user-agent'] || '').slice(0, 300)
  });

  res.status(201).json({
    success: true,
    data: { id: lead._id },
    message: 'Thanks! Our team will reach out to schedule your demo shortly.'
  });
};

/**
 * GET /api/admin/leads?status=NEW
 * SUPER_ADMIN: list demo requests, newest first.
 */
exports.list = async (req, res) => {
  const filter = { isDeleted: false };
  if (req.query.status && ['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const [leads, counts] = await Promise.all([
    Lead.find(filter).sort('-createdAt').limit(parseInt(req.query.limit, 10) || 200).lean(),
    Lead.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ])
  ]);

  const byStatus = counts.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});
  res.json({
    success: true,
    data: {
      leads,
      total: leads.length,
      counts: {
        NEW: byStatus.NEW || 0,
        CONTACTED: byStatus.CONTACTED || 0,
        CONVERTED: byStatus.CONVERTED || 0,
        CLOSED: byStatus.CLOSED || 0
      }
    }
  });
};

/**
 * PATCH /api/admin/leads/:id
 * SUPER_ADMIN: update lead status (NEW → CONTACTED → CONVERTED / CLOSED).
 */
exports.update = async (req, res) => {
  const { status } = req.body;
  if (!['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED'].includes(status)) {
    throw ApiError.badRequest(`Invalid status "${status}".`);
  }
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { status },
    { new: true }
  );
  if (!lead) throw ApiError.notFound('Lead not found.');
  res.json({ success: true, data: lead });
};

/**
 * DELETE /api/admin/leads/:id  (soft delete)
 */
exports.remove = async (req, res) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { isDeleted: true },
    { new: true }
  );
  if (!lead) throw ApiError.notFound('Lead not found.');
  res.json({ success: true });
};
