const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Outlet = require('../models/Outlet');
const ApiError = require('../utils/ApiError');
const { tenantMenuFilter } = require('../middleware/tenant');
const { deleteImage } = require('../config/cloudinary');
const { invalidateMenuCache } = require('./public.controller');

async function ownerOutletId(restaurantId) {
  const outlet = await Outlet.findOne({ restaurantId, isDeleted: false }).sort({ createdAt: 1 }).lean();
  return outlet ? outlet._id : null;
}

async function resolveOutletId(req) {
  if (req.user.outletId) return req.user.outletId;
  return ownerOutletId(req.user.restaurantId);
}

// ---- Categories ----
exports.listCategories = async (req, res) => {
  const cats = await Category.find(await tenantMenuFilter(req)).sort('sortOrder').lean();
  res.json({ success: true, data: cats });
};

exports.createCategory = async (req, res) => {
  const outletId = await resolveOutletId(req);
  const cat = await Category.create({
    restaurantId: req.user.restaurantId,
    outletId,
    name: req.body.name,
    parentId: req.body.parentId || null,
    sortOrder: req.body.sortOrder || 0,
    imageUrl: req.body.imageUrl || undefined,
    imagePublicId: req.body.imagePublicId || undefined
  });
  invalidateMenuCache(outletId).catch(() => {});
  res.status(201).json({ success: true, data: cat });
};

exports.deleteCategory = async (req, res) => {
  const menuFilter = await tenantMenuFilter(req);

  const itemCount = await MenuItem.countDocuments({
    ...menuFilter,
    categoryId: req.params.id
  });

  if (itemCount > 0) {
    throw ApiError.conflict(`This category has ${itemCount} item(s) and cannot be deleted. Please move or delete all items in this category first.`);
  }

  const removed = await Category.findOneAndDelete({
    ...menuFilter,
    _id: req.params.id
  });

  if (!removed) throw ApiError.notFound('Category not found. It may have already been deleted.');
  if (removed.imagePublicId) deleteImage(removed.imagePublicId).catch(() => {});
  invalidateMenuCache(removed.outletId).catch(() => {});
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
  if (!name || !price || !categoryId) throw ApiError.badRequest('Item name, price and category are required.');

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
    taxes: safeJson(req.body.taxes, []),
    imageUrl: req.body.imageUrl || undefined,
    imagePublicId: req.body.imagePublicId || undefined
  });

  await item.save();
  invalidateMenuCache(item.outletId).catch(() => {});
  res.status(201).json({ success: true, data: item });
};

exports.updateItem = async (req, res) => {
  const item = await MenuItem.findOne(await tenantMenuFilter(req, { _id: req.params.id }));
  if (!item) throw ApiError.notFound('Menu item not found. It may have already been deleted.');

  const fields = ['name', 'description', 'price', 'foodType', 'spicyLevel', 'prepTimeMinutes', 'categoryId', 'isAvailable'];
  for (const f of fields) if (req.body[f] !== undefined) item[f] = req.body[f];
  if (req.body.variants) item.variants = safeJson(req.body.variants, item.variants);
  if (req.body.addons) item.addons = safeJson(req.body.addons, item.addons);
  if (req.body.taxes) item.taxes = safeJson(req.body.taxes, item.taxes);

  if (req.body.imagePublicId !== undefined && req.body.imagePublicId !== item.imagePublicId) {
    if (item.imagePublicId) await deleteImage(item.imagePublicId).catch(() => {});
    item.imageUrl = req.body.imageUrl || undefined;
    item.imagePublicId = req.body.imagePublicId || undefined;
  }

  await item.save();
  invalidateMenuCache(item.outletId).catch(() => {});
  res.json({ success: true, data: item });
};

exports.deleteItem = async (req, res) => {
  const item = await MenuItem.findOneAndUpdate(
    await tenantMenuFilter(req, { _id: req.params.id }),
    { isDeleted: true }
  );
  if (!item) throw ApiError.notFound('Menu item not found. It may have already been deleted.');
  invalidateMenuCache(item.outletId).catch(() => {});
  res.json({ success: true });
};

const safeJson = (v, fallback) => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v); } catch { return fallback; }
};
