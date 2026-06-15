const ApiError = require('../utils/ApiError');
const { verifyAccess } = require('../utils/jwt');

/** Requires a valid access token. Attaches req.user = { id, role, restaurantId }. */
function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized('Missing access token'));
  try {
    const payload = verifyAccess(token);
    req.user = { id: payload.sub, role: payload.role, restaurantId: payload.restaurantId || null, outletId: payload.outletId || null };
    next();
  } catch {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

module.exports = { requireAuth };
