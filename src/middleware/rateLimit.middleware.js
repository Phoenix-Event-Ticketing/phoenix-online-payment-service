const rateLimit = require('express-rate-limit');

// Basic global rate limiter; can be tuned per environment.
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for sensitive mutation endpoints (create payment, refund, etc.)
const mutationRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalRateLimit,
  mutationRateLimit,
};

