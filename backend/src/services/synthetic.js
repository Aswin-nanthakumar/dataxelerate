'use strict';

/**
 * Deterministic synthetic mobility dataset for multi-city support (Chennai, Coimbatore, Bengaluru).
 * The same generator feeds the in-memory adapter and the SQL seeder, so
 * analytics behave identically in CI, demos and production-shaped deploys.
 */

const crypto = require('crypto');

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

const CHENNAI_ZONES = [
  { idx: 0, name: 'T. Nagar', code: 'WARD-001', population: 128000, area_sq_km: 6.4, vuln: 0.42, econ: 0.88, growth: 0.031 },
  { idx: 1, name: 'Adyar', code: 'WARD-002', population: 152000, area_sq_km: 8.1, vuln: 0.35, econ: 0.81, growth: 0.028 },
  { idx: 2, name: 'Velachery', code: 'WARD-003', population: 118000, area_sq_km: 7.2, vuln: 0.48, econ: 0.72, growth: 0.042 },
  { idx: 3, name: 'Anna Nagar', code: 'WARD-004', population: 141000, area_sq_km: 7.8, vuln: 0.28, econ: 0.86, growth: 0.022 },
  { idx: 4, name: 'Tambaram', code: 'WARD-005', population: 176000, area_sq_km: 12.5, vuln: 0.55, econ: 0.61, growth: 0.055 },
  { idx: 5, name: 'Porur', code: 'WARD-006', population: 132000, area_sq_km: 10.2, vuln: 0.51, econ: 0.58, growth: 0.061 },
  { idx: 6, name: 'Ambattur', code: 'WARD-007', population: 189000, area_sq_km: 14.1, vuln: 0.58, econ: 0.55, growth: 0.058 },
  { idx: 7, name: 'Royapuram', code: 'WARD-008', population: 164000, area_sq_km: 5.2, vuln: 0.66, econ: 0.49, growth: 0.019 },
  { idx: 8, name: 'Thiruvanmiyur', code: 'WARD-009', population: 97000, area_sq_km: 5.8, vuln: 0.31, econ: 0.77, growth: 0.036 },
  { idx: 9, name: 'Sholinganallur', code: 'WARD-010', population: 210000, area_sq_km: 18.6, vuln: 0.38, econ: 0.74, growth: 0.082 },
  { idx: 10, name: 'Avadi', code: 'WARD-011', population: 158000, area_sq_km: 15.4, vuln: 0.62, econ: 0.47, growth: 0.049 },
  { idx: 11, name: 'Manali', code: 'WARD-012', population: 121000, area_sq_km: 16.8, vuln: 0.71, econ: 0.38, growth: 0.044 },
];

const CHENNAI_ROUTES = [
  { code: 'C1', name: 'City Trunk 1', color: '#2563EB', from: 0, to: 9, freq: 8, rel: 0.86, safety: 0.8 },
  { code: 'C2', name: 'City Trunk 2', color: '#1D4ED8', from: 3, to: 11, freq: 10, rel: 0.82, safety: 0.75 },
  { code: 'C3', name: 'Crosstown East', color: '#10B981', from: 1, to: 8, freq: 12, rel: 0.88, safety: 0.83 },
  { code: 'F1', name: 'Tambaram Feeder', color: '#F59E0B', from: 4, to: 5, freq: 20, rel: 0.7, safety: 0.65 },
  { code: 'F2', name: 'Ambattur Feeder', color: '#F59E0B', from: 6, to: 10, freq: 25, rel: 0.66, safety: 0.6 },
  { code: 'F3', name: 'Manali Feeder', color: '#EF4444', from: 11, to: 7, freq: 30, rel: 0.6, safety: 0.55 },
  { code: 'M1', name: 'Metro Blue Line', color: '#0EA5E9', from: 7, to: 2, freq: 5, rel: 0.94, safety: 0.9, mode: 'metro' },
  { code: 'E1', name: 'IT Corridor Express', color: '#8B5CF6', from: 8, to: 4, freq: 15, rel: 0.78, safety: 0.78 },
];

