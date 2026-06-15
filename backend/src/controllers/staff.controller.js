const User = require('../models/User');
const Outlet = require('../models/Outlet');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');

const MANAGEABLE_BY_MANAGER = ['WAITER', 'KITCHEN'];
const MANAGEABLE_BY_OWNER   = ['MANAGER', 'WAITER', 'KITCHEN'];

function allowedRoles(req) {
  return req.user.role === 'OWNER' ? MANAGEABLE_BY_OWNER : MANAGEABLE_BY_MANAGER;
}

// Resolve which outlet to assign when no outletId provided:
// - MANAGER: their own outlet (from JWT)
// - OWNER: find the Main Branch (first/oldest outlet)
async function resolveOutletId(req, providedOutletId) {
  if (providedOutletId) {
    const outlet = await Outlet.findOne({ _id: providedOutletId, restaurantId: req.user.restaurantId, isDeleted: false });
    if (!outlet) throw ApiError.notFound('Outlet not found');
    return providedOutletId;
  }
  // MANAGER has their own outletId in JWT
  if (req.user.role === 'MANAGER' && req.user.outletId) {
    return req.user.outletId;
  }
  // OWNER: auto-assign to first active outlet (Main Branch)
  const outlet = await Outlet.findOne({ restaurantId: req.user.restaurantId, isDeleted: false, status: 'ACTIVE' }).sort({ createdAt: 1 });
  if (!outlet) throw ApiError.badRequest('No active outlet found. Create an outlet first.');
  return outlet._id;
}

exports.list = async (req, res) => {
  const roles = req.user.role === 'OWNER' ? MANAGEABLE_BY_OWNER : MANAGEABLE_BY_MANAGER;
  const filter = { restaurantId: req.user.restaurantId, role: { $in: roles }, isDeleted: false };

  // MANAGER sees only their outlet's staff; OWNER sees all (or filtered by ?outletId)
  if (req.user.role === 'MANAGER' && req.user.outletId) {
    filter.outletId = req.user.outletId;
  } else if (req.query.outletId) {
    filter.outletId = req.query.outletId;
  }

  const staff = await User.find(filter).select('-passwordHash').lean();
  res.json({ success: true, data: staff });
};

exports.create = async (req, res) => {
  const { name, email, password, role } = req.body;
  const allowed = allowedRoles(req);
  if (!allowed.includes(role)) throw ApiError.badRequest(`Role must be one of: ${allowed.join(', ')}`);
  if (!name || !email || !password || password.length < 8) throw ApiError.badRequest('name, email and 8+ char password required');

  // Auto-resolve outlet for WAITER/KITCHEN — no manual outletId needed from Owner/Manager
  let assignedOutletId = null;
  if (['WAITER', 'KITCHEN'].includes(role)) {
    assignedOutletId = await resolveOutletId(req, req.body.outletId);
  } else if (role === 'MANAGER') {
    // MANAGER can be outlet-scoped or restaurant-wide (null)
    assignedOutletId = req.body.outletId || null;
  }

  const user = new User({ restaurantId: req.user.restaurantId, outletId: assignedOutletId, name, email, role });
  await user.setPassword(password);
  await user.save().catch((e) => {
    if (e.code === 11000) throw ApiError.conflict('Email already in use');
    throw e;
  });
  audit({ req, action: 'STAFF_CREATED', entity: 'User', entityId: user._id, meta: { role } });
  res.status(201).json({ success: true, data: { id: user._id, name, email, role, outletId: user.outletId, isActive: user.isActive } });
};

exports.update = async (req, res) => {
  const { name, email, password, role, outletId } = req.body;
  const user = await User.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!user) throw ApiError.notFound('Staff member not found');
  if (user.role === 'OWNER') throw ApiError.forbidden('Cannot update the owner');
  const allowed = allowedRoles(req);
  if (role && !allowed.includes(role)) throw ApiError.badRequest(`Role must be one of: ${allowed.join(', ')}`);

  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (password) await user.setPassword(password);

  if (outletId !== undefined) {
    if (outletId) {
      const outlet = await Outlet.findOne({ _id: outletId, restaurantId: req.user.restaurantId, isDeleted: false });
      if (!outlet) throw ApiError.notFound('Outlet not found');
      user.outletId = outletId;
    } else {
      user.outletId = null;
    }
  }

  await user.save().catch((e) => {
    if (e.code === 11000) throw ApiError.conflict('Email already in use');
    throw e;
  });

  audit({ req, action: 'STAFF_UPDATED', entity: 'User', entityId: user._id, meta: { role: user.role } });
  res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role, outletId: user.outletId, isActive: user.isActive } });
};

exports.toggleActive = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!user) throw ApiError.notFound('Staff member not found');
  if (user.role === 'OWNER') throw ApiError.forbidden('Cannot deactivate the owner');
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, data: { id: user._id, isActive: user.isActive } });
};
