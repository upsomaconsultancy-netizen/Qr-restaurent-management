const { randomBytes } = require('crypto');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const Outlet = require('../models/Outlet');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const TableSession = require('../models/TableSession');
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const { priceOrder, sessionBill, customerBill } = require('../services/billing.service');
const { emitToOutlet, emitToCustomer } = require('../sockets');
const { audit } = require('../utils/audit');
const redis = require('../config/redis');

const MENU_TTL = 300; // 5 minutes

function menuCacheKey(outletId) {
  return `menu:${outletId}`;
}

async function invalidateMenuCache(outletId) {
  await redis.del(menuCacheKey(outletId));
}

exports.invalidateMenuCache = invalidateMenuCache;


/** Returns up to 5 past completed orders for this mobile (excluding current session). */
async function getPastOrders(restaurantId, outletId, mobileNumber, excludeSessionId) {
  const pastSessions = await CustomerSession.find({
    restaurantId,
    outletId,           // only visits to THIS outlet
    mobileNumber,
    _id: { $ne: excludeSessionId }
  }).sort('-createdAt').limit(10).lean();

  if (!pastSessions.length) return [];

  const pastSessionIds = pastSessions.map((s) => s._id);
  const orders = await Order.find({
    restaurantId,
    customerSessionId: { $in: pastSessionIds },
    isDeleted: false,
    status: { $ne: 'CANCELLED' }
  }).sort('-createdAt').limit(20).lean();

  const bySession = new Map();
  for (const cs of pastSessions) {
    bySession.set(cs._id.toString(), { date: cs.createdAt, items: [], total: 0 });
  }
  for (const o of orders) {
    const key = o.customerSessionId.toString();
    const entry = bySession.get(key);
    if (!entry) continue;
    for (const item of o.items.filter((i) => i.status !== 'CANCELLED')) {
      entry.items.push(item.name);
    }
    entry.total += o.total || 0;
  }

  return Array.from(bySession.values())
    .filter((e) => e.items.length > 0)
    .slice(0, 5)
    .map((e) => ({
      date: e.date,
      items: [...new Set(e.items)].slice(0, 5),
      total: Math.round(e.total * 100) / 100
    }));
}

/**
 * GET /api/public/qr/:qrToken
 * Customer scans QR → get restaurant info, menu, sessionToken.
 * Also checks table capacity — if full, returns tableFull: true.
 */
/**
 * GET /api/public/search?sessionToken=&q=
 * Atlas Search over menu items for the outlet resolved from the session token.
 * Tenant isolation: restaurantId + outletId are derived server-side from the token.
 */
exports.searchMenu = async (req, res) => {
  const { sessionToken, q } = req.query;
  if (!sessionToken) throw ApiError.badRequest('sessionToken is required');

  const query = typeof q === 'string' ? q.trim() : '';
  if (!query) return res.json({ success: true, data: [] });

  const session = await TableSession.findOne({ sessionToken, status: 'OPEN' }).lean();
  if (!session) throw ApiError.notFound('Session not found or expired');

  const { restaurantId, outletId } = session;

  // Use Atlas Search if available, fall back to regex for local dev
  let items;
  try {
    items = await MenuItem.aggregate([
      {
        $search: {
          index: 'menu_search',
          compound: {
            must: [
              {
                equals: {
                  path: 'restaurantId',
                  value: restaurantId
                }
              },
              {
                equals: {
                  path: 'outletId',
                  value: outletId
                }
              }
            ],
            should: [
              {
                autocomplete: {
                  query,
                  path: 'name',
                  fuzzy: { maxEdits: 1 },
                  score: { boost: { value: 3 } }
                }
              },
              {
                text: {
                  query,
                  path: ['name', 'description'],
                  fuzzy: { maxEdits: 1 }
                }
              }
            ],
            minimumShouldMatch: 1
          }
        }
      },
      { $match: { isDeleted: false, isAvailable: true } },
      { $limit: 20 },
      {
        $project: {
          name: 1, description: 1, price: 1, imageUrl: 1,
          foodType: 1, spicyLevel: 1, categoryId: 1,
          variants: 1, taxes: 1
        }
      }
    ]);
  } catch (atlasErr) {
    // Atlas Search not configured (local dev) — fall back to regex
    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    items = await MenuItem.find({
      restaurantId,
      outletId,
      isDeleted: false,
      isAvailable: true,
      $or: [{ name: regex }, { description: regex }]
    })
      .limit(20)
      .select('name description price imageUrl foodType spicyLevel categoryId variants taxes')
      .lean();
  }

  res.json({ success: true, data: items });
};

