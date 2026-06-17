const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');
const { deleteImage } = require('../config/cloudinary');

exports.getProfile = async (req, res) => {
  const r = await Restaurant.findById(req.user.restaurantId).lean();
  if (!r) throw ApiError.notFound('Restaurant profile not found. Please contact your administrator.');
  res.json({ success: true, data: r });
};

exports.updateProfile = async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'gstin', 'website', 'email', 'serviceChargePercent'];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  if (update.phone && update.phone.length < 7) throw ApiError.badRequest('Please enter a valid phone number (at least 7 digits).');
  if (update.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(update.gstin)) {
    throw ApiError.badRequest('Invalid GSTIN format. Please enter a valid 15-character GSTIN.');
  }
  if (update.serviceChargePercent !== undefined) {
    const sc = parseFloat(update.serviceChargePercent);
    if (isNaN(sc) || sc < 0 || sc > 30) throw ApiError.badRequest('Service charge must be between 0% and 30%.');
    update.serviceChargePercent = sc;
  }

  const r = await Restaurant.findByIdAndUpdate(req.user.restaurantId, update, { new: true });
  if (!r) throw ApiError.notFound('Restaurant profile not found. Please contact your administrator.');

  audit({ req, action: 'RESTAURANT_PROFILE_UPDATED', entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r });
};

exports.updateBillTaxes = async (req, res) => {
  const { billTaxes } = req.body;
  if (!Array.isArray(billTaxes)) throw ApiError.badRequest('billTaxes must be an array.');

  for (const t of billTaxes) {
    if (!t.name || typeof t.name !== 'string') throw ApiError.badRequest('Each tax must have a name.');
    if (typeof t.rate !== 'number' || t.rate < 0) throw ApiError.badRequest(`Tax "${t.name}" rate must be a non-negative number.`);
    if (!['PERCENTAGE', 'FLAT'].includes(t.type)) throw ApiError.badRequest(`Tax "${t.name}" type must be PERCENTAGE or FLAT.`);
  }

  const r = await Restaurant.findByIdAndUpdate(
    req.user.restaurantId,
    { $set: { billTaxes } },
    { new: true }
  );
  if (!r) throw ApiError.notFound('Restaurant not found.');
  audit({ req, action: 'BILL_TAXES_UPDATED', entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r.billTaxes });
};

exports.updateLogoUrl = async (req, res) => {
  const { logoUrl, logoPublicId } = req.body;
  if (!logoUrl || !logoPublicId) throw ApiError.badRequest('logoUrl and logoPublicId are required.');

  const restaurant = await Restaurant.findById(req.user.restaurantId);
  if (!restaurant) throw ApiError.notFound('Restaurant not found. Please contact your administrator.');

  if (restaurant.logoPublicId && restaurant.logoPublicId !== logoPublicId) {
    await deleteImage(restaurant.logoPublicId).catch(() => {});
  }

  restaurant.logoUrl = logoUrl;
  restaurant.logoPublicId = logoPublicId;
  await restaurant.save();

  audit({ req, action: 'RESTAURANT_LOGO_UPDATED', entity: 'Restaurant', entityId: restaurant._id });
  res.json({ success: true, data: { logoUrl: restaurant.logoUrl } });
};

exports.deleteBillTax = async (req, res) => {
  const r = await Restaurant.findById(req.user.restaurantId);
  if (!r) throw ApiError.notFound('Restaurant not found.');

  const before = r.billTaxes.length;
  r.billTaxes = r.billTaxes.filter((t) => String(t._id) !== req.params.taxId);
  if (r.billTaxes.length === before) throw ApiError.notFound('Tax not found. It may have already been deleted.');

  await r.save();
  audit({ req, action: 'BILL_TAX_DELETED', entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r.billTaxes });
};
