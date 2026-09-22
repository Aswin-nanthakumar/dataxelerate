'use strict';

/**
 * Smart Mobility Dashboard + GIS data APIs.
 * Supports localized city filtering for cities (Chennai, Coimbatore, Bengaluru).
 */

const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireCapability } = require('../middleware/rbac');
const analytics = require('../services/analyticsService');
const { getDb } = require('../config/database');
const { ok } = require('../utils/response');
const { getCache } = require('../config/redis');
const { resolveCityTenant, CITIES, haversineKm } = require('../services/synthetic');

const router = express.Router();
router.use(requireAuth);

async function cached(key, ttl, producer) {
  const cache = await getCache();
  const hit = await cache.get(key);
  if (hit) return { data: hit, cached: true };
  const data = await producer();
  await cache.set(key, data, ttl);
  return { data, cached: false };
}

function getRequestedTenant(req) {
  const cityParam = req.query.city || req.query.tenant_id;
  if (cityParam) {
    return resolveCityTenant(cityParam);
  }
  if (req.user && req.user.tenantId) {
    return resolveCityTenant(req.user.tenantId);
  }
  return resolveCityTenant('chennai');
}

/** Available cities list for city selector. */
router.get('/cities', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const list = CITIES.map((c) => ({
      id: c.id,
      name: c.name,
      city_name: c.city_name,
      slug: c.slug,
      center: c.center,
      zoom: c.zoom,
    }));
    return ok(res, list);
  } catch (err) { return next(err); }
});

/** Role-aware dashboard payload. */
router.get('/dashboard', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const tenant = getRequestedTenant(req);
    const cacheKey = `dashboard:summary:${tenant.id}`;
    const { data, cached: wasCached } = await cached(cacheKey, 60, () => analytics.dashboardSummary(tenant.id));
    return ok(res, { ...data, role: req.user.role, city: tenant.city_name, tenant_id: tenant.id }, { cached: wasCached });
  } catch (err) { return next(err); }
});

router.get('/dashboard/kpis', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const tenant = getRequestedTenant(req);
    const cacheKey = `dashboard:summary:${tenant.id}`;
    const { data } = await cached(cacheKey, 60, () => analytics.dashboardSummary(tenant.id));
    return ok(res, data.kpis);
  } catch (err) { return next(err); }
});

/** GIS layers ---------------------------------------------------------- */

router.get('/gis/zones', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const tenant = getRequestedTenant(req);
    const db = await getDb();
    const rows = await db.select('zones', { tenant_id: tenant.id });
    const features = rows.map((z) => ({
      type: 'Feature',
      id: z.id,
      properties: {
        id: z.id, name: z.name, code: z.code, population: z.population,
        area_sq_km: z.area_sq_km, vulnerability_index: z.vulnerability_index,
        economic_activity: z.economic_activity, growth_rate: z.growth_rate,
        city: tenant.city_name,
      },
      geometry: z.geom,
    }));
    return ok(res, { type: 'FeatureCollection', features, city: tenant.city_name });
  } catch (err) { return next(err); }
});

router.get('/gis/points', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const tenant = getRequestedTenant(req);
    const db = await getDb();
    let rows = await db.select('transit_points', { tenant_id: tenant.id });
    const mode = (req.query.mode || '').toString();
    if (mode) rows = rows.filter((p) => p.mode === mode);
    const features = rows.map((p) => ({
      type: 'Feature',
      id: p.id,
      properties: {
        id: p.id, name: p.name, mode: p.mode, code: p.code,
        daily_ridership: p.daily_ridership, accessibility_score: p.accessibility_score,
        capacity: p.capacity, amenities: p.amenities,
        city: tenant.city_name,
      },
      geometry: p.geom,
    }));
    return ok(res, { type: 'FeatureCollection', features, city: tenant.city_name });
  } catch (err) { return next(err); }
});

router.get('/gis/routes', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const tenant = getRequestedTenant(req);
    const db = await getDb();
    const rows = await db.select('routes', { tenant_id: tenant.id });
    const features = rows.filter((r) => r.geom).map((r) => ({
      type: 'Feature',
      id: r.id,
      properties: {
        id: r.id, name: r.name, code: r.code, mode: r.mode, color: r.color,
        distance_km: r.distance_km, frequency_min: r.frequency_min,
        reliability: r.reliability, daily_ridership: r.daily_ridership,
        city: tenant.city_name,
      },
      geometry: r.geom,
    }));
    return ok(res, { type: 'FeatureCollection', features, city: tenant.city_name });
  } catch (err) { return next(err); }
});

