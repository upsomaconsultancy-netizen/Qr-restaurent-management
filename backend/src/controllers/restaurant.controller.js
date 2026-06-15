const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/ApiError');
const { audit } = require('../utils/audit');
const { uploadImage, deleteImage } = require('../config/cloudinary');

exports.getProfile = async (req, res) => {
  const r = await Restaurant.findById(req.user.restaurantId).lean();
  if (!r) throw ApiError.notFound('Restaurant not found');
  res.json({ success: true, data: r });
};

exports.updateProfile = async (req, res) => {
  const allowed = ['name', 'phone', 'address', 'gstin', 'website', 'email', 'serviceChargePercent'];
  const update = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  if (update.phone && update.phone.length < 7) throw ApiError.badRequest('Invalid phone number');
  if (update.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(update.gstin)) {
    throw ApiError.badRequest('Invalid GSTIN format');
  }
  if (update.serviceChargePercent !== undefined) {
    const sc = parseFloat(update.serviceChargePercent);
    if (isNaN(sc) || sc < 0 || sc > 30) throw ApiError.badRequest('Service charge must be 0–30%');
    update.serviceChargePercent = sc;
  }

  const r = await Restaurant.findByIdAndUpdate(req.user.restaurantId, update, { new: true });
  if (!r) throw ApiError.notFound('Restaurant not found');

  audit({ req, action: 'RESTAURANT_PROFILE_UPDATED', entity: 'Restaurant', entityId: r._id });
  res.json({ success: true, data: r });
};

exports.uploadLogo = async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No image file provided');

  const restaurant = await Restaurant.findById(req.user.restaurantId);
  if (!restaurant) throw ApiError.notFound('Restaurant not found');

  if (restaurant.logoPublicId) {
    await deleteImage(restaurant.logoPublicId).catch(() => {});
  }

  const result = await uploadImage(req.file.buffer, `ros/${restaurant._id}/logo`);
  restaurant.logoUrl = result.secure_url;
  restaurant.logoPublicId = result.public_id;
  await restaurant.save();

  audit({ req, action: 'RESTAURANT_LOGO_UPDATED', entity: 'Restaurant', entityId: restaurant._id });
  res.json({ success: true, data: { logoUrl: restaurant.logoUrl } });
};