const COIMBATORE_ZONES = [
  { idx: 0, name: 'Gandhipuram', code: 'CBE-001', population: 115000, area_sq_km: 5.8, vuln: 0.38, econ: 0.91, growth: 0.029 },
  { idx: 1, name: 'RS Puram', code: 'CBE-002', population: 98000, area_sq_km: 4.6, vuln: 0.29, econ: 0.89, growth: 0.022 },
  { idx: 2, name: 'Peelamedu', code: 'CBE-003', population: 142000, area_sq_km: 8.9, vuln: 0.41, econ: 0.85, growth: 0.045 },
  { idx: 3, name: 'Singanallur', code: 'CBE-004', population: 136000, area_sq_km: 9.4, vuln: 0.49, econ: 0.71, growth: 0.038 },
  { idx: 4, name: 'Saibaba Colony', code: 'CBE-005', population: 89000, area_sq_km: 4.2, vuln: 0.32, econ: 0.82, growth: 0.025 },
  { idx: 5, name: 'Saravanampatti', code: 'CBE-006', population: 165000, area_sq_km: 14.8, vuln: 0.44, econ: 0.84, growth: 0.075 },
  { idx: 6, name: 'Ukkadam', code: 'CBE-007', population: 124000, area_sq_km: 6.1, vuln: 0.59, econ: 0.65, growth: 0.021 },
  { idx: 7, name: 'Kuniyamuthur', code: 'CBE-008', population: 108000, area_sq_km: 11.2, vuln: 0.54, econ: 0.58, growth: 0.041 },
  { idx: 8, name: 'Ganapathy', code: 'CBE-009', population: 119000, area_sq_km: 7.0, vuln: 0.46, econ: 0.69, growth: 0.033 },
  { idx: 9, name: 'Thudiyalur', code: 'CBE-010', population: 131000, area_sq_km: 12.6, vuln: 0.51, econ: 0.62, growth: 0.052 },
  { idx: 10, name: 'Kovaipudur', code: 'CBE-011', population: 84000, area_sq_km: 10.5, vuln: 0.43, econ: 0.60, growth: 0.039 },
  { idx: 11, name: 'Vadavalli', code: 'CBE-012', population: 96000, area_sq_km: 8.7, vuln: 0.39, econ: 0.73, growth: 0.047 },
];

const COIMBATORE_ROUTES = [
  { code: 'CB1', name: 'Avinashi Road Trunk', color: '#2563EB', from: 0, to: 2, freq: 8, rel: 0.88, safety: 0.82 },
  { code: 'CB2', name: 'Sathy Road Express', color: '#1D4ED8', from: 0, to: 5, freq: 10, rel: 0.84, safety: 0.79 },
  { code: 'CB3', name: 'Trichy Road Line', color: '#10B981', from: 6, to: 3, freq: 12, rel: 0.81, safety: 0.76 },
  { code: 'CF1', name: 'Saravanampatti Feeder', color: '#F59E0B', from: 5, to: 8, freq: 18, rel: 0.72, safety: 0.68 },
  { code: 'CF2', name: 'Thudiyalur Feeder', color: '#F59E0B', from: 9, to: 4, freq: 22, rel: 0.69, safety: 0.64 },
  { code: 'CF3', name: 'Kovaipudur Feeder', color: '#EF4444', from: 10, to: 7, freq: 28, rel: 0.65, safety: 0.60 },
  { code: 'CM1', name: 'Metro Neo Corridor', color: '#0EA5E9', from: 1, to: 2, freq: 6, rel: 0.93, safety: 0.91, mode: 'metro' },
  { code: 'CE1', name: 'Tidel Park Shuttle', color: '#8B5CF6', from: 2, to: 5, freq: 15, rel: 0.82, safety: 0.80 },
];

