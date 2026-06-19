const Order = require('../models/Order');
const Table = require('../models/Table');
const TableSession = require('../models/TableSession');
const CustomerSession = require('../models/CustomerSession');
const Payment = require('../models/Payment');
const Outlet = require('../models/Outlet');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/ApiError');
const { tenantFilter } = require('../middleware/tenant');
const { sessionBill, customerBill } = require('../services/billing.service');
const { consumeForOrder } = require('../services/inventory.service');
const { emitToOutlet, emitToOutletWaiters, emitToCustomer, emitToStaff } = require('../sockets');
const { audit } = require('../utils/audit');
const { outletHasKitchenStaff } = require('../utils/kitchenStaff');

const ORDER_FLOW = ['PENDING', 'ACCEPTED', 'PREPARING', 'DONE', 'READY_TO_SERVE', 'SERVED', 'PAYMENT_COMPLETED', 'CLOSED'];

const KITCHEN_ALLOWED_STATUSES = ['ACCEPTED', 'PREPARING', 'DONE', 'CANCELLED'];
const WAITER_ALLOWED_STATUSES = ['READY_TO_SERVE', 'SERVED'];
const MANAGER_OWNER_ONLY_STATUSES = ['PAYMENT_COMPLETED', 'CLOSED'];
const KITCHEN_FORBIDDEN_STATUSES = ['READY_TO_SERVE', 'SERVED', 'PAYMENT_COMPLETED', 'CLOSED'];
const WAITER_FORBIDDEN_STATUSES = ['PAYMENT_COMPLETED', 'CLOSED'];

exports.list = async (req, res) => {
  const filter = tenantFilter(req);
  if (req.query.status) filter.status = req.query.status;
  if (req.query.tableId) filter.tableId = req.query.tableId;
  const orders = await Order.find(filter)
    .sort('-createdAt')
    .limit(parseInt(req.query.limit, 10) || 100)
    .populate('tableId', 'number name')
    .populate('customerSessionId', 'customerName mobileNumber')
    .lean();
  res.json({ success: true, data: orders });
};

/**
 * Workflow mode for the current user's outlet (or a given ?outletId= for OWNER).
 * GET /api/tenant/orders/workflow-mode
 * Tells the frontend whether the kitchen stage is active for this outlet.
 * When hasKitchen=false, Owner/Waiter move orders PENDING -> SERVED directly.
 */
exports.workflowMode = async (req, res) => {
  let outletId = req.user.outletId;
  if (!outletId && (req.user.role === 'OWNER' || req.user.role === 'MANAGER')) {
    outletId = req.query.outletId || null;
  }
  if (!outletId) {
    // OWNER with no specific outlet: report per-outlet so the UI can decide globally.
    const outlets = await Outlet.find({ restaurantId: req.user.restaurantId, isDeleted: false }).select('_id').lean();
    const flags = await Promise.all(outlets.map(async (o) => ({
      outletId: o._id.toString(),
      hasKitchen: await outletHasKitchenStaff(o._id.toString())
    })));
    const anyKitchen = flags.some((f) => f.hasKitchen);
    return res.json({ success: true, data: { hasKitchen: anyKitchen, perOutlet: flags } });
  }
  const hasKitchen = await outletHasKitchenStaff(outletId.toString());
  res.json({ success: true, data: { hasKitchen, outletId: outletId.toString() } });
};

exports.kitchenQueue = async (req, res) => {
  const orders = await Order.find(
    tenantFilter(req, { status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'DONE'] } })
  ).sort('createdAt')
    .populate('tableId', 'number name')
    .populate('customerSessionId', 'customerName mobileNumber')
    .lean();
  res.json({ success: true, data: orders });
};

