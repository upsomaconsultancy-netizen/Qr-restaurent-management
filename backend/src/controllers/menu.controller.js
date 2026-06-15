const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Outlet = require('../models/Outlet');
const ApiError = require('../utils/ApiError');
const { tenantMenuFilter } = require('../middleware/tenant');
const { uploadImage, deleteImage } = require('../config/cloudinary');

// For OWNER: resolve their outletId = Main Branch (first created outlet for this restaurant)
async function ownerOutletId(restaurantId) {
  const outlet = await Outlet.findOne({ restaurantId, isDeleted: false }).sort({ createdAt: 1 }).lean();
  return outlet ? outlet._id : null;
}

// Get the outletId to use when saving menu items/categories:
// - WAITER/KITCHEN/MANAGER: their own outlet from JWT
// - OWNER: Main Branch outlet
async function resolveOutletId(req) {
  if (req.user.outletId) return req.user.outletId;
  return ownerOutletId(req.user.restaurantId);
}

// ---- Categories ----
exports.listCategories = async (req, res) => {
  const cats = await Category.find(await await tenantMenuFilter(req)).sort('sortOrder').lean();
  res.json({ success: true, data: cats });
};

exports.createCategory = async (req, res) => {
  const outletId = await resolveOutletId(req);
  const cat = await Category.create({
    restaurantId: req.user.restaurantId,
    outletId,
    name: req.body.name,
    parentId: req.body.parentId || null,
    sortOrder: req.body.sortOrder || 0
  });
  res.status(201).json({ success: true, data: cat });
};

exports.deleteCategory = async (req, res) => {
  const menuFilter = await tenantMenuFilter(req);

  const itemCount = await MenuItem.countDocuments({
    ...menuFilter,
    categoryId: req.params.id
  });

  if (itemCount > 0) {
    throw ApiError.conflict('Category has items and cannot be deleted');
  }

  const removed = await Category.findOneAndDelete({
    ...menuFilter,
    _id: req.params.id
  });

  if (!removed) throw ApiError.notFound('Category not found');
  res.json({ success: true });
};

// ---- Items ----
exports.listItems = async (req, res) => {
  const filter = await tenantMenuFilter(req);
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  const items = await MenuItem.find(filter).sort('name').lean();
  res.json({ success: true, data: items });
};

exports.createItem = async (req, res) => {
  const { name, price, categoryId } = req.body;
  if (!name || !price || !categoryId) throw ApiError.badRequest('name, price, categoryId required');

  const outletId = await resolveOutletId(req);
  const item = new MenuItem({
    restaurantId: req.user.restaurantId,
    outletId,
    categoryId,
    name,
    description: req.body.description,
    price,
    foodType: req.body.foodType || 'VEG',
    spicyLevel: req.body.spicyLevel || 0,
    prepTimeMinutes: req.body.prepTimeMinutes || 15,
    variants: safeJson(req.body.variants, []),
    addons: safeJson(req.body.addons, []),
    taxes: safeJson(req.body.taxes, [])
  });

  if (req.file) {
    const result = await uploadImage(req.file.buffer, `ros/${req.user.restaurantId}/menu`);
    item.imageUrl = result.secure_url;
    item.imagePublicId = result.public_id;
  }

  await item.save();
  res.status(201).json({ success: true, data: item });
};

exports.updateItem = async (req, res) => {
  const item = await MenuItem.findOne(tenantMenuFilter(req, { _id: req.params.id }));
  if (!item) throw ApiError.notFound('Item not found');

  const fields = ['name', 'description', 'price', 'foodType', 'spicyLevel', 'prepTimeMinutes', 'categoryId', 'isAvailable'];
  for (const f of fields) if (req.body[f] !== undefined) item[f] = req.body[f];
  if (req.body.variants) item.variants = safeJson(req.body.variants, item.variants);
  if (req.body.addons) item.addons = safeJson(req.body.addons, item.addons);
  if (req.body.taxes) item.taxes = safeJson(req.body.taxes, item.taxes);

  if (req.file) {
    if (item.imagePublicId) await deleteImage(item.imagePublicId).catch(() => {});
    const result = await uploadImage(req.file.buffer, `ros/${req.user.restaurantId}/menu`);
    item.imageUrl = result.secure_url;
    item.imagePublicId = result.public_id;
  }

  await item.save();
  res.json({ success: true, data: item });
};

exports.deleteItem = async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    tenantMenuFilter(req, { _id: req.params.id }),
    { isDeleted: true }
  );
  if (!item) throw ApiError.notFound('Item not found');
  res.json({ success: true });
};

const safeJson = (v, fallback) => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return fallback; }
};
