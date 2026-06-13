const InventoryItem = require('../models/InventoryItem');
const StockMovement = require('../models/StockMovement');
const MenuItem = require('../models/MenuItem');

/** Auto-consume raw materials when an order is accepted by the kitchen. */
async function consumeForOrder(order) {
  for (const line of order.items) {
    const menuItem = await MenuItem.findById(line.menuItemId).lean();
    if (!menuItem || !menuItem.recipe || !menuItem.recipe.length) continue;
    for (const ing of menuItem.recipe) {
      const qty = (ing.qty || 0) * line.qty;
      if (!qty) continue;
      await InventoryItem.updateOne({ _id: ing.inventoryItemId }, { $inc: { currentStock: -qty } });
      await StockMovement.create({
        restaurantId: order.restaurantId,
        inventoryItemId: ing.inventoryItemId,
        type: 'CONSUMPTION',
        qty: -qty,
        orderId: order._id,
        note: `Auto consumption for order #${order.orderNumber}`
      });
    }
  }
}

module.exports = { consumeForOrder };
