'use strict';

/**
 * Core mobility analytics:
 *  - Composite Connectivity Score (distance, frequency, reliability, safety, intermodal)
 *  - First-mile / last-mile gap detection (transit deserts, access barriers)
 *  - Gap Urgency Index (investment prioritisation)
 *  - Dashboard rollups
 *
 * Scoring is deterministic and transparent (documented weights) so planners can
 * audit every number — a hard requirement for public-sector decision making.
 */

const { getDb } = require('../config/database');
const { haversineKm, resolveCityTenant } = require('./synthetic');

const WEIGHTS = {
  distance: 0.30,
  frequency: 0.20,
  reliability: 0.15,
  safety: 0.15,
  intermodal: 0.20,
};

const GAP_WEIGHTS = {
  population_density: 0.25,
  economic_activity: 0.15,
  vulnerability_index: 0.25,
  growth_rate: 0.15,
  connectivity_deficit: 0.20,
};

const TRANSIT_DESERT_THRESHOLD = 0.35;   // composite < this ⇒ desert
const WALK_BARRIER_KM = 1.2;             // > 1.2 km walk to transit ⇒ first-mile barrier

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function zoneCenter(zone) {
  if (zone.centroid && zone.centroid.coordinates) return zone.centroid.coordinates;
  if (zone.properties && typeof zone.properties.cx === 'number') return [zone.properties.cx, zone.properties.cy];
  return [80.15, 13.05];
}

function nearestTransit(zone, points, modes = null) {
  const [cx, cy] = zoneCenter(zone);
  let best = null;
  for (const p of points) {
    if (modes && !modes.includes(p.mode)) continue;
    if (p.is_active === false) continue;
    const d = haversineKm(cx, cy, p.geom.coordinates[0], p.geom.coordinates[1]);
    if (!best || d < best.km) best = { point: p, km: d };
  }
  return best;
}

function scoreDistance(km) {
  // 400 m or closer → 1.0; 2 km or further → 0. Piecewise linear between.
  if (km <= 0.4) return 1;
  if (km >= 2) return 0;
  return clamp01(1 - (km - 0.4) / 1.6);
}

function scoreFrequency(minutes) {
  if (minutes <= 5) return 1;
  if (minutes >= 45) return 0;
  return clamp01(1 - (minutes - 5) / 40);
}

async function loadBase(cityOrTenantId = null) {
  const tenant = resolveCityTenant(cityOrTenantId);
  const db = await getDb();
  const [zones, points, routes] = await Promise.all([
    db.select('zones', { tenant_id: tenant.id }),
    db.select('transit_points', { tenant_id: tenant.id }),
    db.select('routes', { tenant_id: tenant.id }),
  ]);
  return { zones, points, routes, tenant };
}

function routesServingZone(zone, routes, points) {
  const ids = new Set(points.filter((p) => p.zone_id === zone.id).map((p) => p.id));
  return routes.filter((r) => {
    if (r.is_active === false) return false;
    // Geometric proximity fallback: route passes within 1.5 km of zone centre.
    const [cx, cy] = zoneCenter(zone);
    if (r.geom && r.geom.coordinates) {
      return r.geom.coordinates.some(([x, y]) => haversineKm(cx, cy, x, y) < 1.5);
    }
    return ids.has(r.id);
  });
}

