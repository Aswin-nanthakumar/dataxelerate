'use strict';

/**
 * AI Recommendation Engine.
 *
 * Each recommendation is a complete business case: problem, root cause,
 * estimated cost, expected impact, ROI, priority and implementation roadmap.
 * The rule/heuristic engine runs everywhere; when Gemini/OpenAI keys are
 * present the narrative fields are polished by the LLM layer in ai-service.
 */

const { getDb } = require('../config/database');
const { fullAnalytics } = require('./analyticsService');
const { rand } = require('./synthetic');

const COST_TABLE = {
  new_bus_route: { unit: 850000, opex: 240000 },
  shuttle_service: { unit: 320000, opex: 150000 },
  bike_share: { unit: 140000, opex: 60000 },
  ev_station: { unit: 95000, opex: 25000 },
  route_optimization: { unit: 60000, opex: 15000 },
  service_expansion: { unit: 400000, opex: 180000 },
  pedestrian_improvement: { unit: 210000, opex: 12000 },
};

const IMPACT_TABLE = {
  new_bus_route: { ridership: 12, congestion: 6, accessibility: 0.18, carbon: 420 },
  shuttle_service: { ridership: 7, congestion: 4, accessibility: 0.14, carbon: 210 },
  bike_share: { ridership: 3, congestion: 3, accessibility: 0.09, carbon: 95 },
  ev_station: { ridership: 1, congestion: 1, accessibility: 0.04, carbon: 260 },
  route_optimization: { ridership: 5, congestion: 5, accessibility: 0.07, carbon: 180 },
  service_expansion: { ridership: 9, congestion: 4, accessibility: 0.11, carbon: 300 },
  pedestrian_improvement: { ridership: 2, congestion: 1, accessibility: 0.12, carbon: 45 },
};

function roadmapFor(type, priority) {
  const phases = {
    low: [30, 90, 180],
    medium: [21, 60, 120],
    high: [14, 45, 90],
    critical: [7, 30, 60],
  }[priority] || [21, 60, 120];

  return [
    { phase: 'Design & consultation', days: phases[0], detail: 'Site surveys, stakeholder consultation, ridership modelling sign-off' },
    { phase: 'Procurement & infrastructure', days: phases[1], detail: 'Tendering, fleet/station procurement, depot & depot-link works' },
    { phase: 'Pilot launch & measurement', days: phases[2], detail: 'Soft launch with KPI instrumentation (ridership, wait times, coverage)' },
  ];
}

function roiFor(type, cost, impact, urgency) {
  // 5-year monetised benefit: ridership farebox + congestion time value + carbon.
  const annualBenefit = impact.ridership * 48000 + impact.congestion * 30000 + impact.carbon * 45;
  const fiveYear = annualBenefit * 5 * (0.7 + urgency * 0.6);
  const roi = (fiveYear - cost) / (cost || 1);
  return { roi: Number(roi.toFixed(2)), annual_benefit_usd: Math.round(annualBenefit) };
}