const BENGALURU_ZONES = [
  { idx: 0, name: 'Koramangala', code: 'BLR-001', population: 145000, area_sq_km: 7.2, vuln: 0.26, econ: 0.94, growth: 0.035 },
  { idx: 1, name: 'Indiranagar', code: 'BLR-002', population: 128000, area_sq_km: 6.1, vuln: 0.24, econ: 0.92, growth: 0.024 },
  { idx: 2, name: 'Whitefield', code: 'BLR-003', population: 230000, area_sq_km: 19.5, vuln: 0.39, econ: 0.93, growth: 0.078 },
  { idx: 3, name: 'HSR Layout', code: 'BLR-004', population: 152000, area_sq_km: 8.4, vuln: 0.31, econ: 0.88, growth: 0.048 },
  { idx: 4, name: 'Jayanagar', code: 'BLR-005', population: 138000, area_sq_km: 6.9, vuln: 0.28, econ: 0.85, growth: 0.021 },
  { idx: 5, name: 'Electronic City', code: 'BLR-006', population: 215000, area_sq_km: 18.2, vuln: 0.42, econ: 0.90, growth: 0.065 },
  { idx: 6, name: 'Marathahalli', code: 'BLR-007', population: 178000, area_sq_km: 11.6, vuln: 0.45, econ: 0.82, growth: 0.058 },
  { idx: 7, name: 'Hebbal', code: 'BLR-008', population: 162000, area_sq_km: 13.1, vuln: 0.48, econ: 0.79, growth: 0.062 },
  { idx: 8, name: 'Malleshwaram', code: 'BLR-009', population: 112000, area_sq_km: 5.5, vuln: 0.30, econ: 0.81, growth: 0.018 },
  { idx: 9, name: 'Banashankari', code: 'BLR-010', population: 168000, area_sq_km: 12.0, vuln: 0.44, econ: 0.74, growth: 0.039 },
  { idx: 10, name: 'Rajajinagar', code: 'BLR-011', population: 125000, area_sq_km: 6.8, vuln: 0.35, econ: 0.77, growth: 0.022 },
  { idx: 11, name: 'Yelahanka', code: 'BLR-012', population: 185000, area_sq_km: 17.4, vuln: 0.52, econ: 0.71, growth: 0.071 },
];

const BENGALURU_ROUTES = [
  { code: 'B1', name: 'Outer Ring Road Trunk', color: '#2563EB', from: 3, to: 6, freq: 6, rel: 0.82, safety: 0.79 },
  { code: 'B2', name: 'Hosur Road Express', color: '#1D4ED8', from: 0, to: 5, freq: 8, rel: 0.84, safety: 0.77 },
  { code: 'B3', name: 'Airport Corridor', color: '#10B981', from: 7, to: 11, freq: 10, rel: 0.89, safety: 0.86 },
  { code: 'BF1', name: 'Whitefield Feeder', color: '#F59E0B', from: 2, to: 6, freq: 18, rel: 0.68, safety: 0.66 },
  { code: 'BF2', name: 'Electronic City Feeder', color: '#F59E0B', from: 5, to: 3, freq: 20, rel: 0.71, safety: 0.67 },
  { code: 'BF3', name: 'Yelahanka Feeder', color: '#EF4444', from: 11, to: 7, freq: 25, rel: 0.64, safety: 0.61 },
  { code: 'BM1', name: 'Namma Metro Purple Line', color: '#8B5CF6', from: 1, to: 2, freq: 5, rel: 0.96, safety: 0.93, mode: 'metro' },
  { code: 'BM2', name: 'Namma Metro Green Line', color: '#10B981', from: 8, to: 4, freq: 5, rel: 0.95, safety: 0.92, mode: 'metro' },
];

