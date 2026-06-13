const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const InventoryItem = require('../models/InventoryItem');

const oid = (v) => new mongoose.Types.ObjectId(v);

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

/** Sales + order analytics: GET /api/analytics/sales?period=day|week|month|year */
exports.sales = async (req, res) => {
  const { start, end } = range(req.query.period);
  const match = { restaurantId: oid(req.user.restaurantId), isDeleted: false, paymentStatus: 'PAID', createdAt: { $gte: start, $lte: end } };

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
  const pipeline = [
    { $match: { restaurantId: oid(req.user.restaurantId), isDeleted: false, createdAt: { $gte: start, $lte: end }, status: { $ne: 'CANCELLED' } } },
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
  const match = { restaurantId: oid(req.user.restaurantId), isDeleted: false, createdAt: { $gte: start, $lte: end } };
  const [byHour, byDay] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: { $hour: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: { $dayOfWeek: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } }, { $sort: { _id: 1 } }])
  ]);
  res.json({ success: true, data: { byHour, byDayOfWeek: byDay } });
};

/** Staff performance: cash collected / orders handled per user. */
exports.staff = async (req, res) => {
  const { start, end } = range(req.query.period || 'month');
  const rows = await Payment.aggregate([
    { $match: { restaurantId: oid(req.user.restaurantId), createdAt: { $gte: start, $lte: end } } },
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
  const items = await InventoryItem.find({ restaurantId: req.user.restaurantId, isDeleted: false }).lean();
  res.json({
    success: true,
    data: {
      lowStock: items.filter((i) => i.currentStock > 0 && i.currentStock <= i.lowStockThreshold),
      outOfStock: items.filter((i) => i.currentStock <= 0),
      all: items
    }
  });
};