function buildRecommendation({ type, zone, urgencyRow, connectivityRow, extraProblem }) {
  const cost = COST_TABLE[type];
  const baseImpact = IMPACT_TABLE[type];
  const deficit = urgencyRow ? urgencyRow.connectivity_deficit : 0.5;
  const urgency = urgencyRow ? urgencyRow.urgency_score : 0.5;
  const scale = 0.7 + deficit * 0.8;

  const impact = {
    ridership_increase_pct: Number((baseImpact.ridership * scale).toFixed(1)),
    congestion_reduction_pct: Number((baseImpact.congestion * scale).toFixed(1)),
    accessibility_gain: Number((baseImpact.accessibility * scale).toFixed(3)),
    carbon_savings_tons_yr: Math.round(baseImpact.carbon * scale),
  };

  const estimated_cost_usd = Math.round(cost.unit * (0.85 + rand(`c-${type}-${zone.code}`) * 0.3) + cost.opex);
  const { roi, annual_benefit_usd } = roiFor(type, estimated_cost_usd, impact, urgency);

  const priority_level = urgency > 0.72 ? 'critical' : urgency > 0.58 ? 'high' : urgency > 0.4 ? 'medium' : 'low';

  const problems = {
    new_bus_route: `No high-frequency trunk service inside ${zone.name}; residents face ${connectivityRow ? connectivityRow.details.nearest_transit_km.toFixed(1) : '2+'} km walks to transit`,
    shuttle_service: `Weak feeder layer isolating ${zone.name} from the rapid-transit network`,
    bike_share: `Missing shared micromobility in ${zone.name}, forcing short car/taxi hops for access trips`,
    ev_station: `EV charging desert in fast-growing ${zone.name}`,
    route_optimization: `Existing routes through ${zone.name} under-perform on reliability and overlap`,
    service_expansion: `Service span/frequency in ${zone.name} does not match observed demand peaks`,
    pedestrian_improvement: `Unsafe or uncomfortable walking environment around transit in ${zone.name}`,
  };

  const rootCauses = {
    new_bus_route: 'Historic network design prioritised arterial coverage over neighbourhood penetration; population outgrew fixed routes',
    shuttle_service: 'Low-density land use makes fixed-route feeder buses uneconomic without demand-responsive shuttles',
    bike_share: 'Dock investment lagged residential growth; last-mile mode share dominated by two-wheelers',
    ev_station: 'Charger deployment followed early-adopter districts, skipping growth corridors',
    route_optimization: 'Headways drifted from schedules; duplicated segments add operating cost without coverage gain',
    service_expansion: 'Timetables frozen at pre-growth demand levels while zone population compounding at '
      + `${((zone.growth_rate || 0) * 100).toFixed(1)}%/yr`,
    pedestrian_improvement: 'Footway and lighting budgets deferred relative to road-widening schemes',
  };

  return {
    zone_id: zone.id,
    zone_name: zone.name,
    zone_code: zone.code,
    rec_type: type,
    title: {
      new_bus_route: `New feeder bus route — ${zone.name}`,
      shuttle_service: `On-demand shuttle — ${zone.name}`,
      bike_share: `Bike-share station cluster — ${zone.name}`,
      ev_station: `EV charging hub — ${zone.name}`,
      route_optimization: `Route network optimisation — ${zone.name}`,
      service_expansion: `Service expansion plan — ${zone.name}`,
      pedestrian_improvement: `Walk-access improvement — ${zone.name}`,
    }[type],
    problem: extraProblem || problems[type],
    root_cause: rootCauses[type],
    estimated_cost_usd,
    expected_impact: { ...impact, annual_benefit_usd },
    roi,
    priority_level,
    priority_score: Number(urgency.toFixed(3)),
    roadmap: roadmapFor(type, priority_level),
    generated_by: 'urbanflow-rule-engine-v2',
  };
}

function planTypesFor(urgencyRow, connectivityRow, firstMileIssue, lastMileIssue) {
  const types = [];
  if (firstMileIssue) {
    if (firstMileIssue.barriers.missing_feeder_route) types.push('new_bus_route', 'shuttle_service');
    if (firstMileIssue.barriers.missing_intermodal) types.push('bike_share');
  }
  if (lastMileIssue) {
    if (lastMileIssue.missing_services.bike_share) types.push('bike_share');
    if (lastMileIssue.missing_services.ev_charger && urgencyRow && urgencyRow.growth_rate > 0.5) types.push('ev_station');
    if (lastMileIssue.missing_services.feeder_route) types.push('route_optimization');
    if (lastMileIssue.missing_services.park_and_ride) types.push('service_expansion');
  }
  if (connectivityRow && connectivityRow.frequency_score < 0.45) types.push('service_expansion');
  if (urgencyRow && urgencyRow.vulnerability_index > 0.6) types.push('pedestrian_improvement');
  return [...new Set(types)].slice(0, 4);
}

async function generateRecommendations() {
  const { base, connectivity, firstMile, lastMile, gaps } = await fullAnalytics();
  const out = [];

  for (const zone of base.zones) {
    const c = connectivity.find((x) => x.zone_id === zone.id);
    const g = gaps.find((x) => x.zone_id === zone.id);
    const fm = firstMile.find((x) => x.zone_id === zone.id);
    const lm = lastMile.find((x) => x.zone_id === zone.id);
    const types = planTypesFor(g, c, fm, lm);
    for (const type of types) out.push(buildRecommendation({ type, zone, urgencyRow: g, connectivityRow: c }));
  }

  out.sort((a, b) => b.priority_score - a.priority_score || b.roi - a.roi);
  return out.slice(0, 24);
}

async function persistRecommendations(recs) {
  const db = await getDb();
  const stored = [];
  for (const r of recs) {
    stored.push(await db.insert('recommendations', {
      tenant_id: '11111111-1111-1111-1111-111111111111',
      zone_id: r.zone_id,
      rec_type: r.rec_type,
      status: 'proposed',
      title: r.title,
      problem: r.problem,
      root_cause: r.root_cause,
      estimated_cost_usd: r.estimated_cost_usd,
      expected_impact: r.expected_impact,
      roi: r.roi,
      priority_level: r.priority_level,
      priority_score: r.priority_score,
      roadmap: r.roadmap,
      generated_by: r.generated_by,
    }));
  }
  return stored;
}

module.exports = { generateRecommendations, persistRecommendations, buildRecommendation, COST_TABLE, IMPACT_TABLE };
