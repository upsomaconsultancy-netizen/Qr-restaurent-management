const Discount = require('../models/Discount');
const Outlet = require('../models/Outlet');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');
const { normalizeMobile } = require('../services/discount.service');

/** Resolve the outlet a discount belongs to (MANAGER pinned to own outlet). */
async function resolveOutletId(req, provided) {
  if (req.user.role === 'MANAGER' && req.user.outletId) return req.user.outletId;
  if (provided) {
    const outlet = await Outlet.findOne({ _id: provided, restaurantId: req.user.restaurantId, isDeleted: false });
    if (!outlet) throw ApiError.notFound('The selected outlet was not found. Please refresh and try again.');
    return provided;
  }
  const outlet = await Outlet.findOne({ restaurantId: req.user.restaurantId, isDeleted: false, status: 'ACTIVE' }).sort({ createdAt: 1 });
  if (!outlet) throw ApiError.badRequest('No active outlet found. Create an outlet before adding discounts.');
  return outlet._id;
}

/** Base tenant + outlet filter (MANAGER pinned to own outlet, OWNER optional ?outletId). */
function scopeFilter(req) {
  const filter = { restaurantId: req.user.restaurantId, isDeleted: false };
  if (req.user.role === 'MANAGER' && req.user.outletId) filter.outletId = req.user.outletId;
  else if (req.query.outletId) filter.outletId = req.query.outletId;
  return filter;
}

/** Categorize a discount for the UI: ACTIVE | INACTIVE | EXPIRED.
 *  Start/expiry are treated as whole-day boundaries so a discount that starts
 *  "today" is active immediately and one expiring "today" is valid all day. */
function statusOf(d, now = new Date()) {
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  if (d.expiryDate && new Date(d.expiryDate) < todayStart) return 'EXPIRED';
  if (!d.isActive) return 'INACTIVE';
  if (d.startDate && new Date(d.startDate) > todayEnd) return 'INACTIVE'; // not started yet
  return 'ACTIVE';
}

exports.list = async (req, res) => {
  const docs = await Discount.find(scopeFilter(req)).sort('-createdAt').lean();
  const now = new Date();
  const rows = docs.map((d) => ({ ...d, status: statusOf(d, now), assignedCount: (d.assignedMobiles || []).length }));
  res.json({
    success: true,
    data: {
      all: rows,
      active:   rows.filter((r) => r.status === 'ACTIVE'),
      inactive: rows.filter((r) => r.status === 'INACTIVE'),
      expired:  rows.filter((r) => r.status === 'EXPIRED')
    }
  });
};

exports.create = async (req, res) => {
  const { name, type, value, startDate, expiryDate, assignedMobiles } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Discount name is required.');
  if (!['PERCENTAGE', 'FLAT'].includes(type)) throw ApiError.badRequest('Discount type must be PERCENTAGE or FLAT.');
  const val = Number(value);
  if (!(val > 0)) throw ApiError.badRequest('Discount value must be greater than zero.');
  if (type === 'PERCENTAGE' && val > 100) throw ApiError.badRequest('A percentage discount cannot exceed 100%.');

  const outletId = await resolveOutletId(req, req.body.outletId);
  const mobiles = [...new Set((assignedMobiles || []).map(normalizeMobile).filter(Boolean))];

  const discount = await Discount.create({
    restaurantId: req.user.restaurantId,
    outletId,
    name: name.trim(),
    type,
    value: val,
    startDate: startDate ? new Date(startDate) : null,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    assignedMobiles: mobiles,
    createdBy: req.user.id
  });

  audit({ req, action: 'DISCOUNT_CREATED', entity: 'Discount', entityId: discount._id, meta: { name, type, value: val } });
  res.status(201).json({ success: true, data: discount });
};

exports.update = async (req, res) => {
  const discount = await Discount.findOne({ ...scopeFilter(req), _id: req.params.id });
  if (!discount) throw ApiError.notFound('Discount not found. It may have been removed.');

  const { name, type, value, startDate, expiryDate, isActive } = req.body;
  if (name !== undefined) discount.name = String(name).trim();
  if (type !== undefined) {
    if (!['PERCENTAGE', 'FLAT'].includes(type)) throw ApiError.badRequest('Discount type must be PERCENTAGE or FLAT.');
    discount.type = type;
  }
  if (value !== undefined) {
    const val = Number(value);
    if (!(val > 0)) throw ApiError.badRequest('Discount value must be greater than zero.');
    if ((type || discount.type) === 'PERCENTAGE' && val > 100) throw ApiError.badRequest('A percentage discount cannot exceed 100%.');
    discount.value = val;
  }
  if (startDate !== undefined) discount.startDate = startDate ? new Date(startDate) : null;
  if (expiryDate !== undefined) discount.expiryDate = expiryDate ? new Date(expiryDate) : null;
  if (isActive !== undefined) discount.isActive = !!isActive;

  await discount.save();
  audit({ req, action: 'DISCOUNT_UPDATED', entity: 'Discount', entityId: discount._id });
  res.json({ success: true, data: discount });
};

