const router = require('express').Router();
const asyncH = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const { permit } = require('../middleware/rbac');
const { tenantScope } = require('../middleware/tenant');
const { upload } = require('../middleware/upload');

const tables = require('../controllers/table.controller');
const menu = require('../controllers/menu.controller');
const orders = require('../controllers/order.controller');
const analytics = require('../controllers/analytics.controller');
const customerAnalytics = require('../controllers/customerAnalytics.controller');
const staff = require('../controllers/staff.controller');
const inventory = require('../controllers/inventory.controller');

router.use(requireAuth, tenantScope);

// Tables & QR  (OWNER/MANAGER manage; WAITER can view)
router.get('/tables', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(tables.list));
router.post('/tables', permit('OWNER', 'MANAGER'), asyncH(tables.create));
router.get('/tables/:id/qr', permit('OWNER', 'MANAGER'), asyncH(tables.qrImage));
router.patch('/tables/:id/toggle', permit('OWNER', 'MANAGER'), asyncH(tables.toggleActive));
router.delete('/tables/:id', permit('OWNER'), asyncH(tables.remove));

// Menu
router.get('/menu/categories', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(menu.listCategories));
router.post('/menu/categories', permit('OWNER', 'MANAGER'), asyncH(menu.createCategory));
router.delete('/menu/categories/:id', permit('OWNER'), asyncH(menu.deleteCategory));
router.get('/menu/items', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(menu.listItems));
router.post('/menu/items', permit('OWNER', 'MANAGER', 'WAITER'), upload.single('image'), asyncH(menu.createItem));
router.patch('/menu/items/:id', permit('OWNER', 'MANAGER', 'WAITER'), upload.single('image'), asyncH(menu.updateItem));
router.delete('/menu/items/:id', permit('OWNER'), asyncH(menu.deleteItem));

// Orders / Kitchen / Billing
router.get('/orders', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(orders.list));
router.get('/orders/kitchen-queue', permit('OWNER', 'MANAGER', 'KITCHEN'), asyncH(orders.kitchenQueue));
router.patch('/orders/:id/status', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(orders.updateStatus));
router.patch('/orders/:id/items/:itemId/status', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(orders.updateItemStatus));
router.get('/orders/:id/receipt', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(orders.orderReceipt));
router.post('/payments/mark-paid', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(orders.markPaid));

// Analytics (manager & owner)
router.get('/analytics/sales', permit('OWNER', 'MANAGER'), asyncH(analytics.sales));
router.get('/analytics/items', permit('OWNER', 'MANAGER'), asyncH(analytics.items));
router.get('/analytics/time', permit('OWNER', 'MANAGER'), asyncH(analytics.time));
router.get('/analytics/staff', permit('OWNER', 'MANAGER'), asyncH(analytics.staff));
router.get('/analytics/inventory', permit('OWNER', 'MANAGER'), asyncH(analytics.inventory));

// Customer analytics
router.get('/analytics/customers/favorites', permit('OWNER', 'MANAGER'), asyncH(customerAnalytics.favorites));
router.get('/analytics/customers/export',    permit('OWNER', 'MANAGER'), asyncH(customerAnalytics.exportFavorites));
router.get('/analytics/customers/:mobile',   permit('OWNER', 'MANAGER'), asyncH(customerAnalytics.customerProfile));

// Restaurant profile (owner can update receipt details, GSTIN, website, service charge)
router.get('/restaurant/profile', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(require('../controllers/restaurant.controller').getProfile));
router.patch('/restaurant/profile', permit('OWNER', 'MANAGER'), asyncH(require('../controllers/restaurant.controller').updateProfile));

// Staff management
router.get('/staff', permit('OWNER', 'MANAGER'), asyncH(staff.list));
router.post('/staff', permit('OWNER', 'MANAGER'), asyncH(staff.create));
router.patch('/staff/:id', permit('OWNER', 'MANAGER'), asyncH(staff.update));
router.patch('/staff/:id/toggle', permit('OWNER', 'MANAGER'), asyncH(staff.toggleActive));

// Inventory
router.get('/inventory', permit('OWNER', 'MANAGER'), asyncH(inventory.list));
router.post('/inventory', permit('OWNER', 'MANAGER'), asyncH(inventory.create));
router.post('/inventory/:id/move', permit('OWNER', 'MANAGER'), asyncH(inventory.move));
router.get('/inventory/:id/history', permit('OWNER', 'MANAGER'), asyncH(inventory.history));

module.exports = router;
