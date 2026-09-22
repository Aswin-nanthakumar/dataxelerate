'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config');

const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please retry shortly' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many authentication attempts' } },
});

module.exports = { apiLimiter, authLimiter };
