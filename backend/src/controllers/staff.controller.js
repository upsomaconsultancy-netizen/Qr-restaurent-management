const User = require('../models/User');
const Outlet = require('../models/Outlet');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');
const { invalidateKitchenFlag } = require('../utils/kitchenStaff');

const MANAGEABLE_BY_MANAGER = ['WAITER', 'KITCHEN'];
const MANAGEABLE_BY_OWNER   = ['MANAGER', 'WAITER', 'KITCHEN'];

function allowedRoles(req) {
  return req.user.role === 'OWNER' ? MANAGEABLE_BY_OWNER : MANAGEABLE_BY_MANAGER;
}

async function resolveOutletId(req, providedOutletId) {
  if (providedOutletId) {
    const outlet = await Outlet.findOne({ _id: providedOutletId, restaurantId: req.user.restaurantId, isDeleted: false });
    if (!outlet) throw ApiError.notFound('The selected outlet was not found. Please refresh and try again.');
    return providedOutletId;
  }
  if (req.user.role === 'MANAGER' && req.user.outletId) {
    return req.user.outletId;
  }
  const outlet = await Outlet.findOne({ restaurantId: req.user.restaurantId, isDeleted: false, status: 'ACTIVE' }).sort({ createdAt: 1 });
  if (!outlet) throw ApiError.badRequest('No active outlet found. Please create an outlet first before adding staff.');
  return outlet._id;
}

exports.list = async (req, res) => {
  const roles = req.user.role === 'OWNER' ? MANAGEABLE_BY_OWNER : MANAGEABLE_BY_MANAGER;
  const filter = { restaurantId: req.user.restaurantId, role: { $in: roles }, isDeleted: false };

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
  if (!allowed.includes(role)) throw ApiError.badRequest(`Invalid role "${role}". You can assign: ${allowed.join(', ')}.`);
  if (!name || !email || !password || password.length < 8) throw ApiError.badRequest('Name, email and a password of at least 8 characters are required.');

  let assignedOutletId = null;
  if (['WAITER', 'KITCHEN'].includes(role)) {
    assignedOutletId = await resolveOutletId(req, req.body.outletId);
  } else if (role === 'MANAGER') {
    assignedOutletId = req.body.outletId || null;
  }

  const user = new User({ restaurantId: req.user.restaurantId, outletId: assignedOutletId, name, email, role });
  await user.setPassword(password);
  await user.save().catch((e) => {
    if (e.code === 11000) throw ApiError.conflict(`Email "${email}" is already registered. Please use a different email.`);
    throw e;
  });
  if (role === 'KITCHEN' && user.outletId) invalidateKitchenFlag(user.outletId.toString());
  audit({ req, action: 'STAFF_CREATED', entity: 'User', entityId: user._id, meta: { role } });
  res.status(201).json({ success: true, data: { id: user._id, name, email, role, outletId: user.outletId, isActive: user.isActive } });
};

exports.update = async (req, res) => {
  const { name, email, password, role, outletId } = req.body;
  const user = await User.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!user) throw ApiError.notFound('Staff member not found. They may have been removed.');
  if (user.role === 'OWNER') throw ApiError.forbidden('The restaurant owner account cannot be modified from here.');
  const allowed = allowedRoles(req);
  if (role && !allowed.includes(role)) throw ApiError.badRequest(`Invalid role "${role}". You can assign: ${allowed.join(', ')}.`);

  // Snapshot kitchen-relevant state before mutation so we can invalidate the
  // hasKitchen flag for any outlet this change adds or removes a kitchen user from.
  const prevWasKitchen = user.role === 'KITCHEN';
  const prevOutletId = user.outletId ? user.outletId.toString() : null;

  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (password) await user.setPassword(password);

  if (outletId !== undefined) {
    if (outletId) {
      const outlet = await Outlet.findOne({ _id: outletId, restaurantId: req.user.restaurantId, isDeleted: false });
      if (!outlet) throw ApiError.notFound('The selected outlet was not found. Please refresh and try again.');
      user.outletId = outletId;
    } else {
      user.outletId = null;
    }
  }

  await user.save().catch((e) => {
    if (e.code === 11000) throw ApiError.conflict(`Email "${email}" is already registered. Please use a different email.`);
    throw e;
  });

  const nowIsKitchen = user.role === 'KITCHEN';
  const nowOutletId = user.outletId ? user.outletId.toString() : null;
  if (prevWasKitchen && prevOutletId) invalidateKitchenFlag(prevOutletId);
  if (nowIsKitchen && nowOutletId && nowOutletId !== prevOutletId) invalidateKitchenFlag(nowOutletId);

  audit({ req, action: 'STAFF_UPDATED', entity: 'User', entityId: user._id, meta: { role: user.role } });
  res.json({ success: true, data: { id: user._id, name: user.name, email: user.email, role: user.role, outletId: user.outletId, isActive: user.isActive } });
};

exports.toggleActive = async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!user) throw ApiError.notFound('Staff member not found. They may have been removed.');
  if (user.role === 'OWNER') throw ApiError.forbidden('The restaurant owner account cannot be deactivated.');
  user.isActive = !user.isActive;
  await user.save();
  if (user.role === 'KITCHEN' && user.outletId) invalidateKitchenFlag(user.outletId.toString());
  res.json({ success: true, data: { id: user._id, isActive: user.isActive } });
};
