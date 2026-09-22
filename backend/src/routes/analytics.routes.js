'use strict';

/**
 * Connectivity, First-Mile, Last-Mile, Gap Urgency, Demand, Recommendations,
 * Simulation, Reports, Copilot, Notifications, Users/Admin.
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireCapability } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const analytics = require('../services/analyticsService');
const forecastService = require('../services/forecastService');
const recommendationService = require('../services/recommendationService');
const simulationService = require('../services/simulationService');
const reportService = require('../services/reportService');
const copilotService = require('../services/copilotService');
const notificationService = require('../services/notificationService');
const { getDb } = require('../config/database');
const { ok, created, HttpError } = require('../utils/response');
const { parseListQuery, paginate, matchesSearch } = require('../utils/pagination');

const router = express.Router();

// Auto-attach requireAuth to every route registered on this router.
// Requests that match no route fall through to the 404 handler unauthenticated.
for (const m of ['get', 'post', 'put', 'patch', 'delete']) {
  const original = router[m].bind(router);
  router[m] = (path, ...handlers) => original(path, requireAuth, ...handlers);
}

const getCity = (req) => req.query.city || (req.user && req.user.tenantId);

/* --------------------------------------------------------------------- */
/* Connectivity Analytics                                                 */
/* --------------------------------------------------------------------- */

router.get('/connectivity', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const { connectivity } = await analytics.fullAnalytics(getCity(req));
    const { page, limit, q, sortField, sortDesc } = parseListQuery(req.query);
    let rows = connectivity.filter((r) => matchesSearch(r, q, ['zone_name', 'zone_code']));
    if (sortField) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortField]; const bv = b[sortField];
        return (av > bv ? 1 : av < bv ? -1 : 0) * (sortDesc ? -1 : 1);
      });
    } else rows = [...rows].sort((a, b) => b.composite_score - a.composite_score);
    return ok(res, ...flip(paginate(rows, { page, limit }, { weights: analytics.WEIGHTS })));
  } catch (err) { return next(err); }
});

router.get('/connectivity/rankings', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const { connectivity } = await analytics.fullAnalytics(getCity(req));
    const ranked = [...connectivity].sort((a, b) => b.composite_score - a.composite_score)
      .map((c, i) => ({
        rank: i + 1, zone_name: c.zone_name, zone_code: c.zone_code,
        composite_score: c.composite_score, accessibility_score: c.accessibility_score,
        is_transit_desert: c.is_transit_desert,
      }));
    return ok(res, ranked);
  } catch (err) { return next(err); }
});

router.get('/connectivity/heatmap', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const { base, connectivity } = await analytics.fullAnalytics(getCity(req));
    const points = base.zones.map((z) => {
      const c = connectivity.find((x) => x.zone_id === z.id);
      return {
        lat: z.centroid.coordinates[1], lng: z.centroid.coordinates[0],
        intensity: c ? c.composite_score : 0, label: z.name,
        first_mile: c ? c.first_mile_score : 0, last_mile: c ? c.last_mile_score : 0,
      };
    });
    return ok(res, { layer: 'connectivity', points });
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* First / Last Mile                                                      */
/* --------------------------------------------------------------------- */

router.get('/first-mile', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const { firstMile, base, connectivity } = await analytics.fullAnalytics(getCity(req));
    const priorityZones = firstMile.filter((f) => f.severity !== 'info').map((f) => f.zone_name);
    return ok(res, {
      summary: {
        zones_with_barriers: firstMile.length,
        transit_deserts: connectivity.filter((c) => c.is_transit_desert).length,
        priority_zones: priorityZones,
        walk_barrier_km: analytics.WALK_BARRIER_KM,
      },
      issues: firstMile,
    });
  } catch (err) { return next(err); }
});