exports.waiterQueue = async (req, res) => {
  const orders = await Order.find(
    tenantFilter(req, { status: { $in: ['READY_TO_SERVE', 'SERVED'] } })
  ).sort('createdAt')
    .populate('tableId', 'number name')
    .populate('customerSessionId', 'customerName mobileNumber')
    .lean();
  res.json({ success: true, data: orders });
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!ORDER_FLOW.includes(status) && status !== 'CANCELLED') throw ApiError.badRequest(`"${status}" is not a valid order status.`);

  const role = req.user.role;

  if (role === 'KITCHEN' && KITCHEN_FORBIDDEN_STATUSES.includes(status)) {
    throw ApiError.forbidden('Kitchen staff can only accept, start preparing, or mark orders as done. Please notify the waiter to serve the order.');
  }

  if (role === 'WAITER' && WAITER_FORBIDDEN_STATUSES.includes(status)) {
    throw ApiError.forbidden('Waiters cannot process payments or close orders. Please notify the outlet manager.');
  }
  if (role === 'WAITER' && !WAITER_ALLOWED_STATUSES.includes(status) && status !== 'CANCELLED') {
    throw ApiError.forbidden('Waiters can only mark orders as "Ready to Serve" or "Served".');
  }

  const user = await User.findById(req.user.id).lean();
  const order = await Order.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!order) throw ApiError.notFound('Order not found. It may have been removed or you may not have access.');

  const prev = order.status;

  // Dynamic per-outlet workflow: if the outlet has no kitchen staff, the kitchen
  // stage is bypassed and Owner/Waiter move orders Pending -> Served (or Cancelled)
  // directly. If a kitchen exists, the order must pass through the kitchen
  // (reaching READY_TO_SERVE) before a waiter can mark it Served.
  const hasKitchen = await outletHasKitchenStaff(order.outletId.toString());
  if (status === 'SERVED' && hasKitchen && role === 'WAITER') {
    if (!['DONE', 'READY_TO_SERVE'].includes(prev)) {
      throw ApiError.conflict('This order has not been prepared by the kitchen yet. Please wait until it is ready to serve.');
    }
  }
  order.status = status;
  order.updatedBy = req.user.id;
  order.updatedByName = user?.name;
  order.updatedByEmail = user?.email;

  if (status === 'ACCEPTED' && prev === 'PENDING') {
    consumeForOrder(order).catch((e) => console.error('[inventory]', e.message));
  }
  // Bypass mode (no kitchen): an order can jump PENDING -> SERVED without ever
  // passing through ACCEPTED, so consume inventory here too.
  if (status === 'SERVED' && prev === 'PENDING' && !hasKitchen) {
    consumeForOrder(order).catch((e) => console.error('[inventory]', e.message));
  }

  if (status === 'DONE') {
    order.status = 'READY_TO_SERVE';
    const [table, outlet] = await Promise.all([
      Table.findById(order.tableId).lean(),
      Outlet.findById(order.outletId).lean()
    ]);
    emitToOutletWaiters(order.restaurantId, order.outletId, 'order:ready_to_serve', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableName: table ? (table.name || `T-${table.number}`) : 'Unknown',
      tableNumber: table?.number,
      items: order.items.filter(i => i.status !== 'CANCELLED').map(i => ({
        name: i.name, qty: i.qty, variant: i.variant?.name, notes: i.notes, lineTotal: i.lineTotal
      })),
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      total: order.total,
      outletName: outlet?.name,
      createdAt: order.createdAt,
      timestamp: new Date()
    });
  }

  if (status === 'SERVED') {
    const now = new Date();
    order.servedAt = now;
    for (const item of order.items) {
      if (item.status !== 'CANCELLED') {
        item.status = 'SERVED';
        item.servedAt = item.servedAt || now;
        item.locked = true;
        item.servedBy = req.user.id;
        item.servedByName = user?.name;
        item.servedByEmail = user?.email;
        item.statusUpdatedBy = req.user.id;
        item.statusUpdatedByName = user?.name;
        item.statusUpdatedByEmail = user?.email;
      }
    }

    if (order.customerSessionId) {
      await CustomerSession.updateOne(
        { _id: order.customerSessionId },
        { isActive: false }
      );
      const remainingSeats = await CustomerSession.countDocuments({
        tableId: order.tableId,
        sessionId: order.sessionId,
        isActive: true
      });
      await Table.updateOne({ _id: order.tableId }, { seatsOccupied: remainingSeats });
    }
  } else if (['ACCEPTED', 'PREPARING', 'READY_TO_SERVE', 'PAYMENT_COMPLETED', 'CLOSED'].includes(status)) {
    for (const item of order.items) {
      if (!item.locked && item.status !== 'CANCELLED') {
        item.statusUpdatedBy = req.user.id;
        item.statusUpdatedByName = user?.name;
        item.statusUpdatedByEmail = user?.email;
        if (['ACCEPTED', 'PREPARING'].includes(status)) {
          item.status = status;
        }
      }
    }
  }

  await order.save();
  audit({ req, action: 'ORDER_STATUS_CHANGED', entity: 'Order', entityId: order._id, meta: { from: prev, to: order.status } });

  emitToOutlet(order.restaurantId, order.outletId, 'order:updated', order);
  if (order.customerSessionId) {
    const cs = await CustomerSession.findById(order.customerSessionId).lean();
    if (cs) emitToCustomer(cs.sessionToken, 'order:updated', order);
  }

  res.json({ success: true, data: order });
};

