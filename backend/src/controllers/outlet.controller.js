const Restaurant = require('../models/Restaurant');
const Outlet = require('../models/Outlet');
const Table = require('../models/Table');
const Order = require('../models/Order');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');

// Helper: total tables used across restaurant + per-outlet allocations
async function tableAvailability(restaurantId) {
  const restaurant = await Restaurant.findById(restaurantId).lean();
  const restaurantLimit = restaurant.tableLimit;

  const outlets = await Outlet.find({ restaurantId, isDeleted: false }).lean();

  const tableCounts = await Table.aggregate([
    { $match: { restaurantId: restaurant._id, isDeleted: false } },
    { $group: { _id: '$outletId', count: { $sum: 1 } } }
  ]);
  const tableCountMap = {};
  tableCounts.forEach(r => { tableCountMap[String(r._id)] = r.count; });

  const totalAllocated = outlets.reduce((s, o) => s + (o.tableLimit || 0), 0);
  const totalUsed = Object.values(tableCountMap).reduce((s, c) => s + c, 0);
  const remaining = restaurantLimit - totalUsed;

  return {
    restaurantLimit,
    totalAllocated,
    totalUsed,
    remaining,
    outlets: outlets.map(o => ({
      _id: o._id,
      name: o.name,
      tableLimit: o.tableLimit || 0,
      tablesCreated: tableCountMap[String(o._id)] || 0
    }))
  };
}

exports.tableAvailability = async (req, res) => {
  const data = await tableAvailability(req.user.restaurantId);
  res.json({ success: true, data });
};

exports.list = async (req, res) => {
  const filter = { restaurantId: req.user.restaurantId, isDeleted: false };
  if (['WAITER', 'KITCHEN'].includes(req.user.role) && req.user.outletId) {
    filter._id = req.user.outletId;
  }

  let outlets = await Outlet.find(filter).sort({ createdAt: 1 }).lean();

  if (outlets.length === 0 && ['OWNER', 'MANAGER'].includes(req.user.role)) {
    const restaurant = await Restaurant.findById(req.user.restaurantId).lean();
    if (restaurant) {
      const mainBranch = await Outlet.create({
        restaurantId: restaurant._id,
        name: 'Main Branch',
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        status: 'ACTIVE',
        tableLimit: 0
      });
      outlets = [mainBranch.toObject()];
    }
  }

  res.json({ success: true, data: outlets });
};

exports.create = async (req, res) => {
  const { name, address, phone, email, tableLimit, staffAccounts, googleReviewLink } = req.body;
  if (!name || !address) throw ApiError.badRequest('Outlet name and address are required.');

  const limit = parseInt(tableLimit, 10) || 0;

  if (limit > 0) {
    const avail = await tableAvailability(req.user.restaurantId);
    if (limit > avail.remaining) {
      throw ApiError.badRequest(
        `Only ${avail.remaining} table slot(s) are available for your restaurant plan. ` +
        `Please reduce the table limit or contact the platform admin to upgrade your plan.`
      );
    }
  }

  const outlet = await Outlet.create({
    restaurantId: req.user.restaurantId,
    name, address, phone, email, tableLimit: limit,
    googleReviewLink: googleReviewLink || undefined
  });
  audit({ req, restaurantId: req.user.restaurantId, action: 'OUTLET_CREATED', entity: 'Outlet', entityId: outlet._id });

  const createdStaff = [];
  if (Array.isArray(staffAccounts) && staffAccounts.length > 0) {
    for (const s of staffAccounts) {
      if (!s.name || !s.email || !s.password || s.password.length < 8) continue;
      const role = ['WAITER', 'KITCHEN', 'MANAGER'].includes(s.role) ? s.role : 'WAITER';
      const user = new User({ restaurantId: req.user.restaurantId, outletId: outlet._id, name: s.name, email: s.email, role });
      await user.setPassword(s.password);
      await user.save().catch(() => {});
      createdStaff.push({ name: s.name, email: s.email, role });
    }
  }

  res.status(201).json({ success: true, data: { ...outlet.toObject(), createdStaff } });
};

