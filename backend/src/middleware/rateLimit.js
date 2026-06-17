const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, message: 'Too many attempts, try later' } });
const publicOrderLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
// Marketing "Book a Demo" form — stricter to deter spam bots.
const leadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many requests. Please try again in a few minutes.' }
});

module.exports = { apiLimiter, authLimiter, publicOrderLimiter, leadLimiter };