/** Geo search + radius search + bbox filter for GIS workflows. */
router.get('/gis/search', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const tenant = getRequestedTenant(req);
    const db = await getDb();
    const q = (req.query.q || '').toString().toLowerCase();
    const radiusKm = parseFloat(req.query.radius_km || '0');
    const nearLat = parseFloat(req.query.lat || 'NaN');
    const nearLng = parseFloat(req.query.lng || 'NaN');
    const bbox = (req.query.bbox || '').toString(); // minLng,minLat,maxLng,maxLat

    let points = await db.select('transit_points', { tenant_id: tenant.id });
    let zones = await db.select('zones', { tenant_id: tenant.id });

    if (q) {
      points = points.filter((p) => p.name.toLowerCase().includes(q) || String(p.code || '').toLowerCase().includes(q));
      zones = zones.filter((z) => z.name.toLowerCase().includes(q) || z.code.toLowerCase().includes(q));
    }
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
      const inBox = ([lng, lat]) => lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
      points = points.filter((p) => inBox(p.geom.coordinates));
      zones = zones.filter((z) => inBox(z.centroid.coordinates));
    }
    if (radiusKm > 0 && Number.isFinite(nearLat) && Number.isFinite(nearLng)) {
      points = points.filter((p) => haversineKm(nearLng, nearLat, p.geom.coordinates[0], p.geom.coordinates[1]) <= radiusKm);
      zones = zones.filter((z) => haversineKm(nearLng, nearLat, z.centroid.coordinates[0], z.centroid.coordinates[1]) <= radiusKm + 2);
    }

    return ok(res, {
      city: tenant.city_name,
      points: points.map((p) => ({ id: p.id, name: p.name, mode: p.mode, code: p.code, coordinates: p.geom.coordinates })),
      zones: zones.map((z) => ({ id: z.id, name: z.name, code: z.code, coordinates: z.centroid.coordinates })),
    });
  } catch (err) { return next(err); }
});

/** Traffic / congestion + heat data ------------------------------------ */

router.get('/traffic/hotspots', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const tenant = getRequestedTenant(req);
    const { data } = await cached(`traffic:hotspots:${tenant.id}`, 90, () => analytics.congestionHotspots(10, tenant.id));
    return ok(res, data);
  } catch (err) { return next(err); }
});

router.get('/heatmap/:layer', requireCapability('analytics:read'), async (req, res, next) => {
  try {
    const allowed = ['ridership', 'congestion', 'connectivity', 'demand'];
    const layer = req.params.layer;
    if (!allowed.includes(layer)) throw new (require('../utils/response').HttpError)(422, `layer must be one of ${allowed.join('|')}`);
    const tenant = getRequestedTenant(req);
    const db = await getDb();
    const zones = await db.select('zones', { tenant_id: tenant.id });

    let points = [];
    if (layer === 'ridership' || layer === 'demand') {
      const obs = await db.select('ridership_observations', { tenant_id: tenant.id });
      const byZone = new Map();
      for (const o of obs) byZone.set(o.zone_id, (byZone.get(o.zone_id) || 0) + o.boardings);
      const max = Math.max(...byZone.values(), 1);
      points = zones.map((z) => ({
        lat: z.centroid.coordinates[1], lng: z.centroid.coordinates[0],
        intensity: Number(((byZone.get(z.id) || 0) / max).toFixed(3)),
        label: z.name,
      }));
    } else if (layer === 'congestion') {
      const traffic = await db.select('traffic_observations', { tenant_id: tenant.id });
      const bySeg = new Map();
      for (const t of traffic) {
        if (!t.geom) continue;
        bySeg.set(t.segment_name, Math.max(bySeg.get(t.segment_name) || 0, t.congestion_index));
      }
      const seen = new Set();
      points = traffic.filter((t) => t.geom && !seen.has(t.segment_name) && seen.add(t.segment_name))
        .map((t) => ({
          lat: t.geom.coordinates[1], lng: t.geom.coordinates[0],
          intensity: Number((bySeg.get(t.segment_name) || 0).toFixed(3)), label: t.segment_name,
        }));
    } else {
      const { connectivity } = await analytics.fullAnalytics(tenant.id);
      points = zones.map((z) => ({
        lat: z.centroid.coordinates[1], lng: z.centroid.coordinates[0],
        intensity: connectivity.find((c) => c.zone_id === z.id)?.composite_score || 0,
        label: z.name,
      }));
    }
    return ok(res, { layer, points, city: tenant.city_name });
  } catch (err) { return next(err); }
});

module.exports = router;
