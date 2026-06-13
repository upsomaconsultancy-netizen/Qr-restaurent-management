const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');

const MANAGEABLE = ['WAITER', 'KITCHEN'];

exports.list = async (req, res) => {
  const staff = await User.find({ restaurantId: req.user.restaurantId, role: { $in: MANAGEABLE }, isDeleted: false })
    .select('-passwordHash')
    .lean();
  res.json({ success: true, data: staff });
};

exports.create = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!MANAGEABLE.includes(role)) throw ApiError.badRequest('Role must be WAITER or KITCHEN');
  if (!name || !email || !password || password.length < 8) throw ApiError.badRequest('name, email and 8+ char password required');

  const user = new User({ restaurantId: req.user.restaurantId, name, email, role });
  await user.setPassword(password);
  await user.save().catch((e) => {
    if (e.code === 11000) throw ApiError.conflict('Email already in use');
    throw e;
  });
  audit({ req, action: 'STAFF_CREATED', entity: 'User', entityId: user._id, meta: { role } });
  res.status(201).json({ success: true, data: { id: user._id, name, email, role, isActive: user.isActive } });
};

exports.update = async (req, res) => {
  const { name, email, password, role } = req.body;
  const user = await User.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!user) throw ApiError.notFound('Staff member not found');
  if (user.role === 'OWNER') throw ApiError.forbidden('Cannot update the owner');
  if (role && !MANAGEABLE.includes(role)) throw ApiError.badRequest('Role must be WAITER or KITCHEN');

  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (password) await user.setPassword(password);

  await user.save().catch((e) => {
    if (e.code === 11000) throw ApiError.conflict('Email already in use');
    throw e;
  });

  audit({ req, action: 'STAFF_UPDATED', entity: 'User', entityId: user._id, meta: { role: user.role } });
  res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive } });
};

exports.toggleActive = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!user) throw ApiError.notFound('Staff member not found');
  if (user.role === 'OWNER') throw ApiError.forbidden('Cannot deactivate the owner');
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, data: { id: user._id, isActive: user.isActive } });
};
