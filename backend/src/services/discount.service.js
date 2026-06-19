const Discount = require('../models/Discount');

/** Normalize a mobile number for consistent assignment/lookup (digits only). */
function normalizeMobile(mobile) {
  return String(mobile || '').replace(/\D/g, '');
}

/**
 * Find the best live discount assigned to `mobile` at `outletId`, or null.
 * "Best" = the one that yields the largest deduction on the given subtotal.
 */
async function resolveCustomerDiscount({ outletId, mobile, subtotal }) {
  const norm = normalizeMobile(mobile);
  if (!norm || !outletId) return null;

  const now = new Date();
  const candidates = await Discount.find({
    outletId,
    assignedMobiles: norm,
    isActive: true,
    isDeleted: false
  });

  let best = null;
  let bestAmount = 0;
  for (const d of candidates) {
    if (!d.isLive(now)) continue;
    const amount = d.computeAmount(subtotal);
    if (amount > bestAmount) { best = d; bestAmount = amount; }
  }
  if (!best || bestAmount <= 0) return null;

  return {
    discountId: best._id,
    name: best.name,
    type: best.type,
    value: best.value,
    amount: Math.round(bestAmount * 100) / 100
  };
}

module.exports = { resolveCustomerDiscount, normalizeMobile };
