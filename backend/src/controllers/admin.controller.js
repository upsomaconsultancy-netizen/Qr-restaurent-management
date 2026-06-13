const Joi = require('joi');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Order = require('../models/Order');
const Table = require('../models/Table');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');

const createSchema = Joi.object({
  name: Joi.string().min(2).required(),
  code: Joi.string().alphanum().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(7).required(),
  address: Joi.string().min(5).required(),
  gstin: Joi.string().allow('', null),
  website: Joi.string().uri().allow('', null),
  serviceChargePercent: Joi.number().min(0).max(30).default(0),
  plan: Joi.string().valid('BASIC', 'STANDARD', 'PREMIUM').default('BASIC'),
  tableLimit: Joi.number().integer().min(1).max(500).default(10),
  ownerName: Joi.string().required(),
  ownerEmail: Joi.string().email().required(),
  ownerPassword: Joi.string().min(8).required()
});

/** Super Admin creates a restaurant + its owner login in one step. */
exports.createRestaurant = async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw ApiError.badRequest('Validation failed', error.details.map(d => d.message));

  if (await Restaurant.findOne({ code: value.code })) throw ApiError.conflict('Restaurant code already exists');

  const restaurant = await Restaurant.create({
    name: value.name, code: value.code, email: value.email,
    phone: value.phone, address: value.address,
    gstin: value.gstin || undefined, website: value.website || undefined,
    serviceChargePercent: value.serviceChargePercent || 0,
    plan: value.plan, tableLimit: value.tableLimit
  });

  const owner = new User({
    restaurantId: restaurant._id, name: value.ownerName,
    email: value.ownerEmail, role: 'OWNER'
  });
  await owner.setPassword(value.ownerPassword);
  await owner.save();

  audit({ req, action: 'RESTAURANT_CREATED', entity: 'Restaurant', entityId: restaurant._id });
  res.status(201).json({ success: true, data: { restaurant, owner: { id: owner._id, email: owner.email } } });
};

exports.listRestaurants = async (_req, res) => {
  const restaurants = await Restaurant.find({ isDeleted: false }).sort('-createdAt').lean();
  res.json({ success: true, data: restaurants });
};

exports.setStatus = async (req, res) => {
  const { status } = req.body; // ACTIVE | SUSPENDED
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) throw ApiError.badRequest('Invalid status');
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found');
  audit({ req, action: `RESTAURANT_${status}`, entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r });
};

/** Only Super Admin can change table quota. */
exports.setTableLimit = async (req, res) => {
  const limit = parseInt(req.body.tableLimit, 10);
  if (!limit || limit < 1) throw ApiError.badRequest('Invalid table limit');
  const activeTables = await Table.countDocuments({ restaurantId: req.params.id, isDeleted: false });
  if (limit < activeTables) throw ApiError.conflict(`Restaurant already has ${activeTables} tables`);
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { tableLimit: limit }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found');
  audit({ req, action: 'TABLE_LIMIT_CHANGED', entity: 'Restaurant', entityId: r._id, meta: { limit } });
  res.json({ success: true, data: r });
};

exports.setPlan = async (req, res) => {
  const { plan } = req.body;
  if (!['BASIC', 'STANDARD', 'PREMIUM'].includes(plan)) throw ApiError.badRequest('Invalid plan');
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { plan }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found');
  audit({ req, action: 'PLAN_CHANGED', entity: 'Restaurant', entityId: r._id, meta: { plan } });
  res.json({ success: true, data: r });
};

exports.softDelete = async (req, res) => {
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { isDeleted: true, status: 'SUSPENDED' }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found');
  audit({ req, action: 'RESTAURANT_DELETED', entity: 'Restaurant', entityId: r._id });
  res.json({ success: true });
};

/** Platform analytics for the Super Admin dashboard. */
exports.platformStats = async (_req, res) => {
  const [total, active, revenueAgg, tables] = await Promise.all([
    Restaurant.countDocuments({ isDeleted: false }),
    Restaurant.countDocuments({ isDeleted: false, status: 'ACTIVE' }),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID', isDeleted: false } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
    ]),
    Table.countDocuments({ isDeleted: false })
  ]);
  res.json({
    success: true,
    data: {
      totalRestaurants: total,
      activeRestaurants: active,
      inactiveRestaurants: total - active,
      totalTablesProvisioned: tables,
      grossOrderRevenue: revenueAgg[0]?.revenue || 0,
      totalPaidOrders: revenueAgg[0]?.orders || 0
    }
  });
};
