const ApiError = require('../utils/ApiError');
const Restaurant = require('../models/Restaurant');
const Outlet = require('../models/Outlet');
const redis = require('../config/redis');

// OWNER's "home" outlet = first created outlet (Main Branch)
async function ownerMainOutletId(restaurantId) {
  const o = await Outlet.findOne({ restaurantId, isDeleted: false }).sort({ createdAt: 1 }).lean();
  return o ? o._id : null;
}

// ── Tenant doc cache ────────────────────────────────────────────────────
// tenantScope runs on every authenticated staff request, so re-reading the
// restaurant document each time is pure overhead — it changes only on
// suspend/activate/plan edits. Cache it in Valkey with a short TTL so a
// suspension still takes effect within seconds even without invalidation.
const TENANT_CACHE_TTL = 30; // seconds
const tenantCacheKey = (restaurantId) => `tenant:restaurant:${restaurantId}`;

async function getCachedRestaurant(restaurantId) {
  const key = tenantCacheKey(restaurantId);
  const cached = await redis.safeGet(key);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through to DB */ }
  }
  const restaurant = await Restaurant.findOne({ _id: restaurantId, isDeleted: false }).lean();
  if (restaurant) redis.safeSetex(key, TENANT_CACHE_TTL, JSON.stringify(restaurant));
  return restaurant;
}

/** Invalidate the cached restaurant doc immediately after a status/plan change. */
async function invalidateTenantCache(restaurantId) {
  await redis.safeDel(tenantCacheKey(restaurantId));
}

/**
 * Tenant isolation middleware.
 * - SUPER_ADMIN: no tenant context (manages all tenants through /api/admin).
 * - OWNER/MANAGER: scoped to restaurant; sees all outlets.
 * - WAITER/KITCHEN: scoped to both restaurant AND their assigned outlet.
 */
async function tenantScope(req, _res, next) {
  try {
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (!req.user.restaurantId) throw ApiError.forbidden('No tenant context');

    const restaurant = await getCachedRestaurant(req.user.restaurantId);
    if (!restaurant) throw ApiError.forbidden('Restaurant not found', 'RESTAURANT_NOT_FOUND');
    if (restaurant.status !== 'ACTIVE') throw ApiError.forbidden('Restaurant is suspended. Please contact support.', 'RESTAURANT_SUSPENDED');

    req.tenant = restaurant;

    // WAITER/KITCHEN must have a valid active outlet assigned
    if (['WAITER', 'KITCHEN'].includes(req.user.role)) {
      if (!req.user.outletId) throw ApiError.forbidden('No outlet assigned to this account', 'NO_OUTLET_ASSIGNED');
      const outlet = await Outlet.findOne({
        _id: req.user.outletId,
        restaurantId: req.user.restaurantId,
        isDeleted: false
      }).lean();
      if (!outlet) throw ApiError.forbidden('Outlet not found. Please contact your main branch.', 'OUTLET_NOT_FOUND');
      if (outlet.status !== 'ACTIVE') throw ApiError.forbidden('This outlet has been deactivated. Please contact your main branch.', 'OUTLET_INACTIVE');
      req.outlet = outlet;
    }

    next();
  } catch (e) {
    next(e);
  }
}

/**
 * Standard tenant filter — strict outlet isolation.
 * - OWNER/MANAGER: restaurantId only, outletId = null (their own items, no outlet leak).
 * - WAITER/KITCHEN: restaurantId + their outletId (only their outlet's data).
 */
function tenantFilter(req, extra = {}) {
  const base = { restaurantId: req.user.restaurantId, isDeleted: { $ne: true }, ...extra };
  if (['WAITER', 'KITCHEN'].includes(req.user.role)) {
    // Outlet-scoped staff: always their outlet only
    base.outletId = req.user.outletId;
  } else if (req.user.role === 'MANAGER' && req.user.outletId) {
    // MANAGER assigned to an outlet: scoped to their outlet
    base.outletId = req.user.outletId;
  } else if (req.user.role === 'OWNER') {
    // OWNER: all outlets, optionally filtered by ?outletId=
    const qOutletId = req.query.outletId;
    if (qOutletId) base.outletId = qOutletId;
  }
  return base;
}

/**
 * Menu filter — complete isolation between Owner menu and Outlet menus.
 * - OWNER/MANAGER with no ?outletId: sees only restaurant-level items (outletId=null).
 * - OWNER/MANAGER with ?outletId: sees only that outlet's items.
 * - WAITER/KITCHEN: sees only their outlet's items (outletId = their outletId).
 * No cross-contamination between owner items and outlet items.
 */
async function tenantMenuFilter(req, extra = {}) {
  const base = { restaurantId: req.user.restaurantId, isDeleted: { $ne: true }, ...extra };
  if (['WAITER', 'KITCHEN', 'MANAGER'].includes(req.user.role) && req.user.outletId) {
    // Outlet staff see only their outlet's items
    base.outletId = req.user.outletId;
  } else {
    // OWNER: ?outletId= to view a specific outlet, otherwise show Main Branch items
    const qOutletId = req.query.outletId;
    if (qOutletId) {
      base.outletId = qOutletId;
    } else {
      base.outletId = await ownerMainOutletId(req.user.restaurantId);
    }
  }
  return base;
}

module.exports = { tenantScope, tenantFilter, tenantMenuFilter, invalidateTenantCache };