exports.update = async (req, res) => {
  const outlet = await Outlet.findOne({
    _id: req.params.id,
    restaurantId: req.user.restaurantId,
    isDeleted: false
  });
  if (!outlet) throw ApiError.notFound('Outlet not found. It may have been deleted.');

  const { name, address, phone, email, tableLimit, googleReviewLink } = req.body;

  if (tableLimit !== undefined) {
    const newLimit = parseInt(tableLimit, 10) || 0;
    const tablesCreated = await Table.countDocuments({ outletId: outlet._id, isDeleted: false });

    if (newLimit < tablesCreated) {
      throw ApiError.badRequest(
        `Cannot set table limit to ${newLimit} — this outlet already has ${tablesCreated} table(s) created. Please delete some tables first.`
      );
    }

    const avail = await tableAvailability(req.user.restaurantId);
    const currentAlloc = outlet.tableLimit || 0;
    const freeSlots = avail.remaining + currentAlloc;
    if (newLimit > freeSlots) {
      throw ApiError.badRequest(
        `Only ${freeSlots} table slot(s) are available for your restaurant plan. ` +
        `Contact the platform admin to increase the restaurant quota.`
      );
    }
    outlet.tableLimit = newLimit;
  }

  if (name) outlet.name = name;
  if (address) outlet.address = address;
  if (phone !== undefined) outlet.phone = phone;
  if (email !== undefined) outlet.email = email;
  if (googleReviewLink !== undefined) outlet.googleReviewLink = googleReviewLink;
  await outlet.save();

  const { staffAccounts } = req.body;
  const updatedStaff = [];
  if (Array.isArray(staffAccounts) && staffAccounts.length > 0) {
    for (const s of staffAccounts) {
      if (!s.email) continue;
      const role = ['WAITER', 'KITCHEN', 'MANAGER'].includes(s.role) ? s.role : 'WAITER';
      let user = await User.findOne({ email: s.email, restaurantId: req.user.restaurantId, isDeleted: false });
      if (user) {
        if (s.name) user.name = s.name;
        if (s.role) user.role = role;
        user.outletId = outlet._id;
        if (s.password && s.password.length >= 8) await user.setPassword(s.password);
        await user.save();
        updatedStaff.push({ name: user.name, email: user.email, role: user.role, action: 'updated' });
      } else if (s.name && s.password && s.password.length >= 8) {
        const newUser = new User({ restaurantId: req.user.restaurantId, outletId: outlet._id, name: s.name, email: s.email, role });
        await newUser.setPassword(s.password);
        await newUser.save().catch(() => {});
        updatedStaff.push({ name: s.name, email: s.email, role, action: 'created' });
      }
    }
  }

  audit({ req, restaurantId: req.user.restaurantId, action: 'OUTLET_UPDATED', entity: 'Outlet', entityId: outlet._id });
  res.json({ success: true, data: { ...outlet.toObject(), updatedStaff } });
};

exports.toggleStatus = async (req, res) => {
  const outlet = await Outlet.findOne({
    _id: req.params.id,
    restaurantId: req.user.restaurantId,
    isDeleted: false
  });
  if (!outlet) throw ApiError.notFound('Outlet not found. It may have been deleted.');

  outlet.status = outlet.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  await outlet.save();

  audit({ req, restaurantId: req.user.restaurantId, action: 'OUTLET_STATUS_CHANGED', entity: 'Outlet', entityId: outlet._id, meta: { status: outlet.status } });
  res.json({ success: true, data: outlet });
};

exports.remove = async (req, res) => {
  const outlet = await Outlet.findOne({
    _id: req.params.id,
    restaurantId: req.user.restaurantId,
    isDeleted: false
  });
  if (!outlet) throw ApiError.notFound('Outlet not found. It may have been deleted.');

  outlet.isDeleted = true;
  outlet.status = 'INACTIVE';
  await outlet.save();

  audit({ req, restaurantId: req.user.restaurantId, action: 'OUTLET_DELETED', entity: 'Outlet', entityId: outlet._id });
  res.json({ success: true });
};

exports.getStats = async (req, res) => {
  const outletId = req.params.id;
  const outlet = await Outlet.findOne({
    _id: outletId,
    restaurantId: req.user.restaurantId,
    isDeleted: false
  }).lean();
  if (!outlet) throw ApiError.notFound('Outlet not found. It may have been deleted.');

  const [tableCount, orderStats] = await Promise.all([
    Table.countDocuments({ outletId, isDeleted: false }),
    Order.aggregate([
      { $match: { outletId: outlet._id, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$total', 0] }
          },
          activeOrders: {
            $sum: { $cond: [{ $in: ['$status', ['PENDING', 'ACCEPTED', 'PREPARING', 'DONE', 'WAITING_FOR_SERVICE']] }, 1, 0] }
          }
        }
      }
    ])
  ]);

  const stats = orderStats[0] || { totalOrders: 0, totalRevenue: 0, activeOrders: 0 };
  res.json({
    success: true,
    data: {
      outlet,
      tableCount,
      tableLimit: outlet.tableLimit || 0,
      totalOrders: stats.totalOrders,
      totalRevenue: stats.totalRevenue,
      activeOrders: stats.activeOrders
    }
  });
};