exports.resolveQr = async (req, res) => {
  const table = await Table.findOne({ qrCode: req.params.qrToken, isDeleted: false, isActive: true }).lean();
  if (!table) throw ApiError.notFound('This QR code is invalid or has expired. Please ask staff for a new QR code.');

  const [restaurant, outlet] = await Promise.all([
    Restaurant.findOne({ _id: table.restaurantId, isDeleted: false, status: 'ACTIVE' }).lean(),
    Outlet.findOne({ _id: table.outletId, isDeleted: false, status: 'ACTIVE' }).lean()
  ]);
  if (!restaurant) throw ApiError.forbidden('This restaurant is currently unavailable. Please try again later.');
  if (!outlet) throw ApiError.forbidden('This outlet is currently closed or deactivated. Please contact staff for assistance.');

  // Reuse open table session or create a new one
  let session = await TableSession.findOne({ tableId: table._id, status: 'OPEN' });
  if (!session) {
    session = await TableSession.create({
      restaurantId: restaurant._id,
      outletId: table.outletId,
      tableId: table._id,
      sessionToken: randomBytes(24).toString('hex')
    });
  }

  // If the requesting browser already holds a valid customer token for this table
  // session, they're a returning customer reconnecting (e.g. after a refresh) —
  // they already occupy a seat, so the capacity gate must not apply to them.
  const { customerToken } = req.query;
  let returningCustomer = null;
  if (customerToken) {
    returningCustomer = await CustomerSession.findOne({
      sessionToken: customerToken,
      sessionId: session._id,
      isActive: true
    }).lean();
  }

  // Check table capacity — count active customer sessions for this table session
  const activeSeats = await CustomerSession.countDocuments({
    tableId: table._id,
    sessionId: session._id,
    isActive: true
  });

  if (!returningCustomer && activeSeats >= table.capacity) {
    return res.json({
      success: true,
      data: {
        tableFull: true,
        capacity: table.capacity,
        seatsOccupied: activeSeats,
        table: { id: table._id, number: table.number, name: table.name }
      }
    });
  }

  // Fetch strictly this outlet's items only — served from Redis cache (5 min TTL)
  let categories, items;
  const cacheKey = menuCacheKey(table.outletId);
  const cached = await redis.get(cacheKey);
  if (cached) {
    ({ categories, items } = JSON.parse(cached));
  } else {
    [categories, items] = await Promise.all([
      Category.find({ restaurantId: restaurant._id, outletId: table.outletId, isDeleted: false, isActive: true }).sort('sortOrder').lean(),
      MenuItem.find({ restaurantId: restaurant._id, outletId: table.outletId, isDeleted: false, isAvailable: true }).lean()
    ]);
    redis.setex(cacheKey, MENU_TTL, JSON.stringify({ categories, items })).catch(() => {});
  }

  res.json({
    success: true,
    data: {
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        logoUrl: restaurant.logoUrl,
        currency: restaurant.currency,
        taxPercent: restaurant.taxPercent,
        orderTypes: restaurant.settings.orderTypes
      },
      outlet: { id: outlet._id, name: outlet.name },
      table: { id: table._id, number: table.number, name: table.name, capacity: table.capacity, seatsOccupied: activeSeats },
      sessionToken: session.sessionToken,
      categories,
      items
    }
  });
};

/**
 * POST /api/public/customer-session
 * Create or resume a customer session (called once when customer enters name+mobile).
 */
