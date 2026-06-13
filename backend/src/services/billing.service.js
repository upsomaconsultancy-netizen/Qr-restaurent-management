const Order = require('../models/Order');

/** Compute money fields for an order document (mutates + returns it). */
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

    const taxes = Array.isArray(item.taxes) && item.taxes.length > 0
      ? item.taxes
      : (taxPercent ? [{ name: 'Tax', rate: taxPercent }] : []);

    item.taxes = taxes.map((t) => {
      const amount = round2(item.lineTotal * (t.rate || 0) / 100);
      const key = t.name || 'Tax';
      const existing = aggregatedTaxes.get(key) || 0;
      aggregatedTaxes.set(key, round2(existing + amount));
      return { name: t.name || 'Tax', rate: t.rate || 0, amount };
    });

    item.taxAmount = round2(item.taxes.reduce((s, tx) => s + (tx.amount || 0), 0));
    subtotal += item.lineTotal;
  }

  order.subtotal = round2(subtotal);
  order.taxPercent = taxPercent;
  order.taxes = Array.from(aggregatedTaxes.entries()).map(([name, amount]) => ({ name, amount }));
  order.taxAmount = round2(Array.from(aggregatedTaxes.values()).reduce((s, a) => s + a, 0));
  order.total = round2(order.subtotal + order.taxAmount);
  return order;
}

/** Live bill for a table session: aggregates every order in the session. */
async function sessionBill(sessionId) {
  const orders = await Order.find({ sessionId, isDeleted: false, status: { $ne: 'CANCELLED' } }).lean();
  const subtotal = round2(orders.reduce((s, o) => s + (o.subtotal || 0), 0));
  const taxAmount = round2(orders.reduce((s, o) => s + (o.taxAmount || 0), 0));
  const total = round2(subtotal + taxAmount);
  const unpaid = orders.filter((o) => o.paymentStatus === 'UNPAID');
  return {
    orders,
    subtotal,
    taxAmount,
    total,
    dueAmount: round2(unpaid.reduce((s, o) => s + (o.total || 0), 0)),
    paid: unpaid.length === 0 && orders.length > 0
  };
}

/** Live bill scoped to one customer session (isolated from other customers on same table). */
async function customerBill(customerSessionId) {
  const orders = await Order.find({ customerSessionId, isDeleted: false, status: { $ne: 'CANCELLED' } }).lean();
  const subtotal = round2(orders.reduce((s, o) => s + (o.subtotal || 0), 0));

  // Merge taxes across orders
  const taxMap = new Map();
  for (const o of orders) {
    for (const t of (o.taxes || [])) {
      taxMap.set(t.name, round2((taxMap.get(t.name) || 0) + (t.amount || 0)));
    }
  }
  const taxes = Array.from(taxMap.entries()).map(([name, amount]) => ({ name, amount }));
  const taxAmount = round2(Array.from(taxMap.values()).reduce((s, a) => s + a, 0));
  const total = round2(subtotal + taxAmount);

  const allServed = orders.length > 0 && orders.every(
    (o) => ['SERVED', 'COMPLETED', 'CANCELLED'].includes(o.status)
  );
  const unpaid = orders.filter((o) => o.paymentStatus === 'UNPAID');
  const isPaid = unpaid.length === 0 && orders.length > 0;

  return {
    orders,
    subtotal,
    taxes,
    taxAmount,
    total,
    dueAmount: round2(unpaid.reduce((s, o) => s + (o.total || 0), 0)),
    paid: isPaid,
    canGenerateReceipt: isPaid,
    canPay: allServed
  };
}

const round2 = (n) => Math.round(n * 100) / 100;

module.exports = { priceOrder, sessionBill, customerBill };
