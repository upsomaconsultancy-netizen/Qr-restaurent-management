const ApiError = require('../utils/ApiError');
const Restaurant = require('../models/Restaurant');

/**
 * Tenant isolation middleware.
 * - SUPER_ADMIN: no tenant context (manages all tenants through /api/admin).
 * - Everyone else: restaurantId comes ONLY from the verified JWT, never from
 *   the request body/query, so a tenant can never address another tenant's data.
 * Also blocks suspended/deleted restaurants.
 */
async function tenantScope(req, _res, next) {
  try {
    if (req.user.role === 'SUPER_ADMIN') return next();
    if (!req.user.restaurantId) throw ApiError.forbidden('No tenant context');

    const restaurant = await Restaurant.findOne({
      _id: req.user.restaurantId,
      isDeleted: false
    }).lean();
    if (!restaurant) throw ApiError.forbidden('Restaurant not found');
    if (restaurant.status !== 'ACTIVE') throw ApiError.forbidden('Restaurant is suspended');

    req.tenant = restaurant;
    next();
  } catch (e) {
    next(e);
  }
}

/** Helper: every tenant query MUST be built through this. */
function tenantFilter(req, extra = {}) {
  return { restaurantId: req.user.restaurantId, isDeleted: { $ne: true }, ...extra };
}

module.exports = { tenantScope, tenantFilter };