/** Composite Connectivity Score per zone. */
function computeConnectivity({ zones, points, routes }) {
  return zones.map((zone) => {
    const nearby = routesServingZone(zone, routes, points);
    const nearest = nearestTransit(zone, points, ['bus', 'metro', 'rail', 'tram', 'ferry']);
    const walkKm = nearest ? nearest.km : 5;

    const distanceScore = scoreDistance(walkKm);
    const freqVals = nearby.length ? nearby.map((r) => scoreFrequency(r.frequency_min)) : [0];
    const frequencyScore = clamp01(freqVals.reduce((a, b) => a + b, 0) / freqVals.length);
    const reliabilityScore = nearby.length
      ? clamp01(nearby.reduce((a, r) => a + (r.reliability || 0.5), 0) / nearby.length) : 0;
    const safetyScore = nearby.length
      ? clamp01(nearby.reduce((a, r) => a + (r.safety_score || 0.5), 0) / nearby.length) : 0;

    const modesHere = new Set(points.filter((p) => p.zone_id === zone.id && p.is_active !== false).map((p) => p.mode));
    ['bike_share', 'ev_charger', 'parking'].forEach(() => {});
    const intermodalScore = clamp01(modesHere.size / 4); // bus/metro + 2 shared modes

    const composite = clamp01(
      WEIGHTS.distance * distanceScore
      + WEIGHTS.frequency * frequencyScore
      + WEIGHTS.reliability * reliabilityScore
      + WEIGHTS.safety * safetyScore
      + WEIGHTS.intermodal * intermodalScore,
    );

    // First mile: resident → transit access. Last mile: transit → destination spread.
    const firstMile = clamp01(0.65 * distanceScore + 0.35 * intermodalScore);
    const stopDensity = points.filter((p) => p.zone_id === zone.id && ['bus', 'metro'].includes(p.mode)).length;
    const lastMile = clamp01(0.5 * Math.min(1, stopDensity / 4) + 0.3 * safetyScore + 0.2 * intermodalScore);
    const accessibility = clamp01(0.5 * composite + 0.3 * lastMile + 0.2 * (nearby.length ? 1 : 0));

    const coveragePct = clamp01(1 - Math.max(0, walkKm - 0.4) / 1.6) * (nearby.length ? 1 : 0.35);

    return {
      zone_id: zone.id,
      zone_name: zone.name,
      zone_code: zone.code,
      computed_at: new Date().toISOString(),
      distance_to_transit: Number(distanceScore.toFixed(4)),
      frequency_score: Number(frequencyScore.toFixed(4)),
      reliability_score: Number(reliabilityScore.toFixed(4)),
      safety_score: Number(safetyScore.toFixed(4)),
      intermodal_score: Number(intermodalScore.toFixed(4)),
      composite_score: Number(composite.toFixed(4)),
      first_mile_score: Number(firstMile.toFixed(4)),
      last_mile_score: Number(lastMile.toFixed(4)),
      accessibility_score: Number(accessibility.toFixed(4)),
      coverage_pct: Number(coveragePct.toFixed(4)),
      is_transit_desert: composite < TRANSIT_DESERT_THRESHOLD || walkKm > WALK_BARRIER_KM,
      details: {
        nearest_transit_km: Number(walkKm.toFixed(3)),
        nearest_transit: nearest ? { id: nearest.point.id, name: nearest.point.name, mode: nearest.point.mode } : null,
        routes_serving: nearby.length,
        modes_available: [...modesHere],
        walk_barrier: walkKm > WALK_BARRIER_KM,
        weights: WEIGHTS,
      },
    };
  });
}

/** First-mile problem detection. */
function computeFirstMile(base, connectivity) {
  const issues = [];
  for (const c of connectivity) {
    const zone = base.zones.find((z) => z.id === c.zone_id);
    const reasons = [];
    if (c.details.walk_barrier) reasons.push(`Nearest transit is ${c.details.nearest_transit_km} km away (walk barrier > ${WALK_BARRIER_KM} km)`);
    if (c.frequency_score < 0.4) reasons.push('Headways too wide to support spontaneous trips');
    if (c.intermodal_score < 0.25) reasons.push('No shared/feeder modes (bike share, shuttle, park-and-ride)');
    if (c.is_transit_desert) reasons.push('Zone qualifies as a transit desert');

    if (reasons.length) {
      issues.push({
        zone_id: c.zone_id, zone_name: c.zone_name, zone_code: c.zone_code,
        severity: c.composite_score < 0.3 ? 'critical' : c.composite_score < 0.5 ? 'warning' : 'info',
        first_mile_score: c.first_mile_score,
        problems: reasons,
        barriers: {
          walking_distance_km: c.details.nearest_transit_km,
          missing_feeder_route: c.details.routes_serving === 0,
          missing_intermodal: c.intermodal_score < 0.25,
          low_income_vulnerability: (zone ? zone.vulnerability_index : 0) > 0.5,
        },
        suggestions: buildFirstMileSuggestions(c, zone),
      });
    }
  }
  issues.sort((a, b) => a.first_mile_score - b.first_mile_score);
  return issues;
}

function buildFirstMileSuggestions(c, zone) {
  const out = [];
  if (c.details.nearest_transit_km > WALK_BARRIER_KM) {
    out.push({ type: 'shuttle_service', text: `Launch on-demand feeder shuttle linking ${c.zone_name} to ${c.details.nearest_transit ? c.details.nearest_transit.name : 'nearest hub'}` });
    out.push({ type: 'new_bus_route', text: `Extend trunk bus coverage with a stop inside ${c.zone_name} (target walk shed 400–800 m)` });
  }
  if (c.frequency_score < 0.4) out.push({ type: 'route_optimization', text: 'Improve peak headways to ≤ 12 min on the serving route' });
  if (c.intermodal_score < 0.25) {
    out.push({ type: 'bike_share', text: `Site a 20–24 dock bike-share station near ${c.zone_name} centre` });
    if (zone && zone.growth_rate > 0.04) out.push({ type: 'ev_station', text: 'Add EV charging to support park-and-ride growth corridors' });
  }
  return out;
}

