const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const InventoryItem = require('../models/InventoryItem');
const Outlet = require('../models/Outlet');
const { outletHasKitchenStaff } = require('../utils/kitchenStaff');

const oid = (v) => new mongoose.Types.ObjectId(v);

/**
 * Flexible date range from query params used by the advanced analytics overview.
 * Supports: today, yesterday, last7, last30, this_month, last_month, custom (from/to).
 * Falls back to today when unspecified or invalid.
 */
function resolveRange(q = {}) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };

  switch (q.range) {
    case 'yesterday': {
      const y = new Date(now); y.setDate(now.getDate() - 1);
      return { start: startOfDay(y), end: endOfDay(y) };
    }
    case 'last7': {
      const s = new Date(now); s.setDate(now.getDate() - 6);
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case 'last30': {
      const s = new Date(now); s.setDate(now.getDate() - 29);
      return { start: startOfDay(s), end: endOfDay(now) };
    }
    case 'this_month':
      return { start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), end: endOfDay(now) };
    case 'last_month': {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(s), end: endOfDay(e) };
    }
    case 'custom': {
      const s = q.from ? new Date(q.from) : now;
      const e = q.to ? new Date(q.to) : now;
      if (isNaN(s) || isNaN(e)) return { start: startOfDay(now), end: endOfDay(now) };
      return { start: startOfDay(s), end: endOfDay(e) };
    }
    case 'today':
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

function range(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'day') start.setHours(0, 0, 0, 0);
  else if (period === 'week') start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 1);
  else if (period === 'year') start.setFullYear(now.getFullYear() - 1);
  else start.setHours(0, 0, 0, 0);
  return { start, end: now };
}

function buildMatch(req, extra = {}) {
  const match = { restaurantId: oid(req.user.restaurantId), isDeleted: false, ...extra };
  // Outlet-scoped roles always see only their own outlet's data
  if (['WAITER', 'KITCHEN'].includes(req.user.role) && req.user.outletId) {
    match.outletId = oid(req.user.outletId);
  } else if (req.user.role === 'MANAGER' && req.user.outletId) {
    match.outletId = oid(req.user.outletId);
  } else {
    // OWNER: optionally filter by ?outletId= query param
    const outletId = req.query.outletId;
    if (outletId) match.outletId = oid(outletId);
  }
  return match;
}

/** Sales + order analytics: GET /api/analytics/sales?period=day|week|month|year&outletId= */
exports.sales = async (req, res) => {
  const { start, end } = range(req.query.period);
  const match = buildMatch(req, { paymentStatus: 'PAID', createdAt: { $gte: start, $lte: end } });

  const [summary, trend] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgOrderValue: { $avg: '$total' }, tax: { $sum: '$taxAmount' } } }
    ]),
    Order.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ])
  ]);

  res.json({ success: true, data: { summary: summary[0] || { revenue: 0, orders: 0, avgOrderValue: 0, tax: 0 }, trend } });
};

/** Item analytics: best/worst sellers, top 10. */
exports.items = async (req, res) => {
  const { start, end } = range(req.query.period || 'month');
  const match = buildMatch(req, { createdAt: { $gte: start, $lte: end }, status: { $ne: 'CANCELLED' } });
  const pipeline = [
    { $match: match },
    { $unwind: '$items' },
    { $match: { 'items.status': { $ne: 'CANCELLED' } } },
    { $group: { _id: '$items.menuItemId', name: { $first: '$items.name' }, qty: { $sum: '$items.qty' }, revenue: { $sum: '$items.lineTotal' } } },
    { $sort: { qty: -1 } }
  ];
  const all = await Order.aggregate(pipeline);
  res.json({
    success: true,
    data: {
      top10: all.slice(0, 10),
      worst10: all.slice(-10).reverse(),
      mostSold: all[0] || null,
      leastSold: all[all.length - 1] || null
    }
  });
};

/** Peak hours / days. */
exports.time = async (req, res) => {
  const { start, end } = range(req.query.period || 'month');
  const match = buildMatch(req, { createdAt: { $gte: start, $lte: end } });
  const [byHour, byDay] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: { $dayOfWeek: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } }, { $sort: { _id: 1 } }])
  ]);
  res.json({ success: true, data: { byHour, byDayOfWeek: byDay } });
};

