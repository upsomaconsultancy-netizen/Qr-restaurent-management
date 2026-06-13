const router = require('express').Router();
const asyncH = require('../utils/asyncHandler');
const ctrl = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth');
const { permit } = require('../middleware/rbac');

router.use(requireAuth, permit('SUPER_ADMIN'));

router.get('/stats', asyncH(ctrl.platformStats));
router.get('/restaurants', asyncH(ctrl.listRestaurants));
router.post('/restaurants', asyncH(ctrl.createRestaurant));
router.patch('/restaurants/:id/status', asyncH(ctrl.setStatus));
router.patch('/restaurants/:id/table-limit', asyncH(ctrl.setTableLimit));
router.patch('/restaurants/:id/plan', asyncH(ctrl.setPlan));
router.delete('/restaurants/:id', asyncH(ctrl.softDelete));

module.exports = router;
