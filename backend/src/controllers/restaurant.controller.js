const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');
const { uploadImage, deleteImage } = require('../config/cloudinary');

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

exports.uploadLogo = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file was uploaded. Please select an image and try again.');

  const restaurant = await Restaurant.findById(req.user.restaurantId);
  if (!restaurant) throw ApiError.notFound('Restaurant not found. Please contact your administrator.');

  if (restaurant.logoPublicId) {
    await deleteImage(restaurant.logoPublicId).catch(() => {});
  }

  let result;
  try {
    result = await uploadImage(req.file.buffer, `ros/${restaurant._id}/logo`);
  } catch (err) {
    console.error('[uploadLogo] Cloudinary error:', err?.message || err);
    throw new ApiError(500, 'Image upload failed. Please check your internet connection and try again.');
  }

  restaurant.logoUrl = result.secure_url;
  restaurant.logoPublicId = result.public_id;
  await restaurant.save();

  audit({ req, action: 'RESTAURANT_LOGO_UPDATED', entity: 'Restaurant', entityId: restaurant._id });
  res.json({ success: true, data: { logoUrl: restaurant.logoUrl } });
};
