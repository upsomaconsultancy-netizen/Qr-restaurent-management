const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const ApiError = require('../utils/ApiError');
const { tenantFilter } = require('../middleware/tenant');

exports.list = async (req, res) => {
  const items = await InventoryItem.find(tenantFilter(req)).sort('name').lean();
  res.json({ success: true, data: items });
};

exports.create = async (req, res) => {
  const { name, unit, lowStockThreshold, supplier } = req.body;
  if (!name) throw ApiError.badRequest('name required');
  const item = await InventoryItem.create({
    restaurantId: req.user.restaurantId, name, unit, lowStockThreshold, supplier
  });
  res.status(201).json({ success: true, data: item });
};

/** Record a stock movement (purchase / adjustment / wastage). */
exports.move = async (req, res) => {
  const { type, qty, cost, note } = req.body;
  if (!['PURCHASE', 'ADJUSTMENT', 'WASTAGE'].includes(type)) throw ApiError.badRequest('Invalid movement type');
  const item = await InventoryItem.findOne(tenantFilter(req, { _id: req.params.id }));
  if (!item) throw ApiError.notFound('Inventory item not found');

  const signedQty = type === 'WASTAGE' ? -Math.abs(qty) : qty;
  item.currentStock += signedQty;
  await item.save();
  const movement = await StockMovement.create({
    restaurantId: req.user.restaurantId, inventoryItemId: item._id,
    type, qty: signedQty, cost, note, userId: req.user.id
  });
  res.status(201).json({ success: true, data: { item, movement } });
};

exports.history = async (req, res) => {
  const moves = await StockMovement.find({ restaurantId: req.user.restaurantId, inventoryItemId: req.params.id })
    .sort('-createdAt').limit(200).lean();
  res.json({ success: true, data: moves });
};
