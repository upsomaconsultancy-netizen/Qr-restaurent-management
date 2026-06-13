const router = require('express').Router();
const asyncH = require('../utils/asyncHandler');
const ctrl = require('../controllers/public.controller');
const { publicOrderLimiter } = require('../middleware/rateLimit');

// Customer QR flow — no login required
router.get('/qr/:qrToken',                  asyncH(ctrl.resolveQr));
router.post('/customer-session',            publicOrderLimiter, asyncH(ctrl.createCustomerSession));
router.post('/orders',                      publicOrderLimiter, asyncH(ctrl.placeOrder));
router.get('/bill/:customerToken',          asyncH(ctrl.myBill));
router.get('/receipt/:customerToken',       asyncH(ctrl.customerReceipt));

module.exports = router;