/** Last-mile problem detection (destination-side access). */
function computeLastMile(base, connectivity) {
  const issues = [];
  for (const c of connectivity) {
    const zone = base.zones.find((z) => z.id === c.zone_id);
    const stopDensity = base.points.filter((p) => p.zone_id === c.zone_id && ['bus', 'metro'].includes(p.mode)).length;
    const reasons = [];
    if (stopDensity <= 1) reasons.push('Destinations rely on a single access point');
    if (c.last_mile_score < 0.45) reasons.push('Weak alight-side circulation (few stops, low shared-mode coverage)');
    if (c.safety_score < 0.6) reasons.push('Safety score below acceptable threshold for pedestrian egress');
    if ((zone ? zone.economic_activity : 0) > 0.7 && stopDensity < 4) {
      reasons.push('High destination attractiveness underserved by alight points');
    }

    if (reasons.length) {
      issues.push({
        zone_id: c.zone_id, zone_name: c.zone_name, zone_code: c.zone_code,
        severity: c.last_mile_score < 0.35 ? 'critical' : c.last_mile_score < 0.55 ? 'warning' : 'info',
        last_mile_score: c.last_mile_score,
        problems: reasons,
        missing_services: {
          bike_share: !base.points.some((p) => p.zone_id === c.zone_id && p.mode === 'bike_share'),
          ev_charger: !base.points.some((p) => p.zone_id === c.zone_id && p.mode === 'ev_charger'),
          park_and_ride: !base.points.some((p) => p.zone_id === c.zone_id && p.mode === 'parking'),
          feeder_route: stopDensity < 2,
        },
        suggestions: buildLastMileSuggestions(c, zone, stopDensity),
      });
    }
  }
  issues.sort((a, b) => a.last_mile_score - b.last_mile_score);
  return issues;
}

function buildLastMileSuggestions(c, zone, stopDensity) {
  const out = [];
  if (stopDensity < 2) out.push({ type: 'new_bus_route', text: `Add 2–3 alight-side stops across ${c.zone_name} to spread destination access` });
  out.push({ type: 'route_optimization', text: 'Micro-transit loop connecting station exits to top destination clusters' });
  if ((zone ? zone.economic_activity : 0) > 0.6) {
    out.push({ type: 'service_expansion', text: 'Extend evening service span to match commercial activity hours' });
  }
  if (c.safety_score < 0.6) out.push({ type: 'pedestrian_improvement', text: 'Pedestrian lighting + footpath upgrade on egress corridors' });
  return out;
}

/** Gap Urgency Index — investment prioritisation. */
function computeGapUrgency(base, connectivity) {
  const maxPopDensity = Math.max(...base.zones.map((z) => z.population / z.area_sq_km), 1);
  const rows = base.zones.map((zone) => {
    const c = connectivity.find((x) => x.zone_id === zone.id);
    const population_density = clamp01((zone.population / zone.area_sq_km) / maxPopDensity);
    const economic_activity = clamp01(zone.economic_activity);
    const vulnerability_index = clamp01(zone.vulnerability_index);
    const growth_rate = clamp01(zone.growth_rate / 0.10);
    const connectivity_deficit = clamp01(1 - (c ? c.composite_score : 0));

    const urgency = clamp01(
      GAP_WEIGHTS.population_density * population_density
      + GAP_WEIGHTS.economic_activity * economic_activity
      + GAP_WEIGHTS.vulnerability_index * vulnerability_index
      + GAP_WEIGHTS.growth_rate * growth_rate
      + GAP_WEIGHTS.connectivity_deficit * connectivity_deficit,
    );

    const investment = Math.round(
      (250000 + urgency * 3500000 + connectivity_deficit * 1200000) / 10000,
    ) * 10000;

    const actions = [];
    if (connectivity_deficit > 0.55) actions.push('Deploy new feeder routes within 6 months');
    if (growth_rate > 0.5) actions.push('Pre-provision transit corridors ahead of demand growth');
    if (vulnerability_index > 0.55) actions.push('Prioritise affordable access programs (subsidised passes, walk safety)');
    if (economic_activity > 0.6 && connectivity_deficit > 0.4) actions.push('Peak-frequency uplift on commercial spines');
    if (!actions.length) actions.push('Maintain service quality; monitor quarterly');

    return {
      zone_id: zone.id, zone_name: zone.name, zone_code: zone.code,
      computed_at: new Date().toISOString(),
      population_density: Number(population_density.toFixed(4)),
      economic_activity: Number(economic_activity.toFixed(4)),
      vulnerability_index: Number(vulnerability_index.toFixed(4)),
      growth_rate: Number(growth_rate.toFixed(4)),
      connectivity_deficit: Number(connectivity_deficit.toFixed(4)),
      urgency_score: Number(urgency.toFixed(4)),
      investment_hint_usd: investment,
      suggested_actions: actions,
    };
  });

  rows.sort((a, b) => b.urgency_score - a.urgency_score);
  rows.forEach((r, i) => { r.priority_rank = i + 1; });
  return rows;
}