exports.createCustomerSession = async (req, res) => {
  const { sessionToken, customerName, mobileNumber } = req.body;
  if (!sessionToken) throw ApiError.badRequest('Session token is missing. Please rescan the QR code.');
  if (!customerName || !customerName.trim()) throw ApiError.badRequest('Please enter your name to continue.');
  if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.trim())) throw ApiError.badRequest('Please enter a valid 10-digit mobile number.');

  const tableSession = await TableSession.findOne({ sessionToken, status: 'OPEN' });
  if (!tableSession) throw ApiError.unauthorized('Your session has expired. Please rescan the QR code to start a new session.');

  const name = customerName.trim();
  const mobile = mobileNumber.trim();

  // Idempotent: same mobile on same table session → return existing customer session
  let cs = await CustomerSession.findOne({ sessionId: tableSession._id, mobileNumber: mobile });
  if (cs) {
    // Reactivate if they were previously served and returned
    if (!cs.isActive) {
      cs.isActive = true;
    }
    cs.lastActivity = new Date();
    await cs.save();
    const pastOrders = await getPastOrders(tableSession.restaurantId, tableSession.outletId, mobile, cs._id);
    return res.json({ success: true, data: { customerToken: cs.sessionToken, isExisting: true, pastOrders } });
  }

  // Race-condition safe: re-check capacity before creating
  const table = await Table.findById(tableSession.tableId).lean();
  const activeSeats = await CustomerSession.countDocuments({
    tableId: tableSession.tableId,
    sessionId: tableSession._id,
    isActive: true
  });
  if (table && activeSeats >= table.capacity) {
    throw ApiError.badRequest('This table is at full capacity. Please take another available seat or ask a waiter for help.');
  }

  const token = CustomerSession.generateToken();
  cs = await CustomerSession.create({
    restaurantId: tableSession.restaurantId,
    outletId: tableSession.outletId,
    tableId: tableSession.tableId,
    sessionId: tableSession._id,
    customerName: name,
    mobileNumber: mobile,
    sessionToken: token,
    isActive: true
  });

  // Update seat count on table
  if (table) {
    await Table.updateOne({ _id: table._id }, { $inc: { seatsOccupied: 1 } });
  }

  const pastOrders = await getPastOrders(tableSession.restaurantId, tableSession.outletId, mobile, cs._id);
  res.status(201).json({ success: true, data: { customerToken: cs.sessionToken, isExisting: false, pastOrders } });
};

/**
 * POST /api/public/orders
 * Customer places order. Requires sessionToken (table) + customerToken (identity).
 */
exports.placeOrder = async (req, res) => {
  const { sessionToken, customerToken, orderType = 'DINING', items } = req.body;

  if (!Array.isArray(items) || !items.length) throw ApiError.badRequest('Your cart is empty. Please add at least one item before placing an order.');
  if (orderType === 'DELIVERY') throw ApiError.badRequest('Home delivery is not available yet. Please choose Dine In or Takeaway.');
  if (!customerToken) throw ApiError.badRequest('Please provide your name and mobile number before placing an order.');

  const tableSession = await TableSession.findOne({ sessionToken, status: 'OPEN' });
  if (!tableSession) throw ApiError.unauthorized('Your session has expired. Please rescan the QR code to start a new session.');

  const cs = await CustomerSession.findOne({ sessionToken: customerToken, sessionId: tableSession._id });
  if (!cs) throw ApiError.unauthorized('Your identity could not be verified. Please enter your name and mobile number again.');

  const restaurant = await Restaurant.findOne({ _id: tableSession.restaurantId, status: 'ACTIVE', isDeleted: false }).lean();
  if (!restaurant) throw ApiError.forbidden('This restaurant is currently unavailable. Please try again later.');

  // Server-side pricing — never trust client prices; fetch from outlet-scoped menu
  const orderItems = [];
  for (const line of items) {
    const mi = await MenuItem.findOne({
      _id: line.menuItemId,
      outletId: tableSession.outletId,
      isDeleted: false,
      isAvailable: true
    }).lean();
    if (!mi) throw ApiError.badRequest('One or more items in your cart are no longer available. Please refresh the menu and try again.');

    let unitPrice = mi.price;
    let variant;
    if (line.variantId) {
      variant = mi.variants.find((v) => v._id.toString() === line.variantId);
      if (!variant) throw ApiError.badRequest(`The selected variant for "${mi.name}" is no longer available. Please reselect and try again.`);
      unitPrice = variant.price;
    }
    const addons = (line.addonIds || [])
      .map((id) => mi.addons.find((a) => a._id.toString() === id))
      .filter(Boolean)
      .map((a) => ({ name: a.name, price: a.price }));

    orderItems.push({
      menuItemId: mi._id,
      name: mi.name,
      unitPrice,
      taxes: (mi.taxes || []).map((t) => ({ name: t.name, rate: t.rate })),
      variant: variant ? { name: variant.name, price: variant.price } : undefined,
      addons,
      qty: Math.max(1, parseInt(line.qty, 10) || 1),
      notes: typeof line.notes === 'string' ? line.notes.slice(0, 200) : undefined
    });
  }

  // Order counter is now per-outlet
  const orderNumber = await Counter.next(`${tableSession.outletId}:order`);
  const order = new Order({
    restaurantId: restaurant._id,
    outletId: tableSession.outletId,
    tableId: tableSession.tableId,
    sessionId: tableSession._id,
    customerSessionId: cs._id,
    orderNumber,
    orderType,
    items: orderItems,
    customerName: cs.customerName,
    customerPhone: cs.mobileNumber
  });
  priceOrder(order, restaurant.taxPercent);
  await order.save();

  // Respond immediately — socket emit + bill + audit run async in background
  res.status(201).json({ success: true, data: { order } });

  // Background work (no await — client already has response)
  cs.lastActivity = new Date();
  cs.save().catch(() => {});

  audit({ req, restaurantId: restaurant._id, action: 'ORDER_CREATED', entity: 'Order', entityId: order._id });
  emitToOutlet(restaurant._id.toString(), tableSession.outletId.toString(), 'order:new', order);

  customerBill(cs._id)
    .then((bill) => emitToCustomer(cs.sessionToken, 'bill:updated', bill))
    .catch(() => {});
};