exports.updateItemStatus = async (req, res) => {
  const { status } = req.body;
  const role = req.user.role;

  if (role === 'KITCHEN' && KITCHEN_FORBIDDEN_STATUSES.includes(status)) {
    throw ApiError.forbidden('Kitchen staff cannot mark items as served. Please notify the waiter to serve this item.');
  }
  if (role === 'WAITER' && WAITER_FORBIDDEN_STATUSES.includes(status)) {
    throw ApiError.forbidden('Waiters cannot process payments or close orders. Please notify the outlet manager.');
  }

  const user = await User.findById(req.user.id).lean();
  const order = await Order.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!order) throw ApiError.notFound('Order not found. It may have been removed or you may not have access.');
  const item = order.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Order item not found. It may have been removed.');
  if (item.locked) throw ApiError.conflict('This item has already been served and cannot be modified.');

  item.status = status;
  item.statusUpdatedBy = req.user.id;
  item.statusUpdatedByName = user?.name;
  item.statusUpdatedByEmail = user?.email;
  if (status === 'SERVED') {
    item.servedAt = new Date();
    item.locked = true;
    item.servedBy = req.user.id;
    item.servedByName = user?.name;
    item.servedByEmail = user?.email;
  }
  await order.save();

  emitToOutlet(order.restaurantId, order.outletId, 'item:updated', { orderId: order._id, item });
  if (order.customerSessionId) {
    const cs = await CustomerSession.findById(order.customerSessionId).lean();
    if (cs) emitToCustomer(cs.sessionToken, 'item:updated', { orderId: order._id, item });
  }
  res.json({ success: true, data: order });
};

exports.orderReceipt = async (req, res) => {
  const [order, restaurant] = await Promise.all([
    Order.findOne(tenantFilter(req, { _id: req.params.id }))
      .populate('tableId', 'number name')
      .populate('sessionId', 'sessionToken')
      .populate('customerSessionId', 'customerName mobileNumber')
      .lean(),
    Restaurant.findById(req.user.restaurantId).lean()
  ]);
  if (!order) throw ApiError.notFound('Order not found. It may have been removed or you may not have access.');
  const terminalStatuses = ['SERVED', 'PAYMENT_COMPLETED', 'CLOSED', 'COMPLETED'];
  if (order.paymentStatus !== 'PAID' && !terminalStatuses.includes(order.status)) {
    throw ApiError.conflict('Receipt is available only after the order has been served or payment is completed.');
  }

  res.json({
    success: true,
    data: {
      receiptNumber: `R-${order.orderNumber}`,
      generatedAt: new Date(),
      order,
      table: order.tableId ? { id: order.tableId._id, number: order.tableId.number, name: order.tableId.name } : null,
      restaurant: restaurant ? {
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        email: restaurant.email,
        gstin: restaurant.gstin,
        website: restaurant.website,
        logoUrl: restaurant.logoUrl,
        serviceChargePercent: restaurant.serviceChargePercent || 0
      } : null
    }
  });
};