exports.toggle = async (req, res) => {
  const discount = await Discount.findOne({ ...scopeFilter(req), _id: req.params.id });
  if (!discount) throw ApiError.notFound('Discount not found. It may have been removed.');
  discount.isActive = !discount.isActive;
  await discount.save();
  audit({ req, action: 'DISCOUNT_TOGGLED', entity: 'Discount', entityId: discount._id, meta: { isActive: discount.isActive } });
  res.json({ success: true, data: { id: discount._id, isActive: discount.isActive } });
};

exports.remove = async (req, res) => {
  const discount = await Discount.findOne({ ...scopeFilter(req), _id: req.params.id });
  if (!discount) throw ApiError.notFound('Discount not found. It may have been removed.');
  discount.isDeleted = true;
  await discount.save();
  audit({ req, action: 'DISCOUNT_DELETED', entity: 'Discount', entityId: discount._id });
  res.json({ success: true, data: { id: discount._id } });
};

/**
 * Assign a discount to one or more customer mobiles (bulk or individual).
 * PATCH /discounts/:id/assign  body: { mobiles: [], mode: 'add' | 'remove' | 'set' }
 */
exports.assign = async (req, res) => {
  const discount = await Discount.findOne({ ...scopeFilter(req), _id: req.params.id });
  if (!discount) throw ApiError.notFound('Discount not found. It may have been removed.');

  const incoming = [...new Set((req.body.mobiles || []).map(normalizeMobile).filter(Boolean))];
  const mode = req.body.mode || 'add';
  const current = new Set(discount.assignedMobiles || []);

  if (mode === 'set') discount.assignedMobiles = incoming;
  else if (mode === 'remove') discount.assignedMobiles = [...current].filter((m) => !incoming.includes(m));
  else { incoming.forEach((m) => current.add(m)); discount.assignedMobiles = [...current]; }

  await discount.save();
  audit({ req, action: 'DISCOUNT_ASSIGNED', entity: 'Discount', entityId: discount._id, meta: { mode, count: incoming.length } });
  res.json({ success: true, data: { id: discount._id, assignedMobiles: discount.assignedMobiles } });
};

/**
 * Bulk-assign one discount to many mobiles at once (from the Favourites screen).
 * POST /discounts/assign-bulk  body: { discountId, mobiles: [] }
 */
exports.assignBulk = async (req, res) => {
  const { discountId, mobiles } = req.body;
  if (!discountId) throw ApiError.badRequest('Please choose a discount to assign.');
  const list = [...new Set((mobiles || []).map(normalizeMobile).filter(Boolean))];
  if (!list.length) throw ApiError.badRequest('Select at least one customer to assign a discount.');

  const discount = await Discount.findOne({ ...scopeFilter(req), _id: discountId });
  if (!discount) throw ApiError.notFound('Discount not found. It may have been removed.');

  const set = new Set(discount.assignedMobiles || []);
  list.forEach((m) => set.add(m));
  discount.assignedMobiles = [...set];
  await discount.save();

  audit({ req, action: 'DISCOUNT_ASSIGNED', entity: 'Discount', entityId: discount._id, meta: { mode: 'bulk', count: list.length } });
  res.json({ success: true, data: { id: discount._id, assignedMobiles: discount.assignedMobiles } });
};

/** Map of mobile -> assigned discounts, so the Favourites UI can show badges. */
exports.byCustomer = async (req, res) => {
  const docs = await Discount.find(scopeFilter(req)).lean();
  const now = new Date();
  const map = {};
  for (const d of docs) {
    const status = statusOf(d, now);
    for (const m of (d.assignedMobiles || [])) {
      (map[m] = map[m] || []).push({ id: d._id, name: d.name, type: d.type, value: d.value, status });
    }
  }
  res.json({ success: true, data: map });
};
