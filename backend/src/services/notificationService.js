'use strict';

const { getDb } = require('../config/database');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function notify({ userId = null, kind = 'system', severity = 'info', title, body, data = {} }) {
  const db = await getDb();
  return db.insert('notifications', {
    tenant_id: TENANT_ID, user_id: userId, kind, severity, title, body, data,
    is_read: false, created_at: new Date().toISOString(),
  });
}

/** Pushes system alerts derived from current analytics (used by the engine cron). */
async function pushAnalyticsAlerts() {
  const { fullAnalytics } = require('./analyticsService');
  const { connectivity, gaps } = await fullAnalytics();
  const pushed = [];

  const deserts = connectivity.filter((c) => c.is_transit_desert);
  if (deserts.length) {
    pushed.push(await notify({
      kind: 'gap_alert', severity: 'warning',
      title: `${deserts.length} transit deserts detected`,
      body: `Zones failing accessibility thresholds: ${deserts.map((d) => d.zone_name).join(', ')}. Review First-Mile Analytics for interventions.`,
      data: { zone_ids: deserts.map((d) => d.zone_id) },
    }));
  }

  const critical = gaps.filter((g) => g.urgency_score > 0.7);
  if (critical.length) {
    pushed.push(await notify({
      kind: 'gap_alert', severity: 'critical',
      title: 'High-urgency investment zones flagged',
      body: `${critical.map((c) => c.zone_name).join(', ')} crossed the critical Gap Urgency threshold.`,
      data: { zones: critical.map((c) => ({ zone_id: c.zone_id, score: c.urgency_score })) },
    }));
  }

  const { forecastDemand } = require('./forecastService');
  const f = await forecastDemand({ granularity: 'daily', horizon: 7 });
  if (Math.abs(f.trend_pct) > 8) {
    pushed.push(await notify({
      kind: 'demand_anomaly', severity: f.trend_pct > 0 ? 'info' : 'warning',
      title: `Demand ${f.trend_pct > 0 ? 'surge' : 'drop'} predicted`,
      body: `Forecast trend is ${f.trend_pct}% — consider ${f.trend_pct > 0 ? 'boosting peak capacity' : 'adjusting schedules to protect cost recovery'}.`,
      data: { trend_pct: f.trend_pct },
    }));
  }

  return pushed;
}

async function listForUser(userId, { includeRead = true } = {}) {
  const db = await getDb();
  const rows = await db.select('notifications', {}, (r) => (r.user_id === userId || r.user_id === null)
    && (includeRead || !r.is_read));
  rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return rows;
}

async function markRead(id, userId) {
  const db = await getDb();
  const rows = await db.update('notifications', { id }, { is_read: true, read_at: new Date().toISOString() });
  return rows.find((r) => r.user_id === userId || r.user_id === null) || rows[0] || null;
}

async function markAllRead(userId) {
  const all = await listForUser(userId, { includeRead: false });
  const db = await getDb();
  for (const n of all) {
    await db.update('notifications', { id: n.id }, { is_read: true, read_at: new Date().toISOString() });
  }
  return all.length;
}

module.exports = { notify, pushAnalyticsAlerts, listForUser, markRead, markAllRead };