exports.markPaid = async (req, res) => {
  const role = req.user.role;
  if (role === 'KITCHEN') throw ApiError.forbidden('Kitchen staff cannot process payments. Please ask the waiter or manager.');

  const { sessionId, orderId, method = 'CASH', reference } = req.body;
  if (!['CASH', 'UPI', 'CARD', 'OTHER'].includes(method)) throw ApiError.badRequest(`Invalid payment method "${method}". Use CASH, UPI, CARD, or OTHER.`);
  if (!orderId) throw ApiError.badRequest('Order ID is required to process payment.');

  const order = await Order.findOne(tenantFilter(req, { _id: orderId }));
  if (!order) throw ApiError.notFound('Order not found. It may have been removed or you may not have access.');
  if (order.paymentStatus === 'PAID') throw ApiError.conflict('This order has already been paid.');

  const session = sessionId
    ? await TableSession.findOne({ _id: sessionId, restaurantId: req.user.restaurantId, outletId: order.outletId })
    : (order.sessionId ? await TableSession.findById(order.sessionId) : null);

  const user = await User.findById(req.user.id).lean();

  order.paymentStatus = 'PAID';
  order.paymentMode = method;
  order.paidAt = new Date();
  order.status = 'PAYMENT_COMPLETED';
  order.paidBy = req.user.id;
  order.paidByName = user?.name;
  order.paidByEmail = user?.email;
  await order.save();

  const payment = await Payment.create({
    restaurantId: req.user.restaurantId,
    outletId: order.outletId,
    sessionId: order.sessionId || session?._id,
    orderIds: [order._id],
    amount: order.total,
    method,
    reference,
    collectedBy: req.user.id,
    collectedByName: user?.name,
    collectedByEmail: user?.email
  });

  if (session) {
    const bill = await sessionBill(session._id);
    if (bill.paid) {
      session.status = 'CLOSED';
      session.closedAt = new Date();
      await session.save();
    }
  }

  audit({ req, action: 'PAYMENT_MARKED_PAID', entity: 'Payment', entityId: payment._id, meta: { amount: payment.amount, method, orderId } });
  emitToOutlet(order.restaurantId, order.outletId, 'payment:recorded', payment);

  if (session) {
    const customerSessions = await CustomerSession.find({ sessionId: session._id }).lean();
    await Promise.all(customerSessions.map(async (cs) => {
      const cBill = await customerBill(cs._id);
      emitToCustomer(cs.sessionToken, 'bill:updated', cBill);
    }));
  }

  res.json({ success: true, data: payment });
};

exports.closeOrder = async (req, res) => {
  const role = req.user.role;
  if (!['MANAGER', 'OWNER'].includes(role)) {
    throw ApiError.forbidden('Only outlet managers and restaurant owners can close orders.');
  }

  const order = await Order.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!order) throw ApiError.notFound('Order not found. It may have been removed or you may not have access.');
  if (order.status === 'CLOSED') throw ApiError.conflict('This order is already closed.');
  if (order.paymentStatus !== 'PAID') throw ApiError.conflict('Payment must be completed before closing this order.');

  const prev = order.status;
  const user = await User.findById(req.user.id).lean();
  order.status = 'CLOSED';
  order.updatedBy = req.user.id;
  order.updatedByName = user?.name;
  order.updatedByEmail = user?.email;
  await order.save();

  audit({ req, action: 'ORDER_CLOSED', entity: 'Order', entityId: order._id, meta: { from: prev } });
  emitToOutlet(order.restaurantId, order.outletId, 'order:updated', order);

  res.json({ success: true, data: order });
};
