const redis = require('../config/redis');
const User = require('../models/User');

// Per-outlet flag: does this outlet have at least one active KITCHEN user?
// Drives the dynamic workflow — when false, orders bypass the kitchen stage and
// Owner/Waiter move them straight Pending -> Served. Cached briefly so the hot
// order path (placeOrder / updateStatus) avoids a DB round-trip on every call.
const KITCHEN_FLAG_TTL = 60; // seconds
const flagKey = (outletId) => `outlet:hasKitchen:${outletId}`;

/**
 * True if the outlet has at least one active, non-deleted KITCHEN staff member.
 * Result (positive and negative) is cached in Redis with a short TTL.
 * Degrades gracefully to a direct DB read if Redis is unavailable.
 */
async function outletHasKitchenStaff(outletId) {
  if (!outletId) return false;
  const key = flagKey(outletId);

  const cached = await redis.safeGet(key);
  if (cached !== null) return cached === '1';

  const count = await User.countDocuments({
    outletId,
    role: 'KITCHEN',
    isActive: true,
    isDeleted: false
  });
  const has = count > 0;
  redis.safeSetex(key, KITCHEN_FLAG_TTL, has ? '1' : '0');
  return has;
}

/** Drop the cached flag so staff create/update/toggle takes effect immediately. */
async function invalidateKitchenFlag(outletId) {
  if (outletId) await redis.safeDel(flagKey(outletId));
}

module.exports = { outletHasKitchenStaff, invalidateKitchenFlag };
