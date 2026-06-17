const Joi = require('joi');
const Restaurant = require('../models/Restaurant');
const Outlet = require('../models/Outlet');
const User = require('../models/User');
const Order = require('../models/Order');
const Table = require('../models/Table');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');
const { uploadImage, deleteImage } = require('../config/cloudinary');
const { invalidateTenantCache } = require('../middleware/tenant');

const createSchema = Joi.object({
  name: Joi.string().min(2).required(),
  code: Joi.string().alphanum().min(2).required(),
  email: Joi.string().email().required(),
  phone: Joi.string().min(7).required(),
  address: Joi.string().min(5).required(),
  gstin: Joi.string().allow('', null),
  website: Joi.string().uri().allow('', null),
  googleReviewLink: Joi.string().uri().allow('', null),
  serviceChargePercent: Joi.number().min(0).max(30).default(0),
  taxPercent: Joi.number().min(0).max(30).default(0),
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
  googleReviewLink: Joi.string().uri().allow('', null),
  serviceChargePercent: Joi.number().min(0).max(30),
  taxPercent: Joi.number().min(0).max(30),
  plan: Joi.string().valid('BASIC', 'STANDARD', 'PREMIUM'),
  tableLimit: Joi.number().integer().min(1).max(500),
  status: Joi.string().valid('ACTIVE', 'SUSPENDED')
});

/** Super Admin creates a restaurant + its owner login in one step. */
exports.createRestaurant = async (req, res) => {
  const { error, value } = createSchema.validate(req.body);
  if (error) throw ApiError.badRequest('Please fill all required fields correctly.', error.details.map(d => d.message));

  if (await Restaurant.findOne({ code: value.code })) throw ApiError.conflict(`Restaurant code "${value.code}" is already taken. Please choose a different code.`);
  if (await Restaurant.findOne({ phone: value.phone, isDeleted: false })) throw ApiError.conflict(`Phone number ${value.phone} is already registered with another restaurant.`);
  if (await User.findOne({ email: value.ownerEmail })) throw ApiError.conflict(`Email "${value.ownerEmail}" is already registered. Please use a different email for the owner account.`);

  const restaurant = await Restaurant.create({
    name: value.name, code: value.code, email: value.email,
    phone: value.phone, address: value.address,
    gstin: value.gstin || undefined, website: value.website || undefined,
    googleReviewLink: value.googleReviewLink || undefined,
    serviceChargePercent: value.serviceChargePercent || 0,
    taxPercent: value.taxPercent ?? 0,
    plan: value.plan, tableLimit: value.tableLimit
  });

  // Auto-create a default "Main Branch" outlet so tables can be created immediately
  await Outlet.create({
    restaurantId: restaurant._id,
    name: 'Main Branch',
    address: value.address,
    phone: value.phone,
    email: value.email,
    status: 'ACTIVE',
    tableLimit: 0
  });

  const owner = new User({
    restaurantId: restaurant._id, name: value.ownerName,
    email: value.ownerEmail, role: 'OWNER'
  });
  await owner.setPassword(value.ownerPassword);
  await owner.save().catch(async (e) => {
    await Restaurant.findByIdAndDelete(restaurant._id);
    if (e.code === 11000) throw ApiError.conflict(`Email "${value.ownerEmail}" is already registered. Please use a different email for the owner account.`);
    throw e;
  });

  audit({ req, action: 'RESTAURANT_CREATED', entity: 'Restaurant', entityId: restaurant._id });
  res.status(201).json({ success: true, data: { restaurant, owner: { id: owner._id, email: owner.email } } });
};

exports.listRestaurants = async (_req, res) => {
  const restaurants = await Restaurant.find({ isDeleted: false }).sort('-createdAt').lean();
  res.json({ success: true, data: restaurants });
};

exports.getRestaurant = async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false }).lean();
  if (!restaurant) throw ApiError.notFound('Restaurant not found. It may have been deleted.');
  const [users, outlets] = await Promise.all([
    User.find({ restaurantId: req.params.id, isDeleted: false }).select('-passwordHash').lean(),
    Outlet.find({ restaurantId: req.params.id, isDeleted: false }).lean()
  ]);
  res.json({ success: true, data: { restaurant, users, outlets } });
};

