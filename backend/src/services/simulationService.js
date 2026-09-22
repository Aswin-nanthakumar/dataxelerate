'use strict';

/**
 * What-if Simulation Engine — predict outcomes of planner interventions
 * (new stops, routes, metro stations, bike-share) before capital is committed.
 */

const { fullAnalytics } = require('./analyticsService');
const { getDb } = require('../config/database');
const { haversineKm } = require('./synthetic');

const KIND_MULTIPLIERS = {
  bus_stop: { ridership: 1.0, congestion: 0.8, access: 1.0, carbon: 1.0, cost: 85000 },
  bus_route: { ridership: 2.2, congestion: 1.4, access: 1.6, carbon: 2.4, cost: 850000 },
  metro_station: { ridership: 4.5, congestion: 2.6, access: 2.8, carbon: 5.2, cost: 22000000 },
  bike_share: { ridership: 0.6, congestion: 0.7, access: 0.9, carbon: 0.35, cost: 140000 },
  ev_station: { ridership: 0.2, congestion: 0.2, access: 0.3, carbon: 1.8, cost: 95000 },
};

async function runSimulation({ name, kind, coordinates, radius_km = 1.5, createdBy = null }) {
  const mult = KIND_MULTIPLIERS[kind];
  if (!mult) {
    const err = new Error('kind must be one of bus_stop|bus_route|metro_station|bike_share|ev_station');
    err.status = 422;
    throw err;
  }

  const { base, connectivity } = await fullAnalytics();
  const [x, y] = coordinates;

  // Affected zones: centres inside radius (or nearest zone if none).
  let affected = base.zones.filter((z) => {
    const [zx, zy] = z.centroid ? z.centroid.coordinates : [z.properties.cx, z.properties.cy];
    return haversineKm(x, y, zx, zy) <= radius_km;
  });
  if (!affected.length) {
    affected = [...base.zones].sort((a, b) => {
      const [ax, ay] = a.centroid.coordinates; const [bx, by] = b.centroid.coordinates;
      return haversineKm(x, y, ax, ay) - haversineKm(x, y, bx, by);
    }).slice(0, 1);
  }

  const rows = affected.map((z) => {
    const c = connectivity.find((cc) => cc.zone_id === z.id);
    const deficit = 1 - (c ? c.composite_score : 0.5);
    const popWeight = z.population / 210000;
    return { z, c, deficit, popWeight };
  });

  const avgDeficit = rows.reduce((a, r) => a + r.deficit, 0) / rows.length;
  const popFactor = rows.reduce((a, r) => a + r.popWeight, 0) / rows.length;

  const ridership_increase_pct = Number((2 + 14 * avgDeficit * mult.ridership * (0.6 + popFactor)).toFixed(2));
  const congestion_reduction_pct = Number((0.8 + 6 * avgDeficit * mult.congestion).toFixed(2));
  const accessibility_gain = Number(Math.min(0.45, 0.04 + 0.3 * avgDeficit * mult.access * 0.35).toFixed(3));
  const carbon_savings_tons_yr = Math.round(30 + 220 * avgDeficit * mult.carbon);

  const cost = Math.round(mult.cost * (kind === 'bus_route' ? (1 + avgDeficit) : 1));
  const annual_benefit = ridership_increase_pct * 21000 + congestion_reduction_pct * 34000 + carbon_savings_tons_yr * 45;
  const roi = Number(((annual_benefit * 5 - cost) / (cost || 1)).toFixed(2));

  const results = {
    affected_zones: rows.map((r) => ({
      zone_id: r.z.id, zone_name: r.z.name,
      current_score: r.c ? r.c.composite_score : null,
      projected_score: Number(Math.min(1, (r.c ? r.c.composite_score : 0.4) + accessibility_gain).toFixed(3)),
      walk_access_km_before: r.c ? r.c.details.nearest_transit_km : null,
      walk_access_km_after: r.c ? Number(Math.max(0.3, r.c.details.nearest_transit_km * 0.55).toFixed(2)) : null,
    })),
    assumptions: {
      radius_km, model: 'urbanflow-sim-v1',
      notes: 'Elasticities derived from platform benchmarks; retrain with observed pilot data for higher fidelity.',
    },
    projected_demand_curve: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      uplift_pct: Number((ridership_increase_pct * (0.35 + 0.65 * (1 - Math.exp(-(i + 1) / 4)))).toFixed(2)),
    })),
  };

  const db = await getDb();
  const record = await db.insert('simulations', {
    tenant_id: '11111111-1111-1111-1111-111111111111',
    created_by: createdBy,
    name,
    kind,
    parameters: { coordinates, radius_km },
    geometry: { type: 'Point', coordinates },
    results,
    ridership_increase_pct,
    congestion_reduction_pct,
    accessibility_gain,
    carbon_savings_tons_yr,
    roi,
    created_at: new Date().toISOString(),
  });

  return record;
}

module.exports = { runSimulation, KIND_MULTIPLIERS };
