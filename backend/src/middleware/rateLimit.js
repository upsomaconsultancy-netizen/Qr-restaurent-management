const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many attempts, try later' } });
const publicOrderLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });

module.exports = { apiLimiter, authLimiter, publicOrderLimiter };
