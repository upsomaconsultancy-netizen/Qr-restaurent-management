const ApiError = require('../utils/ApiError');

/** Role-based access control. Usage: permit('OWNER','MANAGER') */
function permit(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Insufficient role'));
    next();
  };
}

module.exports = { permit };
