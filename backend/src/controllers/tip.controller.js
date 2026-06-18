const Tip = require('../models/Tip');
const { tenantFilter } = require('../middleware/tenant');

/**
 * GET /api/tenant/tips
 * - WAITER: only the tips credited to them.
 * - MANAGER/OWNER: all tips for their scope (outlet for MANAGER, all/?outletId for OWNER).
 * Returns rows for the staff tips table + a running total.
 */
exports.list = async (req, res) => {
  const filter = tenantFilter(req);
  if (req.user.role === 'WAITER') filter.waiterId = req.user.id;

  const tips = await Tip.find(filter)
    .sort('-createdAt')
    .limit(parseInt(req.query.limit, 10) || 300)
    .lean();

  const total = Math.round(tips.reduce((s, t) => s + (t.amount || 0), 0) * 100) / 100;
  res.json({ success: true, data: { tips, total } });
};
