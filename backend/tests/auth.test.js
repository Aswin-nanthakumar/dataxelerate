'use strict';

const request = require('supertest');
const { setup, loginAs } = require('./helpers');

describe('Auth & RBAC', () => {
  let app;

  beforeAll(async () => { app = await setup(); });

  test('health endpoints respond', async () => {
    const live = await request(app).get('/health');
    expect(live.status).toBe(200);
    expect(live.body.data.status).toBe('ok');

    const ready = await request(app).get('/health/ready');
    expect([200, 503]).toContain(ready.status);
    expect(ready.body.data.checks).toHaveProperty('database');
  });

  test('login issues access + refresh tokens for all seeded roles', async () => {
    for (const email of ['admin@urbanflow.ai', 'planner@urbanflow.ai', 'authority@urbanflow.ai', 'analyst@urbanflow.ai']) {
      const session = await loginAs(email);
      expect(session.token).toBeTruthy();
      expect(session.refresh).toBeTruthy();
    }
  });

  test('login rejects bad credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@urbanflow.ai', password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  test('register validates password length', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'new@urbanflow.ai', password: 'short', fullName: 'New User',
    });
    expect(res.status).toBe(422);
  });

  test('register + login roundtrip works', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      email: 'roundtrip@urbanflow.ai', password: 'SuperSecret#123', fullName: 'Round Trip', role: 'analyst',
    });
    expect(reg.status).toBe(201);
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'roundtrip@urbanflow.ai', password: 'SuperSecret#123' });
    expect(login.status).toBe(200);
  });

  test('duplicate registration returns 409', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'roundtrip@urbanflow.ai', password: 'SuperSecret#123', fullName: 'Round Trip',
    });
    expect(res.status).toBe(409);
  });

  test('refresh rotates tokens; old refresh is revoked', async () => {
    const session = await loginAs('analyst@urbanflow.ai');
    const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refresh });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toEqual(session.refresh);

    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refresh });
    expect(replay.status).toBe(401);
  });

  test('logout revokes refresh token', async () => {
    const session = await loginAs('planner@urbanflow.ai');
    await request(app).post('/api/v1/auth/logout').send({ refreshToken: session.refresh });
    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: session.refresh });
    expect(replay.status).toBe(401);
  });

  test('protected routes require a token', async () => {
    const res = await request(app).get('/api/v1/mobility/dashboard');
    expect(res.status).toBe(401);
  });

  test('invalid tokens are rejected', async () => {
    const res = await request(app).get('/api/v1/mobility/dashboard').set('Authorization', 'Bearer not-a-token');
    expect(res.status).toBe(401);
  });

  test('/auth/me returns profile + role dashboard', async () => {
    const admin = await loginAs('admin@urbanflow.ai');
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('administrator');
    expect(res.body.data.role_dashboard).toBe('admin');
  });

  test('RBAC: analyst cannot access admin users', async () => {
    const analyst = await loginAs('analyst@urbanflow.ai');
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${analyst.token}`);
    expect(res.status).toBe(403);
  });

  test('RBAC: administrator can list users', async () => {
    const admin = await loginAs('admin@urbanflow.ai');
    const res = await request(app).get('/api/v1/admin/users').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data[0]).not.toHaveProperty('password_hash');
  });

  test('RBAC: analyst cannot run simulations', async () => {
    const analyst = await loginAs('analyst@urbanflow.ai');
    const res = await request(app).post('/api/v1/simulations')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ name: 'Should fail', kind: 'bus_stop', coordinates: [80.2, 13.05] });
    expect(res.status).toBe(403);
  });

  test('RBAC: city planner can run simulations', async () => {
    const planner = await loginAs('planner@urbanflow.ai');
    const res = await request(app).post('/api/v1/simulations')
      .set('Authorization', `Bearer ${planner.token}`)
      .send({ name: 'New stop Tambaram', kind: 'bus_stop', coordinates: [80.2, 13.05], radius_km: 2 });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('ridership_increase_pct');
    expect(res.body.data).toHaveProperty('carbon_savings_tons_yr');
  });

  test('RBAC: capability matrix endpoint lists all four roles', async () => {
    const admin = await loginAs('admin@urbanflow.ai');
    const res = await request(app).get('/api/v1/admin/capabilities').set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data.role_dashboards)).toEqual(
      expect.arrayContaining(['administrator', 'city_planner', 'transport_authority', 'analyst']),
    );
  });
});
