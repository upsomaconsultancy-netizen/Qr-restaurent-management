const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const Tip = require('../models/Tip');

/** Compute money fields for a single order document (mutates + returns it).
 *  Bill-level taxes are NOT stored here — they are applied once at bill-view time. */
function priceOrder(order, taxPercent) {
  let subtotal = 0;
  const aggregatedTaxes = new Map();

  for (const item of order.items) {
    if (item.status === 'CANCELLED') {
      item.lineTotal = 0;
      item.taxAmount = 0;
      item.taxes = item.taxes || [];
      continue;
    }

    const addons = (item.addons || []).reduce((s, a) => s + (a.price || 0), 0);
    const unit = (item.unitPrice || 0) + addons;
    item.lineTotal = round2(unit * item.qty);

    // Per-item taxes (from MenuItem.taxes)
    const taxes = Array.isArray(item.taxes) && item.taxes.length > 0
      ? item.taxes
      : (taxPercent ? [{ name: 'Tax', rate: taxPercent, type: 'PERCENTAGE' }] : []);

    item.taxes = taxes.map((t) => {
      const isFlat = t.type === 'FLAT';
      const amount = isFlat
        ? round2((t.rate || 0) * item.qty)
        : round2(item.lineTotal * (t.rate || 0) / 100);
      const key = t.name || 'Tax';
      aggregatedTaxes.set(key, round2((aggregatedTaxes.get(key) || 0) + amount));
      return { name: t.name || 'Tax', rate: t.rate || 0, type: t.type || 'PERCENTAGE', amount };
    });

    item.taxAmount = round2(item.taxes.reduce((s, tx) => s + (tx.amount || 0), 0));
    subtotal += item.lineTotal;
  }

  order.subtotal = round2(subtotal);
  order.taxPercent = taxPercent;
  order.taxes = Array.from(aggregatedTaxes.entries()).map(([name, amount]) => ({ name, amount }));
  order.taxAmount = round2(Array.from(aggregatedTaxes.values()).reduce((s, a) => s + a, 0));

  // Bill-level taxes are NOT stored per order — they are applied once at bill view time.
  order.billTaxes = [];
  order.billTaxAmount = 0;
  order.total = round2(order.subtotal + order.taxAmount);
  return order;
}

/** Apply bill-level taxes once on the combined subtotal. Returns { billTaxes, billTaxAmount }. */
function applyBillTaxes(subtotal, restaurant) {
  const enabled = (restaurant?.billTaxes || []).filter(t => t.enabled !== false);
  let billTaxAmount = 0;
  const billTaxes = enabled.map(t => {
    const amount = t.type === 'FLAT'
      ? round2(t.rate || 0)
      : round2(subtotal * (t.rate || 0) / 100);
    billTaxAmount += amount;
    return { name: t.name, rate: t.rate, type: t.type, amount };
  });
  return { billTaxes, billTaxAmount: round2(billTaxAmount) };
}

/** Live bill for a table session: aggregates every order in the session. */
async function sessionBill(sessionId) {
  const [orders, firstOrder] = await Promise.all([
    Order.find({ sessionId, isDeleted: false, status: { $ne: 'CANCELLED' } }).lean(),
    Order.findOne({ sessionId }).lean()
  ]);

  const subtotal = round2(orders.reduce((s, o) => s + (o.subtotal || 0), 0));
  const taxAmount = round2(orders.reduce((s, o) => s + (o.taxAmount || 0), 0));

  // Load restaurant for bill-level taxes
  let restaurant = null;
  if (firstOrder) {
    restaurant = await Restaurant.findById(firstOrder.restaurantId).lean();
  }
  const { billTaxes, billTaxAmount } = applyBillTaxes(subtotal, restaurant);

  const total = round2(subtotal + taxAmount + billTaxAmount);
  const unpaid = orders.filter((o) => o.paymentStatus === 'UNPAID');
  return {
    orders,
    subtotal,
    taxAmount,
    billTaxes,
    billTaxAmount,
    total,
    dueAmount: round2(unpaid.reduce((s, o) => s + (o.total || 0), 0)),
    paid: unpaid.length === 0 && orders.length > 0
  };
}

/** Live bill scoped to one customer session (isolated from other customers on same table). */
async function customerBill(customerSessionId) {
  const orders = await Order.find({ customerSessionId, isDeleted: false, status: { $ne: 'CANCELLED' } }).lean();
  const subtotal = round2(orders.reduce((s, o) => s + (o.subtotal || 0), 0));

  // Merge per-item taxes across orders
  const taxMap = new Map();
  for (const o of orders) {
    for (const t of (o.taxes || [])) {
      taxMap.set(t.name, round2((taxMap.get(t.name) || 0) + (t.amount || 0)));
    }
  }
  const taxes = Array.from(taxMap.entries()).map(([name, amount]) => ({ name, amount }));
  const taxAmount = round2(Array.from(taxMap.values()).reduce((s, a) => s + a, 0));

  // Bill-level taxes: applied ONCE on combined subtotal (not per order)
  let restaurant = null;
  if (orders.length > 0) {
    restaurant = await Restaurant.findById(orders[0].restaurantId).lean();
  }
  const { billTaxes, billTaxAmount } = applyBillTaxes(subtotal, restaurant);

  const total = round2(subtotal + taxAmount + billTaxAmount);

  const allServed = orders.length > 0 && orders.every(
    (o) => ['SERVED', 'COMPLETED', 'CANCELLED'].includes(o.status)
  );
  const unpaid = orders.filter((o) => o.paymentStatus === 'UNPAID');
  const isPaid = unpaid.length === 0 && orders.length > 0;

  // Tip is a gratuity tracked separately — never added to total/dueAmount and
  // never shown on the receipt. Surfaced here only so the customer UI can show
  // "you tipped ₹X" instead of the Give Tip button.
  const tipDoc = await Tip.findOne({ customerSessionId }).lean();

  return {
    orders,
    subtotal,
    taxes,
    taxAmount,
    billTaxes,
    billTaxAmount,
    total,
    dueAmount: round2(unpaid.reduce((s, o) => s + (o.total || 0), 0)),
    paid: isPaid,
    canGenerateReceipt: isPaid,
    canPay: allServed,
    tip: tipDoc ? { amount: tipDoc.amount, waiterName: tipDoc.waiterName } : null
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

module.exports = { priceOrder, sessionBill, customerBill };
