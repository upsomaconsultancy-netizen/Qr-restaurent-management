const { randomBytes } = require('crypto');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const TableSession = require('../models/TableSession');
const CustomerSession = require('../models/CustomerSession');
const Order = require('../models/Order');
const Counter = require('../models/Counter');
const ApiError = require('../utils/ApiError');
const { priceOrder, sessionBill, customerBill } = require('../services/billing.service');
const { emitToStaff, emitToCustomer } = require('../sockets');
const { audit } = require('../utils/audit');

/** Returns up to 5 past completed orders for this mobile (excluding current session). */
async function getPastOrders(restaurantId, mobileNumber, excludeSessionId) {
  const pastSessions = await CustomerSession.find({
    restaurantId,
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

  // Group by session date and summarise
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
 */
exports.resolveQr = async (req, res) => {
  const table = await Table.findOne({ qrCode: req.params.qrToken, isDeleted: false, isActive: true }).lean();
  if (!table) throw ApiError.notFound('Invalid QR code');

  const restaurant = await Restaurant.findOne({ _id: table.restaurantId, isDeleted: false, status: 'ACTIVE' }).lean();
  if (!restaurant) throw ApiError.forbidden('Restaurant unavailable');

  const [categories, items] = await Promise.all([
    Category.find({ restaurantId: restaurant._id, isDeleted: false, isActive: true }).sort('sortOrder').lean(),
    MenuItem.find({ restaurantId: restaurant._id, isDeleted: false, isAvailable: true }).lean()
  ]);

  // Reuse open table session or create a new one
  let session = await TableSession.findOne({ tableId: table._id, status: 'OPEN' });
  if (!session) {
    session = await TableSession.create({
      restaurantId: restaurant._id,
      tableId: table._id,
      sessionToken: randomBytes(24).toString('hex')
    });
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
      table: { id: table._id, number: table.number, name: table.name },
      sessionToken: session.sessionToken,
      categories,
      items
    }
  });
};

/**
 * POST /api/public/customer-session
 * Create or resume a customer session (called once when customer enters name+mobile).
 * Returns customerToken stored in localStorage by the browser.
 */
exports.createCustomerSession = async (req, res) => {
  const { sessionToken, customerName, mobileNumber } = req.body;
  if (!sessionToken) throw ApiError.badRequest('Missing sessionToken');
  if (!customerName || !customerName.trim()) throw ApiError.badRequest('Customer name is required');
  if (!mobileNumber || !/^\d{10}$/.test(mobileNumber.trim())) throw ApiError.badRequest('Valid 10-digit mobile number is required');

  const tableSession = await TableSession.findOne({ sessionToken, status: 'OPEN' });
  if (!tableSession) throw ApiError.unauthorized('Session expired — please rescan the QR code');

  const name = customerName.trim();
  const mobile = mobileNumber.trim();

  // Idempotent: same mobile on same table session → return existing customer session
  let cs = await CustomerSession.findOne({ sessionId: tableSession._id, mobileNumber: mobile });
  if (cs) {
    cs.lastActivity = new Date();
    await cs.save();
    const pastOrders = await getPastOrders(tableSession.restaurantId, mobile, cs._id);
    return res.json({ success: true, data: { customerToken: cs.sessionToken, isExisting: true, pastOrders } });
  }

  const token = CustomerSession.generateToken();
  cs = await CustomerSession.create({
    restaurantId: tableSession.restaurantId,
    tableId: tableSession.tableId,
    sessionId: tableSession._id,
    customerName: name,
    mobileNumber: mobile,
    sessionToken: token
  });

  const pastOrders = await getPastOrders(tableSession.restaurantId, mobile, cs._id);
  res.status(201).json({ success: true, data: { customerToken: cs.sessionToken, isExisting: false, pastOrders } });
};

/**
 * POST /api/public/orders
 * Customer places order. Requires sessionToken (table) + customerToken (identity).
 */
exports.placeOrder = async (req, res) => {
  const { sessionToken, customerToken, orderType = 'DINING', items } = req.body;

  if (!Array.isArray(items) || !items.length) throw ApiError.badRequest('No items in order');
  if (orderType === 'DELIVERY') throw ApiError.badRequest('Home delivery is coming soon');
  if (!customerToken) throw ApiError.badRequest('Customer identity token missing');

  const tableSession = await TableSession.findOne({ sessionToken, status: 'OPEN' });
  if (!tableSession) throw ApiError.unauthorized('Session expired — please rescan the QR code');

  const cs = await CustomerSession.findOne({ sessionToken: customerToken, sessionId: tableSession._id });
  if (!cs) throw ApiError.unauthorized('Invalid customer session — please provide your name and mobile');

  const restaurant = await Restaurant.findOne({ _id: tableSession.restaurantId, status: 'ACTIVE', isDeleted: false }).lean();
  if (!restaurant) throw ApiError.forbidden('Restaurant unavailable');

  // Server-side pricing — never trust client prices
  const orderItems = [];
  for (const line of items) {
    const mi = await MenuItem.findOne({
      _id: line.menuItemId, restaurantId: restaurant._id, isDeleted: false, isAvailable: true
    }).lean();
    if (!mi) throw ApiError.badRequest('One of the items is no longer available');

    let unitPrice = mi.price;
    let variant;
    if (line.variantId) {
      variant = mi.variants.find((v) => v._id.toString() === line.variantId);
      if (!variant) throw ApiError.badRequest(`Invalid variant for ${mi.name}`);
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

  const orderNumber = await Counter.next(`${restaurant._id}:order`);
  const order = new Order({
    restaurantId: restaurant._id,
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

  cs.lastActivity = new Date();
  await cs.save();

  audit({ req, restaurantId: restaurant._id, action: 'ORDER_CREATED', entity: 'Order', entityId: order._id });
  emitToStaff(restaurant._id.toString(), 'order:new', order);

  const bill = await customerBill(cs._id);
  emitToCustomer(cs.sessionToken, 'bill:updated', bill);

  res.status(201).json({ success: true, data: { order, bill } });
};

/**
 * GET /api/public/bill/:customerToken
 * Returns only THIS customer's orders. Full isolation.
 */
exports.myBill = async (req, res) => {
  const cs = await CustomerSession.findOne({ sessionToken: req.params.customerToken })
    .populate('tableId', 'number name')
    .lean();
  if (!cs) throw ApiError.notFound('Customer session not found');

  const [tableSession, bill, pastOrders] = await Promise.all([
    TableSession.findById(cs.sessionId).lean(),
    customerBill(cs._id),
    getPastOrders(cs.restaurantId, cs.mobileNumber, cs._id)
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
  if (!cs) throw ApiError.notFound('Customer session not found');

  const orders = await Order.find({ customerSessionId: cs._id, isDeleted: false }).sort('createdAt').lean();
  if (!orders.length) throw ApiError.notFound('No orders found');

  const hasUnpaid = orders.some(
    (o) => o.status !== 'CANCELLED' && o.paymentStatus !== 'PAID'
  );
  if (hasUnpaid) throw ApiError.conflict('Receipt is available only after payment is completed');

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
        serviceCharge,
        serviceChargePercent: restaurant.serviceChargePercent || 0,
        grandTotal: +(bill.total + serviceCharge).toFixed(2)
      }
    }
  });
};
