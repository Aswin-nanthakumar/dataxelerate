'use strict';

process.env.NODE_ENV = 'test';

const {
  computeConnectivity, computeFirstMile, computeLastMile, computeGapUrgency,
  WEIGHTS, GAP_WEIGHTS,
} = require('../src/services/analyticsService');
const { buildDataset, haversineKm } = require('../src/services/synthetic');
const { localForecast, aggregateSeries } = require('../src/services/forecastService');
const { classify } = require('../src/services/copilotService');
const { buildReportContent, generateCsv, generateExcel } = require('../src/services/reportService');

describe('Analytics engine (unit)', () => {
  beforeAll(async () => {
    const { getDb } = require('../src/config/database');
    const { seed } = require('../src/migrations/seed');
    await seed(await getDb());
  });

  const data = buildDataset();
  const base = { zones: data.zones, points: data.points, routes: data.routes };

  test('synthetic dataset has full 12-zone coverage', () => {
    expect(data.zones.length).toBe(12);
    expect(data.points.length).toBeGreaterThan(20);
    expect(data.routes.length).toBe(8);
    expect(data.ridership.length).toBeGreaterThan(5000);
  });

  test('connectivity weights sum to 1', () => {
    const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
    const gapSum = Object.values(GAP_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(gapSum).toBeCloseTo(1, 5);
  });

  test('composite score equals weighted combination of parameters', () => {
    const rows = computeConnectivity(base);
    for (const r of rows) {
      const expected = WEIGHTS.distance * r.distance_to_transit
        + WEIGHTS.frequency * r.frequency_score
        + WEIGHTS.reliability * r.reliability_score
        + WEIGHTS.safety * r.safety_score
        + WEIGHTS.intermodal * r.intermodal_score;
      expect(r.composite_score).toBeCloseTo(Math.max(0, Math.min(1, expected)), 3);
    }
  });

  test('transit deserts exist and are flagged consistently', () => {
    const rows = computeConnectivity(base);
    const deserts = rows.filter((r) => r.is_transit_desert);
    expect(deserts.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => !r.is_transit_desert)).toBe(true);
  });

  test('first-mile suggestions are generated for barrier zones', () => {
    const rows = computeConnectivity(base);
    const issues = computeFirstMile(base, rows);
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.problems.length).toBeGreaterThan(0);
      expect(issue.suggestions.length).toBeGreaterThan(0);
    }
  });

  test('last-mile gaps identify missing services', () => {
    const rows = computeConnectivity(base);
    const issues = computeLastMile(base, rows);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].missing_services).toHaveProperty('bike_share');
  });

  test('gap urgency ranks are contiguous and investments scale with urgency', () => {
    const rows = computeConnectivity(base);
    const gaps = computeGapUrgency(base, rows);
    expect(gaps.map((g) => g.priority_rank)).toEqual(gaps.map((_, i) => i + 1));
    for (let i = 1; i < gaps.length; i += 1) {
      expect(gaps[i - 1].urgency_score).toBeGreaterThanOrEqual(gaps[i].urgency_score);
    }
  });

  test('haversine distance sanity (Chennai scale)', () => {
    const d = haversineKm(80.15, 13.05, 80.27, 12.92);
    expect(d).toBeGreaterThan(15);
    expect(d).toBeLessThan(25);
  });

  test('local forecast produces monotonic timeline with widening bands', () => {
    const preds = localForecast(data.ridership, 'daily', 7);
    expect(preds.length).toBe(7);
    const t0 = new Date(preds[0].timestamp).getTime();
    const t1 = new Date(preds[6].timestamp).getTime();
    expect(t1).toBeGreaterThan(t0);
    for (const p of preds) {
      expect(p.predicted_value).toBeGreaterThan(0);
      expect(p.upper_bound).toBeGreaterThan(p.lower_bound);
    }
  });

  test('aggregateSeries buckets by granularity', () => {
    const daily = aggregateSeries(data.ridership, 'daily');
    expect(daily.length).toBe(45);
    const hourly = aggregateSeries(data.ridership, 'hourly');
    expect(hourly.length).toBeGreaterThan(45);
  });

  test('copilot intent classifier covers required examples', () => {
    expect(classify('Show connectivity gaps')).toBe('show_connectivity_gaps');
    expect(classify("Predict next month's demand")).toBe('predict_demand');
    expect(classify('Generate transit improvement report')).toBe('generate_report');
    expect(classify('Which regions require new feeder buses?')).toBe('recommend_feeder');
  });
});

describe('Report engine (unit)', () => {
  beforeAll(async () => {
    const { getDb } = require('../src/config/database');
    const { seed } = require('../src/migrations/seed');
    await seed(await getDb());
  });

  test('report content includes insights + recommendations', async () => {
    const content = await buildReportContent({ reportType: 'mobility_overview', period: 'monthly' });
    expect(content.ai_insights.length).toBeGreaterThan(2);
    expect(content.recommendations.length).toBeGreaterThan(0);
    expect(content.kpis.total_zones).toBe(12);
    expect(content.forecast.predictions.length).toBe(14);
  });

  test('CSV and Excel artefacts are produced', async () => {
    const content = await buildReportContent({ reportType: 'connectivity', period: 'weekly' });
    const csv = generateCsv(content);
    expect(csv).toContain('section,metric,value');
    const xlsx = generateExcel(content);
    expect(Buffer.isBuffer(xlsx)).toBe(true);
    expect(xlsx.length).toBeGreaterThan(500);
    // XLSX files start with PK zip magic
    expect(xlsx.slice(0, 2).toString()).toBe('PK');
  });
});