/** Staff performance: cash collected / orders handled per user. */
exports.staff = async (req, res) => {
  const { start, end } = range(req.query.period || 'month');
  const match = buildMatch(req, { createdAt: { $gte: start, $lte: end } });

  const rows = await Payment.aggregate([
    { $match: match },
    { $group: { _id: '$collectedBy', collected: { $sum: '$amount' }, payments: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $project: { name: '$user.name', role: '$user.role', collected: 1, payments: 1 } },
    { $sort: { collected: -1 } }
  ]);
  res.json({ success: true, data: rows });
};

/** Inventory analytics: low stock / out of stock. */
exports.inventory = async (req, res) => {
  const filter = { restaurantId: req.user.restaurantId, isDeleted: false };
  if (['WAITER', 'KITCHEN', 'MANAGER'].includes(req.user.role) && req.user.outletId) {
    filter.outletId = req.user.outletId;
  } else if (req.query.outletId) {
    filter.outletId = req.query.outletId;
  }
  const items = await InventoryItem.find(filter).lean();
  res.json({
    success: true,
    data: {
      lowStock: items.filter((i) => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold),
      outOfStock: items.filter((i) => i.currentStock <= 0),
      all: items
    }
  });
};

/**
 * Consolidated owner analytics: revenue + orders per outlet.
 * GET /api/tenant/analytics/consolidated?period=day|week|month|year
 */
exports.consolidated = async (req, res) => {
  const { start, end } = range(req.query.period || 'month');

  const outlets = await Outlet.find({ restaurantId: req.user.restaurantId, isDeleted: false }).lean();

  const [totalAgg, perOutletAgg] = await Promise.all([
    Order.aggregate([
      { $match: { restaurantId: oid(req.user.restaurantId), isDeleted: false, paymentStatus: 'PAID', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgOrderValue: { $avg: '$total' } } }
    ]),
    Order.aggregate([
      { $match: { restaurantId: oid(req.user.restaurantId), isDeleted: false, paymentStatus: 'PAID', createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$outletId', revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgOrderValue: { $avg: '$total' } } }
    ])
  ]);

  const outletMap = new Map(outlets.map(o => [o._id.toString(), o]));
  const outletStats = perOutletAgg.map(row => ({
    outlet: outletMap.get(row._id?.toString()) || { _id: row._id, name: 'Unknown' },
    revenue: row.revenue,
    orders: row.orders,
    avgOrderValue: row.avgOrderValue
  }));

  res.json({
    success: true,
    data: {
      period: req.query.period || 'month',
      total: totalAgg[0] || { revenue: 0, orders: 0, avgOrderValue: 0 },
      outlets: outletStats
    }
  });
};

/**
 * Consolidated advanced analytics for the Owner Dashboard.
 * GET /api/tenant/analytics/overview?range=today|yesterday|last7|last30|this_month|last_month|custom&from=&to=&outletId=
 * Returns every metric the dashboard renders in one round-trip so charts share a date range.
 */
exports.overview = async (req, res) => {
  const { start, end } = resolveRange(req.query);
  const inRange = { createdAt: { $gte: start, $lte: end } };

  // Base scope (restaurant + optional outlet) shared by all aggregations.
  const scope = buildMatch(req, inRange);
  const paidScope = { ...scope, paymentStatus: 'PAID' };
  const nonCancelled = { ...scope, status: { $ne: 'CANCELLED' } };

  // Group revenue trend by day or by hour depending on range span.
  const spanDays = Math.ceil((end - start) / 86400000);
  const trendFmt = spanDays <= 1 ? '%H:00' : '%Y-%m-%d';

  const [
    summary, revenueTrend, statusBreakdown, ordersByDay,
    topItems, categoryPerf, byHour, byTable, paymentMix, waiterPerf, kitchenPerf
  ] = await Promise.all([
    // Revenue + AOV + counts (paid orders for money, all orders for volume)
    Order.aggregate([
      { $match: scope },
      { $group: {
        _id: null,
        orders: { $sum: 1 },
        completed: { $sum: { $cond: [{ $in: ['$status', ['SERVED', 'PAYMENT_COMPLETED', 'CLOSED']] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, '$total', 0] } },
        paidOrders: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'PAID'] }, 1, 0] } }
      } }
    ]),
    // Revenue trend over the range (paid)
    Order.aggregate([
      { $match: paidScope },
      { $group: { _id: { $dateToString: { format: trendFmt, date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    // Status breakdown (completed vs cancelled vs in-progress)
    Order.aggregate([
      { $match: scope },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    // Orders per day (volume trend, all statuses)
    Order.aggregate([
      { $match: scope },
      { $group: {
        _id: { $dateToString: { format: trendFmt, date: '$createdAt' } },
        total: { $sum: 1 },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 1, 0] } }
      } },
      { $sort: { _id: 1 } }
    ]),
    // Top + low selling products
    Order.aggregate([
      { $match: nonCancelled },
      { $unwind: '$items' },
      { $match: { 'items.status': { $ne: 'CANCELLED' } } },
      { $group: { _id: '$items.menuItemId', name: { $first: '$items.name' }, qty: { $sum: '$items.qty' }, revenue: { $sum: '$items.lineTotal' } } },
      { $sort: { qty: -1 } }
    ]),
    // Category performance (join menu item -> category)
    Order.aggregate([
      { $match: nonCancelled },
      { $unwind: '$items' },
      { $match: { 'items.status': { $ne: 'CANCELLED' } } },
      { $lookup: { from: 'menuitems', localField: 'items.menuItemId', foreignField: '_id', as: 'mi' } },
      { $unwind: { path: '$mi', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$mi.categoryId', qty: { $sum: '$items.qty' }, revenue: { $sum: '$items.lineTotal' } } },
      { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'cat' } },
      { $unwind: { path: '$cat', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$cat.name', 'Uncategorized'] }, qty: 1, revenue: 1 } },
      { $sort: { revenue: -1 } }
    ]),
    // Peak business hours
    Order.aggregate([
      { $match: scope },
      { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $sort: { _id: 1 } }
    ]),
    // Table performance
    Order.aggregate([
      { $match: paidScope },
      { $group: { _id: '$tableId', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $lookup: { from: 'tables', localField: '_id', foreignField: '_id', as: 't' } },
      { $unwind: { path: '$t', preserveNullAndEmptyArrays: true } },
      { $project: { name: { $ifNull: ['$t.name', { $concat: ['Table ', { $toString: '$t.number' }] }] }, number: '$t.number', orders: 1, revenue: 1 } },
      { $sort: { revenue: -1 } }
    ]),
    // Payment method mix
    Payment.aggregate([
      { $match: buildMatch(req, inRange) },
      { $group: { _id: '$method', amount: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    // Waiter performance: orders served + payments collected
    Order.aggregate([
      { $match: { ...scope, status: { $in: ['SERVED', 'PAYMENT_COMPLETED', 'CLOSED'] } } },
      { $group: { _id: '$updatedByName', served: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $sort: { served: -1 } }
    ]),
    // Kitchen performance: avg prep time (created -> served) by the preparing staff
    Order.aggregate([
      { $match: { ...scope, servedAt: { $ne: null } } },
      { $group: {
        _id: null,
        avgPrepMs: { $avg: { $subtract: ['$servedAt', '$createdAt'] } },
        count: { $sum: 1 }
      } }
    ])
  ]);

  const s = summary[0] || { orders: 0, completed: 0, cancelled: 0, revenue: 0, paidOrders: 0 };
  const avgOrderValue = s.paidOrders ? s.revenue / s.paidOrders : 0;
  const cancellationRate = s.orders ? (s.cancelled / s.orders) * 100 : 0;

  // Kitchen perf only meaningful when the (selected) outlet has kitchen staff.
  let kitchen = null;
  const outletId = req.query.outletId || req.user.outletId;
  const hasKitchen = outletId ? await outletHasKitchenStaff(outletId.toString()) : true;
  if (hasKitchen && kitchenPerf[0]) {
    kitchen = { avgPrepMinutes: Math.round((kitchenPerf[0].avgPrepMs / 60000) * 10) / 10, ordersPrepared: kitchenPerf[0].count };
  }

  res.json({
    success: true,
    data: {
      range: { start, end, key: req.query.range || 'today' },
      summary: {
        revenue: s.revenue,
        orders: s.orders,
        completed: s.completed,
        cancelled: s.cancelled,
        paidOrders: s.paidOrders,
        avgOrderValue,
        cancellationRate
      },
      revenueTrend,
      ordersByDay,
      statusBreakdown,
      topProducts: topItems.slice(0, 8),
      lowProducts: topItems.slice(-5).reverse().filter((p, i, a) => a.length <= 5 || i < 5),
      categoryPerformance: categoryPerf.slice(0, 8),
      peakHours: byHour,
      tablePerformance: byTable.slice(0, 8),
      paymentMix,
      waiterPerformance: waiterPerf.slice(0, 10),
      kitchen,
      hasKitchen
    }
  });
};
