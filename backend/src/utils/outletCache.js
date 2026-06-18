const redis = require('../config/redis');
const Outlet = require('../models/Outlet');

// Short TTL on purpose: a deactivated outlet must stop accepting logins within
// seconds even if an explicit invalidation is ever missed. login/refresh read
// this cached flag instead of hitting MongoDB on every attempt.
const OUTLET_STATUS_TTL = 30; // seconds
const statusKey = (outletId) => `auth:outlet:active:${outletId}`;

/**
 * True if the outlet exists, is not deleted, and is ACTIVE.
 * Result (positive and negative) is cached in Redis with a short TTL so the
 * MANAGER/WAITER/KITCHEN outlet gate on login/refresh avoids a DB round-trip.
 * Degrades gracefully to a direct DB read if Redis is down.
 */
async function isOutletActive(outletId) {
  if (!outletId) return false;
  const key = statusKey(outletId);

  const cached = await redis.safeGet(key);
  if (cached !== null) return cached === '1';

  const outlet = await Outlet.findOne({ _id: outletId, isDeleted: false })
    .select('status')
    .lean();
  const active = !!outlet && outlet.status === 'ACTIVE';
  redis.safeSetex(key, OUTLET_STATUS_TTL, active ? '1' : '0');
  return active;
}

/** Drop the cached status so a toggle/delete takes effect immediately. */
async function invalidateOutletStatus(outletId) {
  if (outletId) await redis.safeDel(statusKey(outletId));
}

module.exports = { isOutletActive, invalidateOutletStatus };
