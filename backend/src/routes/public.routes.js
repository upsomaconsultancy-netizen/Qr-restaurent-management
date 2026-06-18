const router = require('express').Router();
const asyncH = require('../utils/asyncHandler');
const ctrl = require('../controllers/public.controller');
const leadCtrl = require('../controllers/lead.controller');
const { publicOrderLimiter, leadLimiter } = require('../middleware/rateLimit');

// Customer QR flow — no login required
router.get('/search',                       asyncH(ctrl.searchMenu));
router.get('/qr/:qrToken',                  asyncH(ctrl.resolveQr));
router.post('/customer-session',            publicOrderLimiter, asyncH(ctrl.createCustomerSession));
router.post('/orders',                      publicOrderLimiter, asyncH(ctrl.placeOrder));
router.get('/bill/:customerToken',          asyncH(ctrl.myBill));
router.post('/tip/:customerToken',          publicOrderLimiter, asyncH(ctrl.addTip));
router.get('/receipt/:customerToken',       asyncH(ctrl.customerReceipt));

// Marketing landing — "Book a Demo" lead capture (no login)
router.post('/leads',                       leadLimiter, asyncH(leadCtrl.create));

module.exports = router;