const CITIES = [
  {
    id: TENANT_ID,
    name: 'Chennai Metropolitan Mobility Authority',
    slug: 'chennai',
    city_name: 'Chennai',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    center: [13.05, 80.20],
    zoom: 12,
    base_x: 80.10,
    base_y: 13.00,
    zones: CHENNAI_ZONES,
    routes: CHENNAI_ROUTES,
  },
  {
    id: '22222222-2222-2222-2222-222222222221',
    name: 'Coimbatore Urban Transport Authority',
    slug: 'coimbatore',
    city_name: 'Coimbatore',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    center: [11.0168, 76.9558],
    zoom: 12,
    base_x: 76.92,
    base_y: 10.98,
    zones: COIMBATORE_ZONES,
    routes: COIMBATORE_ROUTES,
  },
  {
    id: '33333333-3333-3333-3333-333333333331',
    name: 'Bengaluru Metropolitan Transport Authority',
    slug: 'bengaluru',
    city_name: 'Bengaluru',
    country_code: 'IN',
    timezone: 'Asia/Kolkata',
    center: [12.9716, 77.5946],
    zoom: 12,
    base_x: 77.54,
    base_y: 12.91,
    zones: BENGALURU_ZONES,
    routes: BENGALURU_ROUTES,
  },
];

const ZONE_DEFS = CHENNAI_ZONES;

function resolveCityTenant(cityOrTenantId) {
  if (!cityOrTenantId) return CITIES[0];
  const q = String(cityOrTenantId).toLowerCase().trim();
  const found = CITIES.find((c) =>
    c.id.toLowerCase() === q ||
    c.slug.toLowerCase() === q ||
    c.city_name.toLowerCase() === q ||
    c.name.toLowerCase().includes(q)
  );
  return found || CITIES[0];
}

function zoneEnvelope(z, baseX, baseY) {
  const x = baseX + (z.idx % 4) * 0.06;
  const y = baseY + Math.floor(z.idx / 4) * 0.05;
  return { x, y, x2: x + 0.05, y2: y + 0.04 };
}

function zonePolygon(z, baseX, baseY) {
  const e = zoneEnvelope(z, baseX, baseY);
  const ring = [[e.x, e.y], [e.x2, e.y], [e.x2, e.y2], [e.x, e.y2], [e.x, e.y]];
  return { type: 'MultiPolygon', coordinates: [[ring]] };
}

function zoneCentroid(z, baseX, baseY) {
  const e = zoneEnvelope(z, baseX, baseY);
  return { type: 'Point', coordinates: [(e.x + e.x2) / 2, (e.y + e.y2) / 2] };
}

/** Stable pseudo-random in [0,1) from a seed string. */
function rand(seed) {
  const h = crypto.createHash('md5').update(String(seed)).digest();
  return h.readUInt32BE(0) / 0xffffffff;
}

