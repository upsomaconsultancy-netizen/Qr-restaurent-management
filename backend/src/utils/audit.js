const AuditLog = require('../models/AuditLog');

/** Fire-and-forget audit trail writer. */
function audit({ req, restaurantId, action, entity, entityId, meta }) {
  AuditLog.create({
    restaurantId: restaurantId || req?.user?.restaurantId || null,
    userId: req?.user?.id || null,
    role: req?.user?.role || 'CUSTOMER',
    action,
    entity,
    entityId,
    ip: req?.ip,
    userAgent: req?.headers?.['user-agent'],
    meta
  }).catch((e) => console.error('[audit] failed', e.message));
}

module.exports = { audit };
