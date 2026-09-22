'use strict';

/**
 * Shared test bootstrap — memory adapters + seeded dataset + auth helpers.
 */

process.env.NODE_ENV = 'test';
process.env.FORCE_MEMORY_DB = 'true';
process.env.FORCE_MEMORY_CACHE = 'true';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.AI_SERVICE_URL = 'http://127.0.0.1:8000';

const request = require('supertest');
const { createApp } = require('../src/app');
const { getDb } = require('../src/config/database');
const { seed } = require('../src/migrations/seed');

let app = null;

async function setup() {
  if (!app) {
    const db = await getDb();
    await seed(db);
    app = createApp();
  }
  return app;
}

async function loginAs(email, password = 'Urbanflow#2026') {
  const a = await setup();
  const res = await request(a).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) throw new Error(`login failed for ${email}: ${JSON.stringify(res.body)}`);
  return { token: res.body.data.accessToken, refresh: res.body.data.refreshToken, user: res.body.data.user };
}

module.exports = { setup, loginAs, getApp: () => app };