function buildZonesForCity(city) {
  return city.zones.map((z) => {
    const e = zoneEnvelope(z, city.base_x, city.base_y);
    return {
      id: `z-${city.slug}-${z.code.toLowerCase()}`,
      tenant_id: city.id,
      name: z.name,
      code: z.code,
      zone_type: 'ward',
      population: z.population,
      area_sq_km: z.area_sq_km,
      vulnerability_index: z.vuln,
      economic_activity: z.econ,
      growth_rate: z.growth,
      geom: zonePolygon(z, city.base_x, city.base_y),
      centroid: zoneCentroid(z, city.base_x, city.base_y),
      properties: { cx: (e.x + e.x2) / 2, cy: (e.y + e.y2) / 2, idx: z.idx, city: city.city_name },
      idx: z.idx,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  });
}

const POINT_NAMES = {
  bus: ['Central Bus Stop', 'Market Junction Stop', 'Ring Road Stop', 'Temple Stop', 'Hospital Stop', 'College Gate Stop'],
  metro: ['Metro Terminal', 'Metro Interchange'],
  bike_share: ['Bike Hub', 'Cycle Point'],
  ev_charger: ['EV Charge Plaza', 'EV Fast Charge'],
  parking: ['Park & Ride Lot', 'Multi-level Parking'],
};

function buildTransitPointsForCity(zones, city) {
  const points = [];
  let n = 0;
  for (const z of zones) {
    const cx = z.centroid.coordinates[0];
    const cy = z.centroid.coordinates[1];
    const sparse = z.idx >= 5;
    const busCount = z.idx === 11 ? 0 : (sparse ? 2 : 4);

    for (let i = 0; i < busCount; i += 1) {
      n += 1;
      const jitterX = (rand(`bus-${city.slug}-${z.code}-${i}-x`) - 0.5) * 0.03;
      const jitterY = (rand(`bus-${city.slug}-${z.code}-${i}-y`) - 0.5) * 0.02;
      points.push({
        id: `tp-bus-${city.slug}-${String(n).padStart(3, '0')}`,
        tenant_id: city.id, zone_id: z.id,
        name: `${z.name} ${POINT_NAMES.bus[i % POINT_NAMES.bus.length]}`,
        mode: 'bus', code: `BS-${city.slug.slice(0, 2).toUpperCase()}-${String(n).padStart(3, '0')}`,
        geom: { type: 'Point', coordinates: [cx + jitterX, cy + jitterY] },
        capacity: 60 + Math.floor(rand(`cap-${city.slug}-${n}`) * 60),
        daily_ridership: Math.floor(1200 + rand(`rid-${city.slug}-${n}`) * 3800),
        accessibility_score: Number((0.45 + rand(`acc-${city.slug}-${n}`) * 0.5).toFixed(3)),
        amenities: { shelter: rand(`sh-${city.slug}-${n}`) > 0.4, lighting: rand(`li-${city.slug}-${n}`) > 0.3, seating: rand(`se-${city.slug}-${n}`) > 0.5 },
        is_active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      });
    }

    if (z.idx % 3 === 0) {
      n += 1;
      points.push({
        id: `tp-metro-${city.slug}-${String(n).padStart(3, '0')}`,
        tenant_id: city.id, zone_id: z.id,
        name: `${z.name} ${POINT_NAMES.metro[0]}`,
        mode: 'metro', code: `MS-${city.slug.slice(0, 2).toUpperCase()}-${String(n).padStart(3, '0')}`,
        geom: { type: 'Point', coordinates: [cx, cy] },
        capacity: 800, daily_ridership: Math.floor(12000 + rand(`mrid-${city.slug}-${n}`) * 18000),
        accessibility_score: 0.82,
        amenities: { elevators: true, tactile_paving: true, parking_feeder: true },
        is_active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      });
    }

    if (z.idx % 4 === 1) {
      n += 1;
      points.push({
        id: `tp-bike-${city.slug}-${String(n).padStart(3, '0')}`,
        tenant_id: city.id, zone_id: z.id,
        name: `${z.name} ${POINT_NAMES.bike_share[0]}`,
        mode: 'bike_share', code: `BK-${city.slug.slice(0, 2).toUpperCase()}-${String(n).padStart(3, '0')}`,
        geom: { type: 'Point', coordinates: [cx + 0.01, cy + 0.005] },
        capacity: 24, daily_ridership: Math.floor(150 + rand(`brid-${city.slug}-${n}`) * 500),
        accessibility_score: 0.68,
        amenities: { docks: 24, e_bikes: rand(`eb-${city.slug}-${n}`) > 0.5 },
        is_active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      });
    }

    if (z.idx % 4 === 2) {
      n += 1;
      points.push({
        id: `tp-ev-${city.slug}-${String(n).padStart(3, '0')}`,
        tenant_id: city.id, zone_id: z.id,
        name: `${z.name} ${POINT_NAMES.ev_charger[0]}`,
        mode: 'ev_charger', code: `EV-${city.slug.slice(0, 2).toUpperCase()}-${String(n).padStart(3, '0')}`,
        geom: { type: 'Point', coordinates: [cx - 0.008, cy - 0.004] },
        capacity: 8, daily_ridership: Math.floor(30 + rand(`evrid-${city.slug}-${n}`) * 120),
        accessibility_score: 0.6,
        amenities: { fast_chargers: 2, solar_canopy: rand(`sc-${city.slug}-${n}`) > 0.6 },
        is_active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      });
    }

    if (z.idx % 5 === 0) {
      n += 1;
      points.push({
        id: `tp-park-${city.slug}-${String(n).padStart(3, '0')}`,
        tenant_id: city.id, zone_id: z.id,
        name: `${z.name} ${POINT_NAMES.parking[0]}`,
        mode: 'parking', code: `PK-${city.slug.slice(0, 2).toUpperCase()}-${String(n).padStart(3, '0')}`,
        geom: { type: 'Point', coordinates: [cx + 0.015, cy - 0.008] },
        capacity: 220, daily_ridership: Math.floor(300 + rand(`prid-${city.slug}-${n}`) * 900),
        accessibility_score: 0.55,
        amenities: { park_and_ride: true, cctv: true },
        is_active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
      });
    }
  }
  return points;
}

function buildRoutesForCity(zones, city) {
  return city.routes.map((r) => {
    const a = zones[r.from].centroid;
    const b = zones[r.to].centroid;
    const [x1, y1] = a.coordinates;
    const [x2, y2] = b.coordinates;
    const mid = [(x1 + x2) / 2 + 0.008, (y1 + y2) / 2 - 0.006];
    const geom = { type: 'LineString', coordinates: [[x1, y1], mid, [x2, y2]] };
    const distance_km = haversineKm(x1, y1, x2, y2) * 1.25;
    return {
      id: `rt-${city.slug}-${r.code.toLowerCase()}`,
      tenant_id: city.id,
      name: r.name, code: r.code, mode: r.mode || 'bus', color: r.color,
      geom, distance_km: Number(distance_km.toFixed(2)),
      frequency_min: r.freq, reliability: r.rel, safety_score: r.safety,
      daily_ridership: Math.floor(8000 + rand(`rt-${city.slug}-${r.code}`) * 22000),
      operating_hours: { start: '05:00', end: '23:00' },
      is_active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
    };
  });
}

function haversineKm(x1, y1, x2, y2) {
  const R = 6371;
  const dLat = ((y2 - y1) * Math.PI) / 180;
  const dLon = ((x2 - x1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((y1 * Math.PI) / 180) * Math.cos((y2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildRouteStops(routes, points) {
  const links = [];
  for (const route of routes) {
    const busStops = points.filter((p) => p.mode === route.mode || (route.mode === 'metro' && p.mode === 'metro'));
    const near = busStops.slice(0, 4);
    near.forEach((p, i) => links.push({ route_id: route.id, stop_id: p.id, stop_sequence: i + 1 }));
  }
  return links;
}

function buildObservationsForCity(zones, routes, city) {
  const ridership = [];
  const traffic = [];
  let rid = 0;
  const days = city.slug === 'chennai' ? 45 : 5;
  const start = Date.UTC(2026, 7, 8);

  for (let d = 0; d < days; d += 1) {
    const dayTs = start + d * 86400000;
    const dow = new Date(dayTs).getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const isHoliday = d === 10 || d === 25;
    const hasEvent = d === 18;
    for (let h = 5; h <= 23; h += 1) {
      const peak = (h >= 7 && h <= 10) || (h >= 17 && h <= 20) ? 1.9 : (h >= 12 && h <= 15 ? 1.15 : 0.7);
      const weekendFactor = isWeekend ? 0.62 : 1;
      const holidayFactor = isHoliday ? 0.5 : 1;
      const eventFactor = hasEvent ? 1.35 : 1;
      const observed_at = new Date(dayTs + h * 3600000).toISOString();

      for (let zi = 0; zi < zones.length; zi += 1) {
        const z = zones[zi];
        const base = (z.population / 1000) * 3.2 * (0.6 + z.economic_activity);
        const noise = 0.85 + rand(`rid-${city.slug}-${z.code}-${d}-${h}`) * 0.3;
        const boardings = Math.max(0, Math.round(base * peak * weekendFactor * holidayFactor * eventFactor * noise * 0.35));
        const temp = 28 + 6 * Math.sin((h / 24) * Math.PI * 2 - Math.PI / 2) + rand(`t-${city.slug}-${d}`) * 3;
        const precip = rand(`p-${city.slug}-${z.code}-${d}`) > 0.82 ? rand(`pr-${city.slug}-${d}-${h}`) * 12 : 0;
        const wetPenalty = precip > 0 ? 0.85 : 1;
        rid += 1;
        ridership.push({
          id: `ro-${city.slug}-${rid}`, tenant_id: city.id,
          route_id: routes[(zi + d) % routes.length].id,
          stop_id: null, zone_id: z.id,
          observed_at, hour_of_day: h, day_of_week: dow,
          boardings: Math.round(boardings * wetPenalty),
          alightings: Math.round(boardings * wetPenalty * (0.85 + rand(`al-${city.slug}-${rid}`) * 0.3)),
          load_factor: Number((peak * 0.4 * noise).toFixed(3)),
          temperature_c: Number(temp.toFixed(1)),
          precipitation_mm: Number(precip.toFixed(1)),
          is_holiday: isHoliday, has_event: hasEvent,
          created_at: observed_at,
        });
      }

      for (const r of routes) {
        const congestion = Math.min(1, peak * 0.38 * (isWeekend ? 0.55 : 1) * (0.8 + rand(`cg-${city.slug}-${r.code}-${d}-${h}`) * 0.4));
        traffic.push({
          id: `to-${city.slug}-${rid}-${r.code}`, tenant_id: city.id,
          segment_name: `${r.name} segment`,
          geom: r.geom.coordinates[Math.floor(r.geom.coordinates.length / 2)]
            ? { type: 'Point', coordinates: r.geom.coordinates[1] } : null,
          observed_at, hour_of_day: h, day_of_week: dow,
          speed_kmh: Number((42 - congestion * 26).toFixed(1)),
          volume_vph: Math.round(400 + congestion * 1800),
          congestion_index: Number(congestion.toFixed(3)),
          delay_minutes: Number((congestion * 14).toFixed(1)),
          created_at: observed_at,
        });
      }
    }
  }
  return { ridership, traffic };
}

function buildDataset(targetCity = 'chennai') {
  const citiesToBuild = (targetCity === 'all')
    ? CITIES
    : [resolveCityTenant(targetCity || 'chennai')];

  let allZones = [];
  let allPoints = [];
  let allRoutes = [];
  let allRouteStops = [];
  let allRidership = [];
  let allTraffic = [];

  for (const city of citiesToBuild) {
    const zones = buildZonesForCity(city);
    const points = buildTransitPointsForCity(zones, city);
    const routes = buildRoutesForCity(zones, city);
    const routeStops = buildRouteStops(routes, points);
    const observations = buildObservationsForCity(zones, routes, city);

    allZones = allZones.concat(zones);
    allPoints = allPoints.concat(points);
    allRoutes = allRoutes.concat(routes);
    allRouteStops = allRouteStops.concat(routeStops);
    allRidership = allRidership.concat(observations.ridership);
    allTraffic = allTraffic.concat(observations.traffic);
  }

  return {
    tenantId: citiesToBuild[0].id,
    zones: allZones,
    points: allPoints,
    routes: allRoutes,
    routeStops: allRouteStops,
    ridership: allRidership,
    traffic: allTraffic,
  };
}

module.exports = {
  buildDataset,
  CITIES,
  resolveCityTenant,
  TENANT_ID,
  ZONE_DEFS,
  haversineKm,
  rand,
};