/** Congestion hotspots from traffic observations. */
async function congestionHotspots(limit = 10, cityOrTenantId = null) {
  const tenant = resolveCityTenant(cityOrTenantId);
  const db = await getDb();
  const traffic = await db.select('traffic_observations', { tenant_id: tenant.id });
  const bySegment = new Map();
  for (const t of traffic) {
    const arr = bySegment.get(t.segment_name) || [];
    arr.push(t.congestion_index);
    bySegment.set(t.segment_name, arr);
  }
  const out = [...bySegment.entries()].map(([segment, vals]) => {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const peakVals = vals; // all hours kept; peak ≈ upper quartile
    const sorted = [...vals].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || mean;
    return {
      segment_name: segment,
      avg_congestion: Number(mean.toFixed(3)),
      p95_congestion: Number(p95.toFixed(3)),
      hotspot_level: p95 > 0.75 ? 'critical' : p95 > 0.55 ? 'warning' : 'normal',
      sample_count: peakVals.length,
    };
  });
  out.sort((a, b) => b.p95_congestion - a.p95_congestion);
  return typeof limit === 'number' && limit > 0 ? out.slice(0, limit) : out;
}

/** Headline KPI rollup for the Smart Mobility Dashboard. */
async function dashboardSummary(cityOrTenantId = null) {
  const tenant = resolveCityTenant(cityOrTenantId);
  const db = await getDb();
  const base = await loadBase(tenant.id);
  const connectivity = computeConnectivity(base);
  const gaps = computeGapUrgency(base, connectivity);
  const ridership = await db.select('ridership_observations', { tenant_id: tenant.id });
  const totalRidership = ridership.reduce((a, r) => a + r.boardings, 0);
  const deserts = connectivity.filter((c) => c.is_transit_desert);
  const avgConnectivity = connectivity.reduce((a, c) => a + c.composite_score, 0) / (connectivity.length || 1);
  const hotspots = await congestionHotspots(10, tenant.id);

  // 7-day trend (last 7 distinct days in dataset)
  const byDay = new Map();
  for (const r of ridership) {
    const day = r.observed_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + r.boardings);
  }
  const trend = [...byDay.entries()].sort().slice(-7).map(([date, boardings]) => ({ date, boardings }));

  return {
    kpis: {
      total_zones: base.zones.length,
      total_stops: base.points.length,
      total_routes: base.routes.length,
      total_boardings: totalRidership,
      avg_daily_boardings: Math.round(totalRidership / 45),
      avg_connectivity_score: Number(avgConnectivity.toFixed(3)),
      transit_deserts: deserts.length,
      critical_hotspots: hotspots.filter((h) => h.hotspot_level === 'critical').length,
      coverage_pct: Number((connectivity.reduce((a, c) => a + c.coverage_pct, 0) / (connectivity.length || 1)).toFixed(3)),
    },
    ridership_trend: trend,
    top_gap_zones: gaps.slice(0, 5),
    congestion_hotspots: hotspots.slice(0, 5),
    connectivity_distribution: {
      excellent: connectivity.filter((c) => c.composite_score >= 0.75).length,
      good: connectivity.filter((c) => c.composite_score >= 0.55 && c.composite_score < 0.75).length,
      fair: connectivity.filter((c) => c.composite_score >= 0.4 && c.composite_score < 0.55).length,
      poor: connectivity.filter((c) => c.composite_score < 0.4).length,
    },
  };
}

async function fullAnalytics(cityOrTenantId = null) {
  const base = await loadBase(cityOrTenantId);
  const connectivity = computeConnectivity(base);
  const firstMile = computeFirstMile(base, connectivity);
  const lastMile = computeLastMile(base, connectivity);
  const gaps = computeGapUrgency(base, connectivity);
  return { base, connectivity, firstMile, lastMile, gaps };
}

module.exports = {
  WEIGHTS, GAP_WEIGHTS, TRANSIT_DESERT_THRESHOLD, WALK_BARRIER_KM,
  loadBase, computeConnectivity, computeFirstMile, computeLastMile,
  computeGapUrgency, congestionHotspots, dashboardSummary, fullAnalytics,
};
