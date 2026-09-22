'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const hpp = require('hpp');
const config = require('./config');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const mobilityRoutes = require('./routes/mobility.routes');
const analyticsRoutes = require('./routes/analytics.routes');

function createApp() {
  const app = express();

  // Security hardening: helmet (XSS/content-type/headers), CORS allowlist,
  // HPP (HTTP param pollution), JSON body limit, no stack traces to clients.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
  app.use(cors({
    origin: config.security.corsOrigins.includes('*') ? true : config.security.corsOrigins,
    credentials: true,
  }));
  app.use(hpp());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  if (!config.isTest) app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // CSRF: state-changing APIs are Bearer-token based (no cookie auth), which
  // removes classic CSRF surface; double-submit token available for cookie clients.
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  app.use('/api', apiLimiter);

  // Routes
  app.use('/health', healthRoutes);
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/mobility', mobilityRoutes);
  app.use('/api/v1', analyticsRoutes);

  // Swagger JSON (OpenAPI 3.0) + interactive docs.
  app.use('/api/v1/docs', require('./routes/docs.routes'));
  app.get('/api/v1/openapi.json', (req, res) => {
    res.json(require('./openapi'));
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
