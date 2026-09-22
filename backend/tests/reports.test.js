'use strict';

const request = require('supertest');
const { setup, loginAs } = require('./helpers');

describe('Reports & Recommendations lifecycle', () => {
  let app; let planner; let authority;

  beforeAll(async () => {
    app = await setup();
    planner = await loginAs('planner@urbanflow.ai');
    authority = await loginAs('authority@urbanflow.ai');
  });

  test('CSV report generates with KPI + recommendations sections', async () => {
    const res = await request(app).post('/api/v1/reports')
      .set('Authorization', `Bearer ${planner.token}`)
      .send({ reportType: 'mobility_overview', period: 'monthly', format: 'csv' });
    expect(res.status).toBe(201);
    expect(res.body.data.report.format).toBe('csv');
    expect(res.body.data.bytes).toBeGreaterThan(50);
  });

  test('Excel report generates a binary workbook', async () => {
    const res = await request(app).post('/api/v1/reports')
      .set('Authorization', `Bearer ${planner.token}`)
      .send({ reportType: 'connectivity', period: 'weekly', format: 'excel' });
    expect(res.status).toBe(201);
    expect(res.body.data.bytes).toBeGreaterThan(500);
  });

  test('PDF report generates and downloads with correct headers', async () => {
    const created = await request(app).post('/api/v1/reports')
      .set('Authorization', `Bearer ${planner.token}`)
      .send({ reportType: 'investment_plan', period: 'annual', format: 'pdf' });
    expect(created.status).toBe(201);
    const id = created.body.data.report.id;

    const dl = await request(app).get(`/api/v1/reports/${id}/download`)
      .set('Authorization', `Bearer ${planner.token}`);
    expect(dl.status).toBe(200);
    expect(dl.headers['content-type']).toContain('pdf');
    expect(dl.headers['content-disposition']).toContain('attachment');
  });

  test('download=true streams the file directly', async () => {
    const res = await request(app).post('/api/v1/reports?download=true')
      .set('Authorization', `Bearer ${planner.token}`)
      .send({ reportType: 'demand_forecast', period: 'daily', format: 'csv' });
    expect(res.status).toBe(201);
    expect(res.text).toContain('section,metric,value');
  });

  test('reports are listed and analyst can generate own reports', async () => {
    const analyst = await loginAs('analyst@urbanflow.ai');
    const gen = await request(app).post('/api/v1/reports')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ format: 'csv' });
    expect(gen.status).toBe(201);

    const list = await request(app).get('/api/v1/reports')
      .set('Authorization', `Bearer ${analyst.token}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    expect(list.body.data[0]).toHaveProperty('title');
  });

  test('recommendation generation + status transition (approval RBAC)', async () => {
    const gen = await request(app).post('/api/v1/recommendations/generate')
      .set('Authorization', `Bearer ${planner.token}`);
    expect(gen.status).toBe(201);
    expect(gen.body.data.length).toBeGreaterThan(0);

    const list = await request(app).get('/api/v1/recommendations?status=proposed')
      .set('Authorization', `Bearer ${planner.token}`);
    const rec = list.body.data[0];

    // Planner may propose/edit status to in_progress
    const patched = await request(app).patch(`/api/v1/recommendations/${rec.id}`)
      .set('Authorization', `Bearer ${planner.token}`)
      .send({ status: 'in_progress' });
    expect(patched.status).toBe(200);
    expect(patched.body.data.status).toBe('in_progress');

    // Analyst cannot modify recommendations
    const analyst = await loginAs('analyst@urbanflow.ai');
    const denied = await request(app).patch(`/api/v1/recommendations/${rec.id}`)
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ status: 'rejected' });
    expect(denied.status).toBe(403);
  });

  test('simulation results include ridership, congestion, accessibility, carbon, ROI', async () => {
    const res = await request(app).post('/api/v1/simulations')
      .set('Authorization', `Bearer ${authority.token}`)
      .send({ name: 'Metro at Sholinganallur', kind: 'metro_station', coordinates: [80.227, 12.9], radius_km: 3 });
    expect(res.status).toBe(201);
    const s = res.body.data;
    expect(s.ridership_increase_pct).toBeGreaterThan(0);
    expect(s.congestion_reduction_pct).toBeGreaterThan(0);
    expect(s.accessibility_gain).toBeGreaterThan(0);
    expect(s.carbon_savings_tons_yr).toBeGreaterThan(0);
    expect(s.roi).toBeDefined();
    expect(s.results.affected_zones.length).toBeGreaterThan(0);

    const list = await request(app).get('/api/v1/simulations')
      .set('Authorization', `Bearer ${authority.token}`);
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  test('simulation rejects invalid kind with 422', async () => {
    const res = await request(app).post('/api/v1/simulations')
      .set('Authorization', `Bearer ${authority.token}`)
      .send({ name: 'Bad', kind: 'hyperloop', coordinates: [80.2, 13.05] });
    expect(res.status).toBe(422);
  });

  test('OpenAPI spec + docs endpoints are served', async () => {
    const spec = await request(app).get('/api/v1/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.0.3');
    expect(Object.keys(spec.body.paths).length).toBeGreaterThan(25);

    const docs = await request(app).get('/api/v1/docs');
    expect(docs.status).toBe(200);
    expect(docs.text).toContain('swagger-ui');
  });

  test('unknown routes return structured 404', async () => {
    const res = await request(app).get('/api/v1/definitely-not-a-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
