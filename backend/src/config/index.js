'use strict';

require('dotenv').config();

const env = process.env.NODE_ENV || 'development';

const config = {
  env,
  isTest: env === 'test',
  port: parseInt(process.env.PORT || '4000', 10),
  apiPrefix: '/api/v1',

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production-urbanflow',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production-urbanflow',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '30', 10),
  },

  database: {
    url: process.env.DATABASE_URL || '',
    // When no DATABASE_URL is provided the API runs on the in-memory data
    // adapter so the platform boots everywhere (CI, demos, previews).
    ssl: process.env.DB_SSL === 'true',
  },

  redis: {
    url: process.env.REDIS_URL || '',
    ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '120', 10),
  },

  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000',
    timeoutMs: parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '15000', 10),
  },

  ai: {
    geminiKey: process.env.GEMINI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
  },

  storage: {
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
    corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  },

  logging: {
    sentryDsn: process.env.SENTRY_DSN || '',
    level: process.env.LOG_LEVEL || 'info',
  },
};

module.exports = config;
