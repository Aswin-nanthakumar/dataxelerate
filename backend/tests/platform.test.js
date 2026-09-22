'use strict';

const request = require('supertest');
const { setup, loginAs } = require('./helpers');
const notificationService = require('../src/services/notificationService');
const { requireCapability, CAPABILITIES } = require('../src/middleware/rbac');
const { HttpError } = require('../src/utils/response');

describe('Notification engine & middleware edge cases', () => {
  let app;

  beforeAll(async () => { app = await setup(); });

  test('pushAnalyticsAlerts derives alerts from live analytics', async () => {
    const pushed = await notificationService.pushAnalyticsAlerts();
    expect(Array.isArray(pushed)).toBe(true);
    expect(pushed.length).toBeGreaterThan(0);
    expect(pushed[0]).toHaveProperty('title');

    const admin = await loginAs('admin@urbanflow.ai');
    const list = await request(app).get('/api/v1/notifications').set('Authorization', `Bearer ${admin.token}`);
    expect(list.body.data.items.length).toBeGreaterThan(0);
  });

  test('individual notification can be marked read', async () => {
    const admin = await loginAs('admin@urbanflow.ai');
    const list = await request(app).get('/api/v1/notifications?include_read=false')
      .set('Authorization', `Bearer ${admin.token}`);
    const first = list.body.data.items[0];
    if (first) {
      const res = await request(app).post(`/api/v1/notifications/${first.id}/read`)
        .set('Authorization', `Bearer ${admin.token}`);
      expect(res.status).toBe(200);
      expect(res.body.data.is_read).toBe(true);
    }
  });

  test('notify() with explicit user targeting works', async () => {
    const admin = await loginAs('admin@urbanflow.ai');
    const n = await notificationService.notify({
      userId: admin.user.id, kind: 'system', severity: 'info',
      title: 'Directed alert', body: 'For one user only',
    });
    expect(n.user_id).toBe(admin.user.id);
  });

  test('RBAC rejects unknown capability at construction', () => {
    expect(() => requireCapability('does:not:exist')).toThrow(/Unknown capability/);
  });

  test('RBAC denies without req.user (defensive)', () => {
    const mw = requireCapability('analytics:read');
    const nextErr = jest.fn();
    mw({}, {}, nextErr);
    expect(nextErr).toHaveBeenCalledWith(expect.any(HttpError));
  });

  test('every capability maps to at least one role and roles are the four defined', () => {
    const roles = new Set();
    for (const allowed of Object.values(CAPABILITIES)) {
      expect(allowed.length).toBeGreaterThan(0);
      allowed.forEach((r) => roles.add(r));
    }
    expect(roles.size).toBe(4);
  });

  test('error handler formats entity.parse.failed as 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "bad json"');
    expect(res.status).toBe(400);
  });

  test('pagination caps limit at MAX_LIMIT', async () => {
    const { parseListQuery, MAX_LIMIT } = require('../src/utils/pagination');
    expect(parseListQuery({ limit: '9999' }).limit).toBe(MAX_LIMIT);
    expect(parseListQuery({ limit: '-3' }).limit).toBe(1);
    expect(parseListQuery({ page: '0' }).page).toBe(1);
  });

  test('matchesSearch handles missing fields', async () => {
    const { matchesSearch } = require('../src/utils/pagination');
    expect(matchesSearch({}, 'x')).toBe(false);
    expect(matchesSearch({ name: 'Alpha' }, 'alp')).toBe(true);
    expect(matchesSearch({ name: 'Alpha' }, '')).toBe(true);
  });

  test('HttpError carries status and details', () => {
    const e = new HttpError(418, 'teapot', [{ field: 'x' }]);
    expect(e.status).toBe(418);
    expect(e.details[0].field).toBe('x');
  });

  test('memory cache TTL expiry works', async () => {
    const { MemoryCache } = require('../src/config/redis');
    const cache = new MemoryCache();
    await cache.init();
    await cache.set('k', 'v', 0.01); // 10 ms
    expect(await cache.get('k')).toBe('v');
    await new Promise((r) => setTimeout(r, 30));
    expect(await cache.get('k')).toBeNull();
    await cache.set('a:1', 1); await cache.set('a:2', 2);
    await cache.del('a:*');
    expect(await cache.get('a:1')).toBeNull();
    await cache.flush();
  });

  test('forecast rejects out-of-range horizon via validation', async () => {
    const analyst = await loginAs('analyst@urbanflow.ai');
    const res = await request(app).get('/api/v1/forecast?horizon=999')
      .set('Authorization', `Bearer ${analyst.token}`);
    expect(res.status).toBe(422);
  });

  test('recommendation 404 on unknown id', async () => {
    const planner = await loginAs('planner@urbanflow.ai');
    const res = await request(app).patch('/api/v1/recommendations/does-not-exist')
      .set('Authorization', `Bearer ${planner.token}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(404);
  });

  test('user management: admin can change role', async () => {
    const admin = await loginAs('admin@urbanflow.ai');
    const list = await request(app).get('/api/v1/admin/users?q=analyst').set('Authorization', `Bearer ${admin.token}`);
    const target = list.body.data[0];
    const res = await request(app).patch(`/api/v1/admin/users/${target.id}`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'analyst', is_active: true });
    expect(res.status).toBe(200);

    const missing = await request(app).patch('/api/v1/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ role: 'analyst' });
    expect(missing.status).toBe(404);
  });

  test('audit log endpoint returns entries', async () => {
    const admin = await loginAs('admin@urbanflow.ai');
    const res = await request(app).get('/api/v1/admin/audit').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
  });
});
