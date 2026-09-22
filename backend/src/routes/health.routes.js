'use strict';

const express = require('express');
const { getDb } = require('../config/database');
const { getCache } = require('../config/redis');
const config = require('../config');
const { ok } = require('../utils/response');

const router = express.Router();

/** Liveness — always cheap. */
router.get('/', (req, res) => ok(res, {
  status: 'ok',
  service: 'urbanflow-backend',
  version: '1.0.0',
  uptime_s: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
}));

/** Readiness — verifies data + cache backends. */
router.get('/ready', async (req, res) => {
  const checks = { database: false, cache: false, ai_service: null };
  try {
    const db = await getDb();
    checks.database = await db.healthy();
    checks.database_adapter = db.kind;
  } catch (e) { checks.database_error = e.message; }
  try {
    const cache = await getCache();
    await cache.set('health', 1, 5);
    checks.cache = (await cache.get('health')) === 1;
    checks.cache_adapter = cache.kind;
  } catch (e) { checks.cache_error = e.message; }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res2 = await fetch(`${config.aiService.url}/health`, { signal: controller.signal });
    clearTimeout(t);
    checks.ai_service = res2.ok;
  } catch (_e) { checks.ai_service = false; }

  const ready = checks.database && checks.cache;
  return res.status(ready ? 200 : 503).json({ success: ready, data: { status: ready ? 'ready' : 'degraded', checks } });
});

module.exports = router;
