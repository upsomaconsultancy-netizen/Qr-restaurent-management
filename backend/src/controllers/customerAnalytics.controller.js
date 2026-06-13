const mongoose = require('mongoose');
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');

function parseDateRange(query) {
  const now = new Date();
  if (query.from && query.to) {
    return { $gte: new Date(query.from), $lte: new Date(query.to) };
  }
  if (query.period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { $gte: start };
  }
  if (query.period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0);
    return { $gte: start };
  }
  if (query.period === 'month') {
    const start = new Date(now); start.setDate(now.getDate() - 30); start.setHours(0, 0, 0, 0);
    return { $gte: start };
  }
  return null;
}

/**
 * GET /analytics/customers/favorites
 * Returns per-customer item frequency analytics.
 * Supports: period, from, to, category, item (search), page, limit
 */
exports.favorites = async (req, res) => {
  const restaurantId = req.user.restaurantId;
  const { category, item, page = 1, limit = 50 } = req.query;
  const dateRange = parseDateRange(req.query);

  const orderMatch = {
    restaurantId: restaurantId instanceof mongoose.Types.ObjectId ? restaurantId : new mongoose.Types.ObjectId(restaurantId),
    isDeleted: false,
    status: { $in: ['SERVED', 'COMPLETED'] },
    customerSessionId: { $exists: true, $ne: null }
  };
  if (dateRange) orderMatch.createdAt = dateRange;

  // Build item name search
  const itemNameFilter = item ? { $regex: item, $options: 'i' } : undefined;

  const pipeline = [
    { $match: orderMatch },
    { $unwind: '$items' },
    { $match: { 'items.status': { $ne: 'CANCELLED' } } },
    ...(itemNameFilter ? [{ $match: { 'items.name': itemNameFilter } }] : []),
    {
      $group: {
        _id: { customerSessionId: '$customerSessionId', itemName: '$items.name' },
        count: { $sum: '$items.qty' },
        revenue: { $sum: '$items.lineTotal' }
      }
    },
    {
      $group: {
        _id: '$_id.customerSessionId',
        items: {
          $push: { name: '$_id.itemName', count: '$count', revenue: '$revenue' }
        },
        totalOrders: { $sum: 1 },
        totalSpend: { $sum: '$revenue' }
      }
    },
    {
      $lookup: {
        from: 'customersessions',
        localField: '_id',
        foreignField: '_id',
        as: 'cs'
      }
    },
    { $unwind: '$cs' },
    {
      $project: {
        _id: 0,
        customerSessionId: '$_id',
        customerName: '$cs.customerName',
        mobileNumber: '$cs.mobileNumber',
        firstVisit: '$cs.createdAt',
        lastActivity: '$cs.lastActivity',
        totalOrders: 1,
        totalSpend: 1,
        items: {
          $sortArray: { input: '$items', sortBy: { count: -1 } }
        }
      }
    },
    { $sort: { totalSpend: -1 } },
    {
      $facet: {
        data: [{ $skip: (parseInt(page, 10) - 1) * parseInt(limit, 10) }, { $limit: parseInt(limit, 10) }],
        total: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await Order.aggregate(pipeline);
  const rows = result?.data || [];
  const totalCount = result?.total?.[0]?.count || 0;

  res.json({
    success: true,
    data: {
      rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit, 10))
      }
    }
  });
};

/**
 * GET /analytics/customers/:mobile
 * Full profile for one mobile number across all visits.
 */
exports.customerProfile = async (req, res) => {
  const restaurantId = req.user.restaurantId;
  const { mobile } = req.params;

  const sessions = await CustomerSession.find({ restaurantId, mobileNumber: mobile })
    .sort('-createdAt')
    .populate('tableId', 'number name')
    .lean();
  if (!sessions.length) throw ApiError.notFound('No sessions found for this mobile number');

  const sessionIds = sessions.map((s) => s._id);
  const orders = await Order.find({
    restaurantId,
    customerSessionId: { $in: sessionIds },
    isDeleted: false,
    status: { $ne: 'CANCELLED' }
  }).sort('createdAt').lean();

  // Item frequency map
  const itemMap = new Map();
  for (const o of orders) {
    for (const item of o.items) {
      if (item.status === 'CANCELLED') continue;
      const key = item.name;
      const existing = itemMap.get(key) || { name: key, count: 0, revenue: 0 };
      existing.count += item.qty;
      existing.revenue += item.lineTotal || 0;
      itemMap.set(key, existing);
    }
  }
  const itemFrequency = Array.from(itemMap.values()).sort((a, b) => b.count - a.count);
  const totalSpend = orders.reduce((s, o) => s + (o.total || 0), 0);

  res.json({
    success: true,
    data: {
      customerName: sessions[0].customerName,
      mobileNumber: mobile,
      totalVisits: sessions.length,
      totalOrders: orders.length,
      totalSpend: Math.round(totalSpend * 100) / 100,
      averageBill: orders.length ? Math.round((totalSpend / orders.length) * 100) / 100 : 0,
      firstVisit: sessions[sessions.length - 1].createdAt,
      lastVisit: sessions[0].createdAt,
      favoriteItem: itemFrequency[0] || null,
      itemFrequency,
      sessions: sessions.map((s) => ({
        id: s._id,
        tableNumber: s.tableId?.number,
        tableName: s.tableId?.name,
        date: s.createdAt
      })),
      orders
    }
  });
};

/**
 * GET /analytics/customers/export?period=week&format=json
 * Returns flat rows for Excel export (xlsx generated on frontend).
 */
exports.exportFavorites = async (req, res) => {
  const restaurantId = req.user.restaurantId;
  const dateRange = parseDateRange(req.query);

  const orderMatch = {
    restaurantId: restaurantId instanceof mongoose.Types.ObjectId ? restaurantId : new mongoose.Types.ObjectId(restaurantId),
    isDeleted: false,
    status: { $in: ['SERVED', 'COMPLETED'] },
    customerSessionId: { $exists: true, $ne: null }
  };
  if (dateRange) orderMatch.createdAt = dateRange;

  const pipeline = [
    { $match: orderMatch },
    { $unwind: '$items' },
    { $match: { 'items.status': { $ne: 'CANCELLED' } } },
    {
      $group: {
        _id: '$customerSessionId',
        totalOrders: { $addToSet: '$_id' },
        totalSpend: { $sum: '$items.lineTotal' },
        itemCounts: {
          $push: { name: '$items.name', qty: '$items.qty' }
        }
      }
    },
    {
      $lookup: {
        from: 'customersessions',
        localField: '_id',
        foreignField: '_id',
        as: 'cs'
      }
    },
    { $unwind: '$cs' },
    { $sort: { totalSpend: -1 } },
    { $limit: 10000 }
  ];

  const results = await Order.aggregate(pipeline);

  const rows = results.map((r) => {
    const countMap = new Map();
    for (const i of r.itemCounts) {
      countMap.set(i.name, (countMap.get(i.name) || 0) + i.qty);
    }
    const sorted = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);
    return {
      customerName: r.cs.customerName,
      mobileNumber: r.cs.mobileNumber,
      visits: 1,
      totalOrders: r.totalOrders.length,
      favoriteItem: sorted[0]?.[0] || '',
      favoriteItemCount: sorted[0]?.[1] || 0,
      totalSpend: Math.round(r.totalSpend * 100) / 100,
      lastVisit: r.cs.lastActivity
    };
  });

  res.json({ success: true, data: rows });
};
