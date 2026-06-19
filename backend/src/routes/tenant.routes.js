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
const tips = require('../controllers/tip.controller');
const inventory = require('../controllers/inventory.controller');
const outlet = require('../controllers/outlet.controller');
const uploads = require('../controllers/upload.controller');

router.use(requireAuth, tenantScope);

// Image uploads (pure upload-and-return, no entity mutation)
router.post('/uploads/image', permit('OWNER', 'MANAGER'), upload.single('image'), asyncH(uploads.uploadImage));
router.delete('/uploads/image', permit('OWNER', 'MANAGER'), asyncH(uploads.deleteImage));

// Outlets
router.get('/outlets/table-availability', permit('OWNER', 'MANAGER'), asyncH(outlet.tableAvailability));
router.get('/outlets', permit('OWNER', 'MANAGER'), asyncH(outlet.list));
router.post('/outlets', permit('OWNER'), asyncH(outlet.create));
router.patch('/outlets/:id', permit('OWNER', 'MANAGER'), asyncH(outlet.update));
router.patch('/outlets/:id/toggle', permit('OWNER'), asyncH(outlet.toggleStatus));
router.delete('/outlets/:id', permit('OWNER'), asyncH(outlet.remove));
router.get('/outlets/:id/stats', permit('OWNER', 'MANAGER'), asyncH(outlet.getStats));

// Analytics consolidated (OWNER sees all outlets combined)
router.get('/analytics/consolidated', permit('OWNER', 'MANAGER'), asyncH(analytics.consolidated));

// Tables & QR  (OWNER/MANAGER manage; WAITER can view)
router.get('/tables', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(tables.list));
router.post('/tables', permit('OWNER', 'MANAGER'), asyncH(tables.create));
router.get('/tables/:id/qr', permit('OWNER', 'MANAGER'), asyncH(tables.qrImage));
router.patch('/tables/:id/toggle', permit('OWNER', 'MANAGER'), asyncH(tables.toggleActive));
router.delete('/tables/:id', permit('OWNER'), asyncH(tables.remove));

// Menu
router.get('/menu/categories', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(menu.listCategories));
router.post('/menu/categories', permit('OWNER', 'MANAGER'), asyncH(menu.createCategory));
router.delete('/menu/categories/:id', permit('OWNER', 'MANAGER'), asyncH(menu.deleteCategory));
router.get('/menu/items', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(menu.listItems));
router.post('/menu/items', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(menu.createItem));
router.patch('/menu/items/:id', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(menu.updateItem));
router.delete('/menu/items/:id', permit('OWNER'), asyncH(menu.deleteItem));

// Orders / Kitchen / Billing
router.get('/orders', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(orders.list));
router.get('/orders/workflow-mode', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(orders.workflowMode));
router.get('/orders/kitchen-queue', permit('OWNER', 'MANAGER', 'KITCHEN'), asyncH(orders.kitchenQueue));
router.get('/orders/waiter-queue', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(orders.waiterQueue));
router.patch('/orders/:id/status', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(orders.updateStatus));
router.patch('/orders/:id/items/:itemId/status', permit('OWNER', 'MANAGER', 'WAITER', 'KITCHEN'), asyncH(orders.updateItemStatus));
router.patch('/orders/:id/close', permit('OWNER', 'MANAGER'), asyncH(orders.closeOrder));
router.get('/orders/:id/receipt', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(orders.orderReceipt));
router.post('/payments/mark-paid', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(orders.markPaid));

// Analytics (manager & owner)
router.get('/analytics/sales', permit('OWNER', 'MANAGER'), asyncH(analytics.sales));
router.get('/analytics/items', permit('OWNER', 'MANAGER'), asyncH(analytics.items));
router.get('/analytics/time', permit('OWNER', 'MANAGER'), asyncH(analytics.time));
router.get('/analytics/staff', permit('OWNER', 'MANAGER'), asyncH(analytics.staff));
router.get('/analytics/inventory', permit('OWNER', 'MANAGER'), asyncH(analytics.inventory));

// Advanced owner analytics (rich date ranges, products, categories, tables, staff perf, cancellations)
router.get('/analytics/overview', permit('OWNER', 'MANAGER'), asyncH(analytics.overview));

// Customer analytics
router.get('/analytics/customers/favorites', permit('OWNER', 'MANAGER'), asyncH(customerAnalytics.favorites));
router.get('/analytics/customers/export',    permit('OWNER', 'MANAGER'), asyncH(customerAnalytics.exportFavorites));
router.get('/analytics/customers/:mobile',   permit('OWNER', 'MANAGER'), asyncH(customerAnalytics.customerProfile));

// Restaurant profile (owner can update receipt details, GSTIN, website, service charge)
router.get('/restaurant/profile', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(require('../controllers/restaurant.controller').getProfile));
router.patch('/restaurant/profile', permit('OWNER', 'MANAGER'), asyncH(require('../controllers/restaurant.controller').updateProfile));
router.patch('/restaurant/logo', permit('OWNER'), asyncH(require('../controllers/restaurant.controller').updateLogoUrl));
router.patch('/restaurant/bill-taxes', permit('OWNER'), asyncH(require('../controllers/restaurant.controller').updateBillTaxes));
router.delete('/restaurant/bill-taxes/:taxId', permit('OWNER'), asyncH(require('../controllers/restaurant.controller').deleteBillTax));

// Tips (WAITER sees own; OWNER/MANAGER see all staff tips)
router.get('/tips', permit('OWNER', 'MANAGER', 'WAITER'), asyncH(tips.list));

// Staff management
router.get('/staff', permit('OWNER', 'MANAGER'), asyncH(staff.list));
router.post('/staff', permit('OWNER', 'MANAGER'), asyncH(staff.create));
router.patch('/staff/:id', permit('OWNER', 'MANAGER'), asyncH(staff.update));
router.patch('/staff/:id/toggle', permit('OWNER', 'MANAGER'), asyncH(staff.toggleActive));

// Discounts (OWNER/MANAGER manage; outlet-scoped)
const discounts = require('../controllers/discount.controller');
router.get('/discounts', permit('OWNER', 'MANAGER'), asyncH(discounts.list));
router.get('/discounts/by-customer', permit('OWNER', 'MANAGER'), asyncH(discounts.byCustomer));
router.post('/discounts', permit('OWNER', 'MANAGER'), asyncH(discounts.create));
router.post('/discounts/assign-bulk', permit('OWNER', 'MANAGER'), asyncH(discounts.assignBulk));
router.patch('/discounts/:id', permit('OWNER', 'MANAGER'), asyncH(discounts.update));
router.patch('/discounts/:id/toggle', permit('OWNER', 'MANAGER'), asyncH(discounts.toggle));
router.patch('/discounts/:id/assign', permit('OWNER', 'MANAGER'), asyncH(discounts.assign));
router.delete('/discounts/:id', permit('OWNER', 'MANAGER'), asyncH(discounts.remove));

// Inventory
router.get('/inventory', permit('OWNER', 'MANAGER'), asyncH(inventory.list));
router.post('/inventory', permit('OWNER', 'MANAGER'), asyncH(inventory.create));
router.post('/inventory/:id/move', permit('OWNER', 'MANAGER'), asyncH(inventory.move));
router.get('/inventory/:id/history', permit('OWNER', 'MANAGER'), asyncH(inventory.history));

module.exports = router;