router.get('/last-mile', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const { lastMile, connectivity } = await analytics.fullAnalytics(getCity(req));
    return ok(res, {
      summary: {
        zones_with_gaps: lastMile.length,
        avg_last_mile_score: Number((connectivity.reduce((a, c) => a + c.last_mile_score, 0) / (connectivity.length || 1)).toFixed(3)),
        priority_zones: lastMile.filter((f) => f.severity !== 'info').map((f) => f.zone_name),
      },
      issues: lastMile,
    });
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* Gap Urgency Index                                                      */
/* --------------------------------------------------------------------- */

router.get('/gap-urgency', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const { gaps } = await analytics.fullAnalytics(getCity(req));
    const { page, limit } = parseListQuery(req.query);
    return ok(res, ...flip(paginate(gaps, { page, limit }, { weights: analytics.GAP_WEIGHTS })));
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* Demand Forecasting                                                     */
/* --------------------------------------------------------------------- */

router.get('/forecast', requireCapability('analytics:read'), validate([
  query('granularity').optional().isIn(['hourly', 'daily', 'weekly', 'seasonal']),
  query('horizon').optional().isInt({ min: 1, max: 90 }),
]), async (req, res, next) => {
  try {
    const result = await forecastService.forecastDemand({
      granularity: req.query.granularity || 'daily',
      horizon: req.query.horizon || 14,
      zoneId: req.query.zone_id || null,
    });
    return ok(res, result);
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* Recommendations                                                        */
/* --------------------------------------------------------------------- */

router.get('/recommendations', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const db = await getDb();
    let rows = await db.select('recommendations');
    if (!rows.length) {
      const recs = await recommendationService.generateRecommendations();
      rows = await recommendationService.persistRecommendations(recs);
    }
    const { page, limit, q } = parseListQuery(req.query);
    const type = (req.query.type || '').toString();
    const status = (req.query.status || '').toString();
    let filtered = rows.filter((r) => matchesSearch(r, q, ['title', 'problem']));
    if (type) filtered = filtered.filter((r) => r.rec_type === type);
    if (status) filtered = filtered.filter((r) => r.status === status);
    filtered = [...filtered].sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    return ok(res, ...flip(paginate(filtered, { page, limit })));
  } catch (err) { return next(err); }
});

router.post('/recommendations/generate', requireCapability('recommendations:write'), async (req, res, next) => {
  try {
    const recs = await recommendationService.generateRecommendations();
    const stored = await recommendationService.persistRecommendations(recs);
    await notificationService.notify({
      kind: 'recommendation', severity: 'info',
      title: `${stored.length} new recommendations generated`,
      body: 'The AI Recommendation Engine produced fresh investment cases from the latest analytics run.',
    });
    return created(res, stored);
  } catch (err) { return next(err); }
});

router.patch('/recommendations/:id', requireCapability('recommendations:write'), validate([
  param('id').isString(),
  body('status').optional().isIn(['proposed', 'approved', 'in_progress', 'implemented', 'rejected']),
  body('priority_level').optional().isIn(['low', 'medium', 'high', 'critical']),
]), async (req, res, next) => {
  try {
    const db = await getDb();
    const patch = {};
    if (req.body.status) {
      if (['approved', 'implemented'].includes(req.body.status)) requireCapability('recommendations:approve');
      patch.status = req.body.status;
    }
    if (req.body.priority_level) patch.priority_level = req.body.priority_level;
    const rows = await db.update('recommendations', { id: req.params.id }, patch);
    if (!rows.length) throw new HttpError(404, 'Recommendation not found');
    return ok(res, rows[0]);
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* What-if Simulation                                                     */
/* --------------------------------------------------------------------- */

router.post('/simulations', requireCapability('simulation:run'), validate([
  body('name').trim().isLength({ min: 3 }),
  body('kind').isIn(['bus_stop', 'bus_route', 'metro_station', 'bike_share', 'ev_station']),
  body('coordinates').isArray({ min: 2, max: 2 }),
  body('radius_km').optional().isFloat({ min: 0.2, max: 20 }),
]), async (req, res, next) => {
  try {
    const record = await simulationService.runSimulation({
      name: req.body.name,
      kind: req.body.kind,
      coordinates: req.body.coordinates.map(Number),
      radius_km: parseFloat(req.body.radius_km || '1.5'),
      createdBy: req.user.id,
    });
    return created(res, record);
  } catch (err) { return next(err); }
});

router.get('/simulations', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.select('simulations');
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const { page, limit } = parseListQuery(req.query);
    return ok(res, ...flip(paginate(rows, { page, limit })));
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* Reports                                                                */
/* --------------------------------------------------------------------- */

router.post('/reports', requireCapability('reports:write'), validate([
  body('reportType').optional().isIn(['mobility_overview', 'connectivity', 'first_last_mile', 'demand_forecast', 'investment_plan']),
  body('period').optional().isIn(['daily', 'weekly', 'monthly', 'annual']),
  body('format').optional().isIn(['pdf', 'excel', 'csv']),
]), async (req, res, next) => {
  try {
    const format = req.body.format || 'pdf';
    const { record, buffer, mime, storageUrl } = await reportService.generateReport({
      reportType: req.body.reportType || 'mobility_overview',
      period: req.body.period || 'monthly',
      format,
      userId: req.user.id,
    });
    await notificationService.notify({
      userId: req.user.id, kind: 'report_ready', severity: 'info',
      title: 'Report generated',
      body: `"${record.title}" is ready to download.`,
      data: { report_id: record.id },
    });
    if (req.query.download === 'true') {
      const ext = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'csv';
      res.status(201);
      res.setHeader('Content-Type', mime);
      res.setHeader('Content-Disposition', `attachment; filename="urbanflow-${record.report_type}-${record.id.slice(0, 8)}.${ext}"`);
      return res.send(buffer);
    }
    return created(res, { report: record, storage_url: storageUrl, bytes: buffer.length });
  } catch (err) { return next(err); }
});

router.get('/reports', requireCapability('reports:write'), async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.select('reports');
    rows.sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at));
    const { page, limit } = parseListQuery(req.query);
    return ok(res, ...flip(paginate(rows.map(({ content, ...r }) => r), { page, limit })));
  } catch (err) { return next(err); }
});

router.get('/reports/:id/download', requireCapability('reports:write'), async (req, res, next) => {
  try {
    const db = await getDb();
    const [report] = await db.select('reports', { id: req.params.id });
    if (!report) throw new HttpError(404, 'Report not found');
    const format = report.format || 'pdf';
    let buffer; let mime;
    if (format === 'pdf') { buffer = await reportService.generatePdf(report.content); mime = 'application/pdf'; }
    else if (format === 'excel') { buffer = reportService.generateExcel(report.content); mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; }
    else { buffer = Buffer.from(reportService.generateCsv(report.content)); mime = 'text/csv'; }
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `attachment; filename="urbanflow-report-${report.id.slice(0, 8)}.${format === 'excel' ? 'xlsx' : format}"`);
    return res.send(buffer);
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* AI Mobility Copilot                                                    */
/* --------------------------------------------------------------------- */

router.post('/copilot/chat', requireCapability('copilot:use'), validate([
  body('message').trim().isLength({ min: 2, max: 2000 }),
  body('sessionId').optional().isString(),
]), async (req, res, next) => {
  try {
    const result = await copilotService.chat({
      message: req.body.message,
      sessionId: req.body.sessionId,
      user: req.user,
    });
    return ok(res, result);
  } catch (err) { return next(err); }
});

router.get('/copilot/sessions/:sessionId', requireCapability('copilot:use'), async (req, res, next) => {
  try {
    const rows = await copilotService.history(req.params.sessionId);
    return ok(res, rows);
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* Notifications                                                          */
/* --------------------------------------------------------------------- */

router.get('/notifications', requireCapability('notifications:read'), async (req, res, next) => {
  try {
    const rows = await notificationService.listForUser(req.user.id, { includeRead: req.query.include_read !== 'false' });
    return ok(res, { unread: rows.filter((r) => !r.is_read).length, items: rows.slice(0, 50) });
  } catch (err) { return next(err); }
});

router.post('/notifications/:id/read', requireCapability('notifications:read'), async (req, res, next) => {
  try {
    const n = await notificationService.markRead(req.params.id, req.user.id);
    return ok(res, n);
  } catch (err) { return next(err); }
});

router.post('/notifications/read-all', requireCapability('notifications:read'), async (req, res, next) => {
  try {
    const n = await notificationService.markAllRead(req.user.id);
    return ok(res, { marked: n });
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */
/* Administration                                                         */
/* --------------------------------------------------------------------- */

router.get('/admin/users', requireCapability('users:read'), async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = (await db.select('users')).map(({ password_hash, ...u }) => u);
    const { page, limit, q } = parseListQuery(req.query);
    return ok(res, ...flip(paginate(rows.filter((u) => matchesSearch(u, q, ['email', 'full_name'])), { page, limit })));
  } catch (err) { return next(err); }
});

router.patch('/admin/users/:id', requireCapability('users:write'), validate([
  body('role').optional().isIn(['administrator', 'city_planner', 'transport_authority', 'analyst']),
  body('is_active').optional().isBoolean(),
]), async (req, res, next) => {
  try {
    const db = await getDb();
    const patch = {};
    if (req.body.role) patch.role = req.body.role;
    if (typeof req.body.is_active === 'boolean') patch.is_active = req.body.is_active;
    const rows = await db.update('users', { id: req.params.id }, patch);
    if (!rows.length) throw new HttpError(404, 'User not found');
    const { password_hash, ...u } = rows[0];
    return ok(res, u);
  } catch (err) { return next(err); }
});

router.get('/admin/audit', requireCapability('audit:read'), async (req, res, next) => {
  try {
    const db = await getDb();
    const rows = await db.select('audit_logs');
    rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const { page, limit } = parseListQuery(req.query);
    return ok(res, ...flip(paginate(rows, { page, limit })));
  } catch (err) { return next(err); }
});

router.get('/admin/capabilities', requireCapability('users:read'), async (req, res, next) => {
  try {
    const { CAPABILITIES, ROLE_DASHBOARDS } = require('../middleware/rbac');
    return ok(res, { capabilities: CAPABILITIES, role_dashboards: ROLE_DASHBOARDS });
  } catch (err) { return next(err); }
});

/* --------------------------------------------------------------------- */

/** paginate() returns {rows, meta}; ok() wants (data, meta). */
function flip({ rows, meta }) { return [rows, meta]; }

module.exports = router;