exports.updateRestaurant = async (req, res) => {
  const { error, value } = updateSchema.validate(req.body);
  if (error) throw ApiError.badRequest('Please check the entered values.', error.details.map(d => d.message));

  const activeTables = await Table.countDocuments({ restaurantId: req.params.id, isDeleted: false });
  if (value.tableLimit && value.tableLimit < activeTables) {
    throw ApiError.conflict(`Cannot reduce table limit to ${value.tableLimit}. This restaurant already has ${activeTables} active tables. Delete some tables first.`);
  }

  const r = await Restaurant.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    { $set: value },
    { new: true }
  );
  if (!r) throw ApiError.notFound('Restaurant not found. It may have been deleted.');
  await invalidateTenantCache(r._id);
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
  if (!allowed.includes(role)) throw ApiError.badRequest(`Invalid role "${role}". Allowed roles: ${allowed.join(', ')}.`);
  if (!name || !email || !password || password.length < 8)
    throw ApiError.badRequest('Name, email and a password of at least 8 characters are required.');

  const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false });
  if (!restaurant) throw ApiError.notFound('Restaurant not found. It may have been deleted.');

  const user = new User({ restaurantId: req.params.id, name, email, role });
  await user.setPassword(password);
  await user.save().catch(e => {
    if (e.code === 11000) throw ApiError.conflict(`Email "${email}" is already in use. Please use a different email.`);
    throw e;
  });

  audit({ req, action: 'USER_CREATED', entity: 'User', entityId: user._id, meta: { role } });
  res.status(201).json({ success: true, data: { id: user._id, name, email, role, isActive: user.isActive } });
};

exports.updateRestaurantUser = async (req, res) => {
  const { name, email, password, role, isActive } = req.body;
  const allowed = ['OWNER', 'MANAGER', 'WAITER', 'KITCHEN'];

  const user = await User.findOne({ _id: req.params.userId, restaurantId: req.params.id, isDeleted: false });
  if (!user) throw ApiError.notFound('User not found. They may have been removed.');
  if (role && !allowed.includes(role)) throw ApiError.badRequest(`Invalid role "${role}". Allowed roles: ${allowed.join(', ')}.`);

  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (password) await user.setPassword(password);

  await user.save().catch(e => {
    if (e.code === 11000) throw ApiError.conflict(`Email "${email}" is already in use. Please use a different email.`);
    throw e;
  });

  audit({ req, action: 'USER_UPDATED', entity: 'User', entityId: user._id });
  res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
};

exports.setStatus = async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) throw ApiError.badRequest(`Invalid status "${status}". Use ACTIVE or SUSPENDED.`);
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found.');
  await invalidateTenantCache(r._id);
  audit({ req, action: `RESTAURANT_${status}`, entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r });
};

exports.setTableLimit = async (req, res) => {
  const limit = parseInt(req.body.tableLimit, 10);
  if (!limit || limit < 1) throw ApiError.badRequest('Please enter a valid table limit (minimum 1).');
  const activeTables = await Table.countDocuments({ restaurantId: req.params.id, isDeleted: false });
  if (limit < activeTables) throw ApiError.conflict(`Cannot set limit to ${limit}. This restaurant already has ${activeTables} active tables. Delete some tables first.`);
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { tableLimit: limit }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found.');
  await invalidateTenantCache(r._id);
  audit({ req, action: 'TABLE_LIMIT_CHANGED', entity: 'Restaurant', entityId: r._id, meta: { limit } });
  res.json({ success: true, data: r });
};

exports.setPlan = async (req, res) => {
  const { plan } = req.body;
  if (!['BASIC', 'STANDARD', 'PREMIUM'].includes(plan)) throw ApiError.badRequest(`Invalid plan "${plan}". Choose from: BASIC, STANDARD, PREMIUM.`);
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { plan }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found.');
  await invalidateTenantCache(r._id);
  audit({ req, action: 'PLAN_CHANGED', entity: 'Restaurant', entityId: r._id, meta: { plan } });
  res.json({ success: true, data: r });
};

exports.uploadLogo = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file was uploaded. Please select an image and try again.');

  const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false });
  if (!restaurant) throw ApiError.notFound('Restaurant not found.');

  if (restaurant.logoPublicId) {
    await deleteImage(restaurant.logoPublicId).catch(() => {});
  }

  let result;
  try {
    result = await uploadImage(req.file.buffer, `ros/${restaurant._id}/logo`);
  } catch (err) {
    console.error('[uploadLogo] Cloudinary error:', err?.message || err);
    throw new ApiError(500, 'Image upload failed. Please check your internet connection and try again.');
  }

  restaurant.logoUrl = result.secure_url;
  restaurant.logoPublicId = result.public_id;
  await restaurant.save();

  await invalidateTenantCache(restaurant._id);
  audit({ req, action: 'RESTAURANT_LOGO_UPDATED', entity: 'Restaurant', entityId: restaurant._id });
  res.json({ success: true, data: { logoUrl: restaurant.logoUrl } });
};

