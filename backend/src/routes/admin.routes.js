const router = require('express').Router();
const asyncH = require('../utils/asyncHandler');
const ctrl = require('../controllers/admin.controller');
const leadCtrl = require('../controllers/lead.controller');
const { requireAuth } = require('../middleware/auth');
const { permit } = require('../middleware/rbac');
const { upload } = require('../middleware/upload');

router.use(requireAuth, permit('SUPER_ADMIN'));

router.get('/stats', asyncH(ctrl.platformStats));
router.get('/restaurants', asyncH(ctrl.listRestaurants));
router.post('/restaurants', asyncH(ctrl.createRestaurant));
router.get('/restaurants/:id', asyncH(ctrl.getRestaurant));
router.patch('/restaurants/:id', asyncH(ctrl.updateRestaurant));
router.patch('/restaurants/:id/logo', upload.single('logo'), asyncH(ctrl.uploadLogo));
router.patch('/restaurants/:id/status', asyncH(ctrl.setStatus));
router.patch('/restaurants/:id/table-limit', asyncH(ctrl.setTableLimit));
router.patch('/restaurants/:id/plan', asyncH(ctrl.setPlan));
router.delete('/restaurants/:id', asyncH(ctrl.softDelete));

router.get('/restaurants/:id/users', asyncH(ctrl.listRestaurantUsers));
router.post('/restaurants/:id/users', asyncH(ctrl.createRestaurantUser));
router.patch('/restaurants/:id/users/:userId', asyncH(ctrl.updateRestaurantUser));

// Admin outlet management
router.get('/restaurants/:id/outlets', asyncH(ctrl.listOutlets));
router.post('/restaurants/:id/outlets', asyncH(ctrl.createOutlet));
router.patch('/restaurants/:id/outlets/:oid', asyncH(ctrl.updateOutlet));
router.patch('/restaurants/:id/outlets/:oid/status', asyncH(ctrl.setOutletStatus));
router.delete('/restaurants/:id/outlets/:oid', asyncH(ctrl.deleteOutlet));

// Demo / sales leads from the marketing landing page
router.get('/leads', asyncH(leadCtrl.list));
router.patch('/leads/:id', asyncH(leadCtrl.update));
router.delete('/leads/:id', asyncH(leadCtrl.remove));

module.exports = router;