/**
 * GET /api/public/bill/:customerToken
 * Returns only THIS customer's orders. Full isolation.
 */
exports.myBill = async (req, res) => {
  const cs = await CustomerSession.findOne({ sessionToken: req.params.customerToken })
    .populate('tableId', 'number name')
    .lean();
  if (!cs) throw ApiError.notFound('Session not found. Please rescan the QR code.');

  const [tableSession, bill, pastOrders] = await Promise.all([
    TableSession.findById(cs.sessionId).lean(),
    customerBill(cs._id),
    getPastOrders(cs.restaurantId, cs.outletId, cs.mobileNumber, cs._id)
  ]);

  res.json({
    success: true,
    data: {
      sessionStatus: tableSession?.status || 'UNKNOWN',
      table: cs.tableId ? { id: cs.tableId._id, number: cs.tableId.number, name: cs.tableId.name } : null,
      customerName: cs.customerName,
      mobileNumber: cs.mobileNumber,
      pastOrders,
      ...bill
    }
  });
};

/**
 * GET /api/public/receipt/:customerToken
 * Generate professional receipt. Only when all orders are SERVED.
 */
exports.customerReceipt = async (req, res) => {
  const cs = await CustomerSession.findOne({ sessionToken: req.params.customerToken })
    .populate('tableId', 'number name')
    .populate('restaurantId')
    .lean();
  if (!cs) throw ApiError.notFound('Session not found. Please rescan the QR code.');

  const orders = await Order.find({ customerSessionId: cs._id, isDeleted: false }).sort('createdAt').lean();
  if (!orders.length) throw ApiError.notFound('No orders found for this session.');

  const hasUnpaid = orders.some(
    (o) => o.status !== 'CANCELLED' && o.paymentStatus !== 'PAID'
  );
  if (hasUnpaid) throw ApiError.conflict('Your receipt will be available after payment is completed. Please ask staff to process your payment.');

  const restaurant = cs.restaurantId;
  const bill = await customerBill(cs._id);
  const serviceCharge = restaurant.serviceChargePercent
    ? +(bill.subtotal * restaurant.serviceChargePercent / 100).toFixed(2)
    : 0;

  res.json({
    success: true,
    data: {
      restaurant: {
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        gstin: restaurant.gstin || null,
        website: restaurant.website || null,
        email: restaurant.email || null,
        logoUrl: restaurant.logoUrl || null
      },
      order: {
        receiptNumber: `R-${orders[0].orderNumber}`,
        orderId: orders.map((o) => `#${o.orderNumber}`).join(', '),
        tableNumber: cs.tableId?.number,
        tableName: cs.tableId?.name,
        customerName: cs.customerName,
        customerMobile: cs.mobileNumber,
        orderDate: orders[0].createdAt,
        servedTime: orders[orders.length - 1].updatedAt,
        generatedAt: new Date()
      },
      items: orders.flatMap((o) =>
        o.items
          .filter((i) => i.status !== 'CANCELLED')
          .map((i) => ({
            name: i.name,
            variant: i.variant?.name || null,
            addons: i.addons?.map((a) => a.name) || [],
            qty: i.qty,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal
          }))
      ),
      summary: {
        subtotal: bill.subtotal,
        taxes: bill.taxes,
        taxAmount: bill.taxAmount,
        billTaxes: bill.billTaxes || [],
        billTaxAmount: bill.billTaxAmount || 0,
        serviceCharge,
        serviceChargePercent: restaurant.serviceChargePercent || 0,
        grandTotal: +(bill.total + serviceCharge).toFixed(2)
      }
    }
  });
};
