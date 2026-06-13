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
  taxPercent: Joi.number().min(0).max(30).default(5),
  plan: Joi.string().valid('BASIC', 'STANDARD', 'PREMIUM').default('BASIC'),
  tableLimit: Joi.number().integer().min(1).max(500).default(10),
  ownerName: Joi.string().required(),
  ownerEmail: Joi.string().email().required(),
  ownerPassword: Joi.string().min(8).required()
});

const updateSchema = Joi.object({
  name: Joi.string().min(2),
  email: Joi.string().email(),
  phone: Joi.string().min(7),
  address: Joi.string().min(5),
  gstin: Joi.string().allow('', null),
  website: Joi.string().uri().allow('', null),
  serviceChargePercent: Joi.number().min(0).max(30),
  taxPercent: Joi.number().min(0).max(30),
  plan: Joi.string().valid('BASIC', 'STANDARD', 'PREMIUM'),
  tableLimit: Joi.number().integer().min(1).max(500),
  status: Joi.string().valid('ACTIVE', 'SUSPENDED')
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
    taxPercent: value.taxPercent || 5,
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

exports.getRestaurant = async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false }).lean();
  if (!restaurant) throw ApiError.notFound('Restaurant not found');
  const users = await User.find({ restaurantId: req.params.id, isDeleted: false })
    .select('-passwordHash').lean();
  res.json({ success: true, data: { restaurant, users } });
};

exports.updateRestaurant = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) throw ApiError.badRequest('Validation failed', error.details.map(d => d.message));

  const activeTables = await Table.countDocuments({ restaurantId: req.params.id, isDeleted: false });
  if (value.tableLimit && value.tableLimit < activeTables) {
    throw ApiError.conflict(`Restaurant already has ${activeTables} active tables`);
  }

  const r = await Restaurant.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { $set: value },
    { new: true }
  );
  if (!r) throw ApiError.notFound('Restaurant not found');
  audit({ req, action: 'RESTAURANT_UPDATED', entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r });
};

exports.listRestaurantUsers = async (req, res) => {
  const users = await User.find({ restaurantId: req.params.id, isDeleted: false })
    .select('-passwordHash').lean();
  res.json({ success: true, data: users });
};

exports.createRestaurantUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  const allowed = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];
  if (!allowed.includes(role)) throw ApiError.badRequest('Invalid role');
  if (!name || !email || !password || password.length < 8)
    throw ApiError.badRequest('name, email and 8+ char password required');

  const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false });
  if (!restaurant) throw ApiError.notFound('Restaurant not found');

  const user = new User({ restaurantId: req.params.id, name, email, role });
  await user.setPassword(password);
  await user.save().catch(e => {
    if (e.code === 11000) throw ApiError.conflict('Email already in use');
    throw e;
  });

  audit({ req, action: 'USER_CREATED', entity: 'User', entityId: user._id, meta: { role } });
  res.status(201).json({ success: true, data: { id: user._id, name, email, role, isActive: user.isActive } });
};

exports.updateRestaurantUser = async (req, res) => {
  const { name, email, password, role, isActive } = req.body;
  const allowed = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];

  const user = await User.findOne({ _id: req.params.userId, restaurantId: req.params.id, isDeleted: false });
  if (!user) throw ApiError.notFound('User not found');
  if (role && !allowed.includes(role)) throw ApiError.badRequest('Invalid role');

  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (password) await user.setPassword(password);

  await user.save().catch(e => {
    if (e.code === 11000) throw ApiError.conflict('Email already in use');
    throw e;
  });

  audit({ req, action: 'USER_UPDATED', entity: 'User', entityId: user._id });
  res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
};

exports.setStatus = async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) throw ApiError.badRequest('Invalid status');
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found');
  audit({ req, action: `RESTAURANT_${status}`, entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r });
};

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
