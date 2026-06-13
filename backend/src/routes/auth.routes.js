const router = require('express').Router();
const asyncH = require('../utils/asyncHandler');
const ctrl = require('../controllers/auth.controller');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/login', authLimiter, asyncH(ctrl.login));
router.post('/refresh', asyncH(ctrl.refresh));
router.post('/logout', asyncH(ctrl.logout));

module.exports = router;
