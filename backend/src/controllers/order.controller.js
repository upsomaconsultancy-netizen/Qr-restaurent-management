const Order = require('../models/Order');
const TableSession = require('../models/TableSession');
const CustomerSession = require('../models/CustomerSession');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/ApiError');
const { tenantFilter } = require('../middleware/tenant');
const { sessionBill, customerBill } = require('../services/billing.service');
const { consumeForOrder } = require('../services/inventory.service');
const { emitToStaff, emitToCustomer } = require('../sockets');
const { audit } = require('../utils/audit');

const ORDER_FLOW = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];

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

/** Kitchen queue: anything not finished yet. */
exports.kitchenQueue = async (req, res) => {
  const orders = await Order.find(
    tenantFilter(req, { status: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] } })
  ).sort('createdAt')
    .populate('tableId', 'number name')
    .populate('customerSessionId', 'customerName mobileNumber')
    .lean();
  res.json({ success: true, data: orders });
};

/** Kitchen / staff moves an order through the status flow. */
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  if (!ORDER_FLOW.includes(status) && status !== 'CANCELLED') throw ApiError.badRequest('Invalid status');

  const user = await User.findById(req.user.id).lean();
  const order = await Order.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!order) throw ApiError.notFound('Order not found');

  const prev = order.status;
  order.status = status;
  order.updatedBy = req.user.id;
  order.updatedByName = user?.name;
  order.updatedByEmail = user?.email;

  if (status === 'ACCEPTED' && prev === 'PENDING') {
    consumeForOrder(order).catch((e) => console.error('[inventory]', e.message));
  }
  if (status === 'SERVED') {
    const now = new Date();
    for (const item of order.items) {
      if (item.status !== 'CANCELLED') {
        item.status = 'SERVED';
        item.servedAt = item.servedAt || now;
        item.locked = true; // ITEM LOCKING: served items become immutable
        item.servedBy = req.user.id;
        item.servedByName = user?.name;
        item.servedByEmail = user?.email;
        item.statusUpdatedBy = req.user.id;
        item.statusUpdatedByName = user?.name;
        item.statusUpdatedByEmail = user?.email;
      }
    }
  } else if (ORDER_FLOW.includes(status)) {
    for (const item of order.items) {
      if (!item.locked && item.status !== 'CANCELLED') {
        item.status = status === 'COMPLETED' ? 'SERVED' : status;
        item.statusUpdatedBy = req.user.id;
        item.statusUpdatedByName = user?.name;
        item.statusUpdatedByEmail = user?.email;
      }
    }
  }

  await order.save();
  audit({ req, action: 'ORDER_STATUS_CHANGED', entity: 'Order', entityId: order._id, meta: { from: prev, to: status } });

  emitToStaff(req.user.restaurantId, 'order:updated', order);
  // Emit only to the customer who owns this order (not to the whole table)
  if (order.customerSessionId) {
    const cs = await CustomerSession.findById(order.customerSessionId).lean();
    if (cs) emitToCustomer(cs.sessionToken, 'order:updated', order);
  }

  res.json({ success: true, data: order });
};

/** Update a single line item (kitchen marks one dish ready, etc.). */
exports.updateItemStatus = async (req, res) => {
  const { status } = req.body;
  const user = await User.findById(req.user.id).lean();
  const order = await Order.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!order) throw ApiError.notFound('Order not found');
  const item = order.items.id(req.params.itemId);
  if (!item) throw ApiError.notFound('Order item not found');
  if (item.locked) throw ApiError.conflict('Item already served and locked');

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

  emitToStaff(req.user.restaurantId, 'item:updated', { orderId: order._id, item });
  // Emit only to the customer who owns this order
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
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus !== 'PAID' && order.status !== 'SERVED' && order.status !== 'COMPLETED') {
    throw ApiError.conflict('Receipt is available only after the order is served or paid');
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

/**
 * Cash flow: waiter/cashier marks a session's bill as paid.
 * Records who collected, amount, time, method -> full audit trail.
 */
exports.markPaid = async (req, res) => {
  const { sessionId, orderId, method = 'CASH', reference } = req.body;
  if (!['CASH', 'UPI', 'CARD', 'OTHER'].includes(method)) throw ApiError.badRequest('Invalid payment method');
  if (!orderId) throw ApiError.badRequest('Missing orderId');

  const order = await Order.findOne({ _id: orderId, restaurantId: req.user.restaurantId, isDeleted: false });
  if (!order) throw ApiError.notFound('Order not found');
  if (order.paymentStatus === 'PAID') throw ApiError.conflict('Order already paid');

  const session = sessionId 
    ? await TableSession.findOne({ _id: sessionId, restaurantId: req.user.restaurantId })
    : (order.sessionId ? await TableSession.findById(order.sessionId) : null);

  const user = await User.findById(req.user.id).lean();
  
  // Mark only this order as paid
  order.paymentStatus = 'PAID';
  order.paymentMode = method;
  order.paidAt = new Date();
  order.status = 'COMPLETED';
  order.paidBy = req.user.id;
  order.paidByName = user?.name;
  order.paidByEmail = user?.email;
  await order.save();

  // Create payment record for this order only
  const payment = await Payment.create({
    restaurantId: req.user.restaurantId,
    sessionId: order.sessionId || session?._id,
    orderIds: [order._id],
    amount: order.total,
    method,
    reference,
    collectedBy: req.user.id,
    collectedByName: user?.name,
    collectedByEmail: user?.email
  });

  // Update session status only if all orders are now paid
  if (session) {
    const bill = await sessionBill(session._id);
    if (bill.paid) {
      session.status = 'CLOSED';
      session.closedAt = new Date();
      await session.save();
    }
  }

  audit({ req, action: 'PAYMENT_MARKED_PAID', entity: 'Payment', entityId: payment._id, meta: { amount: payment.amount, method, orderId } });
  emitToStaff(req.user.restaurantId, 'payment:recorded', payment);

  // Emit isolated bill to each customer's own room — avoids cross-customer bill pollution
  if (session) {
    const customerSessions = await CustomerSession.find({ sessionId: session._id }).lean();
    await Promise.all(customerSessions.map(async (cs) => {
      const cBill = await customerBill(cs._id);
      emitToCustomer(cs.sessionToken, 'bill:updated', cBill);
    }));
  }

  res.json({ success: true, data: payment });
};