exports.softDelete = async (req, res) => {
  const r = await Restaurant.findByIdAndUpdate(req.params.id, { isDeleted: true, status: 'SUSPENDED' }, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found.');
  await Outlet.updateMany({ restaurantId: req.params.id }, { isDeleted: true, status: 'INACTIVE' });
  await invalidateTenantCache(r._id);
  audit({ req, action: 'RESTAURANT_DELETED', entity: 'Restaurant', entityId: r._id });
  res.json({ success: true });
};

exports.platformStats = async (_req, res) => {
  const activeRestaurantIds = await Restaurant.distinct('_id', { isDeleted: false });

  const [total, active, revenueAgg, tables, totalOutlets, activeOutlets] = await Promise.all([
    Restaurant.countDocuments({ isDeleted: false }),
    Restaurant.countDocuments({ isDeleted: false, status: 'ACTIVE' }),
    Order.aggregate([
      { $match: { paymentStatus: 'PAID', isDeleted: false } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 } } }
    ]),
    Table.countDocuments({ isDeleted: false }),
    Outlet.countDocuments({ isDeleted: false, restaurantId: { $in: activeRestaurantIds } }),
    Outlet.countDocuments({ isDeleted: false, status: 'ACTIVE', restaurantId: { $in: activeRestaurantIds } })
  ]);
  res.json({
    success: true,
    data: {
      totalRestaurants: total,
      activeRestaurants: active,
      inactiveRestaurants: total - active,
      totalOutlets,
      activeOutlets,
      totalTablesProvisioned: tables,
      grossOrderRevenue: revenueAgg[0]?.revenue || 0,
      totalPaidOrders: revenueAgg[0]?.orders || 0
    }
  });
};

// ─── Admin Outlet Management ────────────────────────────────────────────────

exports.listOutlets = async (req, res) => {
  const outlets = await Outlet.find({ restaurantId: req.params.id, isDeleted: false }).sort('createdAt').lean();
  res.json({ success: true, data: outlets });
};

exports.createOutlet = async (req, res) => {
  const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false });
  if (!restaurant) throw ApiError.notFound('Restaurant not found. It may have been deleted.');

  const { name, address, phone, email, googleReviewLink } = req.body;
  if (!name || !address) throw ApiError.badRequest('Outlet name and address are required.');

  const outlet = await Outlet.create({ restaurantId: req.params.id, name, address, phone, email, googleReviewLink: googleReviewLink || undefined });
  audit({ req, action: 'OUTLET_CREATED', entity: 'Outlet', entityId: outlet._id });
  res.status(201).json({ success: true, data: outlet });
};

exports.updateOutlet = async (req, res) => {
  const outlet = await Outlet.findOne({ _id: req.params.oid, restaurantId: req.params.id, isDeleted: false });
  if (!outlet) throw ApiError.notFound('Outlet not found. It may have been deleted.');

  const { name, address, phone, email, googleReviewLink } = req.body;
  if (name) outlet.name = name;
  if (address) outlet.address = address;
  if (phone !== undefined) outlet.phone = phone;
  if (email !== undefined) outlet.email = email;
  if (googleReviewLink !== undefined) outlet.googleReviewLink = googleReviewLink;
  await outlet.save();

  audit({ req, action: 'OUTLET_UPDATED', entity: 'Outlet', entityId: outlet._id });
  res.json({ success: true, data: outlet });
};

exports.setOutletStatus = async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'INACTIVE'].includes(status)) throw ApiError.badRequest(`Invalid status "${status}". Use ACTIVE or INACTIVE.`);

  const outlet = await Outlet.findOneAndUpdate(
    { _id: req.params.oid, restaurantId: req.params.id, isDeleted: false },
    { status },
    { new: true }
  );
  if (!outlet) throw ApiError.notFound('Outlet not found.');
  audit({ req, action: `OUTLET_${status}`, entity: 'Outlet', entityId: outlet._id });
  res.json({ success: true, data: outlet });
};

exports.deleteOutlet = async (req, res) => {
  const outlet = await Outlet.findOneAndUpdate(
    { _id: req.params.oid, restaurantId: req.params.id, isDeleted: false },
    { isDeleted: true, status: 'INACTIVE' },
    { new: true }
  );
  if (!outlet) throw ApiError.notFound('Outlet not found.');
  audit({ req, action: 'OUTLET_DELETED', entity: 'Outlet', entityId: outlet._id });
  res.json({ success: true });
};
