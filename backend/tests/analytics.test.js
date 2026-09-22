'use strict';

const request = require('supertest');
const { setup, loginAs } = require('./helpers');

describe('Analytics APIs', () => {
  let app; let analyst;

  beforeAll(async () => {
    app = await setup();
    analyst = await loginAs('analyst@urbanflow.ai');
  });

  const get = (url) => request(app).get(url).set('Authorization', `Bearer ${analyst.token}`);

  test('dashboard returns KPIs, trends and gap zones', async () => {
    const res = await get('/api/v1/mobility/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.kpis.total_zones).toBe(12);
    expect(res.body.data.kpis).toHaveProperty('transit_deserts');
    expect(Array.isArray(res.body.data.ridership_trend)).toBe(true);
    expect(res.body.data.top_gap_zones.length).toBeGreaterThan(0);
    expect(res.body.data.connectivity_distribution).toHaveProperty('poor');
  });

  test('connectivity scores are in [0,1] with all five parameters', async () => {
    const res = await get('/api/v1/connectivity');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(12);
    for (const row of res.body.data) {
      expect(row.composite_score).toBeGreaterThanOrEqual(0);
      expect(row.composite_score).toBeLessThanOrEqual(1);
      expect(row).toHaveProperty('distance_to_transit');
      expect(row).toHaveProperty('frequency_score');
      expect(row).toHaveProperty('reliability_score');
      expect(row).toHaveProperty('safety_score');
      expect(row).toHaveProperty('intermodal_score');
    }
    expect(res.body.meta.total).toBe(12);
  });

  test('connectivity supports pagination + search + sort', async () => {
    const paged = await get('/api/v1/connectivity?page=2&limit=5');
    expect(paged.body.data.length).toBe(5);
    expect(paged.body.meta.page).toBe(2);

    const searched = await get('/api/v1/connectivity?q=tambaram');
    expect(searched.body.data.length).toBe(1);
    expect(searched.body.data[0].zone_name).toBe('Tambaram');

    const sorted = await get('/api/v1/connectivity?sort=composite_score');
    const scores = sorted.body.data.map((r) => r.composite_score);
    expect([...scores].sort((a, b) => a - b)).toEqual(scores);
  });

  test('connectivity rankings are ordered', async () => {
    const res = await get('/api/v1/connectivity/rankings');
    expect(res.status).toBe(200);
    expect(res.body.data[0].rank).toBe(1);
    const scores = res.body.data.map((r) => r.composite_score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  test('connectivity heatmap emits points', async () => {
    const res = await get('/api/v1/connectivity/heatmap');
    expect(res.status).toBe(200);
    expect(res.body.data.points.length).toBe(12);
  });

  test('first-mile analysis detects barriers with suggestions', async () => {
    const res = await get('/api/v1/first-mile');
    expect(res.status).toBe(200);
    expect(res.body.data.issues.length).toBeGreaterThan(0);
    const issue = res.body.data.issues[0];
    expect(issue).toHaveProperty('problems');
    expect(issue.suggestions.length).toBeGreaterThan(0);
    expect(res.body.data.summary).toHaveProperty('priority_zones');
  });

  test('last-mile analysis detects gaps with missing services', async () => {
    const res = await get('/api/v1/last-mile');
    expect(res.status).toBe(200);
    expect(res.body.data.issues.length).toBeGreaterThan(0);
    expect(res.body.data.issues[0]).toHaveProperty('missing_services');
  });

  test('gap urgency index ranks all zones with investment hints', async () => {
    const res = await get('/api/v1/gap-urgency');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(12);
    expect(res.body.data[0].priority_rank).toBe(1);
    for (const g of res.body.data) {
      expect(g.urgency_score).toBeGreaterThanOrEqual(0);
      expect(g.urgency_score).toBeLessThanOrEqual(1);
      expect(g.investment_hint_usd).toBeGreaterThan(0);
    }
  });

  test('daily forecast returns predictions with confidence bands', async () => {
    const res = await get('/api/v1/forecast?granularity=daily&horizon=7');
    expect(res.status).toBe(200);
    expect(res.body.data.predictions.length).toBe(7);
    const p = res.body.data.predictions[0];
    expect(p.lower_bound).toBeLessThanOrEqual(p.predicted_value);
    expect(p.upper_bound).toBeGreaterThanOrEqual(p.predicted_value);
    expect(p.confidence).toBeGreaterThan(0);
  });

  test('hourly and seasonal forecasts work', async () => {
    for (const g of ['hourly', 'weekly', 'seasonal']) {
      const res = await get(`/api/v1/forecast?granularity=${g}&horizon=3`);
      expect(res.status).toBe(200);
      expect(res.body.data.granularity).toBe(g);
    }
  });

  test('invalid granularity is rejected', async () => {
    const res = await get('/api/v1/forecast?granularity=yearly');
    expect(res.status).toBe(422);
  });

  test('recommendations include full business case fields', async () => {
    const res = await get('/api/v1/recommendations');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const r = res.body.data[0];
    expect(r).toHaveProperty('problem');
    expect(r).toHaveProperty('root_cause');
    expect(r).toHaveProperty('estimated_cost_usd');
    expect(r).toHaveProperty('expected_impact');
    expect(r).toHaveProperty('roi');
    expect(r).toHaveProperty('priority_level');
    expect(r.roadmap.length).toBeGreaterThan(0);
  });

  test('GIS layers return valid GeoJSON', async () => {
    const zones = await get('/api/v1/mobility/gis/zones');
    expect(zones.status).toBe(200);
    expect(zones.body.data.type).toBe('FeatureCollection');
    expect(zones.body.data.features.length).toBe(12);
    expect(zones.body.data.features[0].geometry.type).toBe('MultiPolygon');

    const points = await get('/api/v1/mobility/gis/points?mode=metro');
    expect(points.body.data.features.length).toBeGreaterThan(0);
    expect(points.body.data.features[0].properties.mode).toBe('metro');

    const routes = await get('/api/v1/mobility/gis/routes');
    expect(routes.body.data.features.length).toBeGreaterThan(0);
  });

  test('geo search supports text, radius and bbox', async () => {
    const text = await get('/api/v1/mobility/gis/search?q=tambaram');
    expect(text.body.data.zones.length).toBe(1);

    const radius = await get('/api/v1/mobility/gis/search?lat=13.05&lng=80.2&radius_km=3');
    expect(radius.body.data.points.length).toBeGreaterThan(0);

    const bbox = await get('/api/v1/mobility/gis/search?bbox=80.10,13.00,80.16,13.05');
    expect(bbox.body.data.zones.length).toBeGreaterThan(0);
  });

  test('traffic hotspots and heatmaps render', async () => {
    const hot = await get('/api/v1/mobility/traffic/hotspots');
    expect(hot.status).toBe(200);
    expect(hot.body.data.length).toBeGreaterThan(0);
    expect(hot.body.data[0]).toHaveProperty('hotspot_level');

    for (const layer of ['ridership', 'congestion', 'connectivity', 'demand']) {
      const heat = await get(`/api/v1/mobility/heatmap/${layer}`);
      expect(heat.status).toBe(200);
      expect(heat.body.data.points.length).toBeGreaterThan(0);
    }

    const bad = await get('/api/v1/mobility/heatmap/nope');
    expect(bad.status).toBe(422);
  });

  test('copilot answers grounded questions by intent', async () => {
    const questions = [
      ['Show connectivity gaps', 'show_connectivity_gaps'],
      ["Predict next month's demand", 'predict_demand'],
      ['Which regions require new feeder buses?', 'recommend_feeder'],
      ['Generate transit improvement report', 'generate_report'],
    ];
    for (const [message, intent] of questions) {
      const res = await request(app).post('/api/v1/copilot/chat')
        .set('Authorization', `Bearer ${analyst.token}`)
        .send({ message });
      expect(res.status).toBe(200);
      expect(res.body.data.intent).toBe(intent);
      expect(res.body.data.answer.length).toBeGreaterThan(30);
      expect(res.body.data.session_id).toBeTruthy();
    }
  }, 15000);

  test('copilot session history persists', async () => {
    const chat = await request(app).post('/api/v1/copilot/chat')
      .set('Authorization', `Bearer ${analyst.token}`)
      .send({ message: 'Show connectivity gaps' });
    const sessionId = chat.body.data.session_id;
    const hist = await get(`/api/v1/copilot/sessions/${sessionId}`);
    expect(hist.status).toBe(200);
    expect(hist.body.data.length).toBeGreaterThanOrEqual(2);
    expect(hist.body.data[0].role).toBe('user');
  });

  test('notifications list + mark read', async () => {
    const list = await get('/api/v1/notifications');
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveProperty('items');

    await request(app).post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${analyst.token}`);
    const after = await get('/api/v1/notifications?include_read=false');
    expect(after.body.data.unread).toBe(0);
  });

  test('city selector and GIS layers isolate data per city', async () => {
    const citiesRes = await get('/api/v1/mobility/cities');
    expect(citiesRes.status).toBe(200);
    expect(citiesRes.body.data.length).toBe(3);
    const slugs = citiesRes.body.data.map((c) => c.slug);
    expect(slugs).toContain('chennai');
    expect(slugs).toContain('coimbatore');
    expect(slugs).toContain('bengaluru');

    // Chennai zones vs Coimbatore zones vs Bengaluru zones
    const chRes = await get('/api/v1/mobility/gis/zones?city=chennai');
    expect(chRes.status).toBe(200);
    expect(chRes.body.data.features.length).toBe(12);
    expect(chRes.body.data.city).toBe('Chennai');
    expect(chRes.body.data.features[0].properties.city).toBe('Chennai');

    const cbRes = await get('/api/v1/mobility/gis/zones?city=coimbatore');
    expect(cbRes.status).toBe(200);
    expect(cbRes.body.data.features.length).toBe(12);
    expect(cbRes.body.data.city).toBe('Coimbatore');
    expect(cbRes.body.data.features[0].properties.city).toBe('Coimbatore');

    const blrRes = await get('/api/v1/mobility/gis/zones?city=bengaluru');
    expect(blrRes.status).toBe(200);
    expect(blrRes.body.data.features.length).toBe(12);
    expect(blrRes.body.data.city).toBe('Bengaluru');
    expect(blrRes.body.data.features[0].properties.city).toBe('Bengaluru');

    // Heatmaps are localized to each city's bounding coordinates
    const chHeat = await get('/api/v1/mobility/heatmap/ridership?city=chennai');
    expect(chHeat.status).toBe(200);
    expect(chHeat.body.data.points.length).toBeGreaterThan(0);
    for (const p of chHeat.body.data.points) {
      expect(p.lat).toBeGreaterThan(12.8);
      expect(p.lat).toBeLessThan(13.3);
    }

    const cbHeat = await get('/api/v1/mobility/heatmap/ridership?city=coimbatore');
    expect(cbHeat.status).toBe(200);
    expect(cbHeat.body.data.points.length).toBeGreaterThan(0);
    for (const p of cbHeat.body.data.points) {
      expect(p.lat).toBeGreaterThan(10.8);
      expect(p.lat).toBeLessThan(11.3);
    }
  });
});
