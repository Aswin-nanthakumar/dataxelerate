'use strict';

/**
 * Seeder — writes tenants, users (bcrypt-hashed demo passwords) and the full
 * synthetic mobility dataset into PostgreSQL when DATABASE_URL is set.
 * On the memory adapter it hydrates the same dataset via the shared generator.
 */

const { buildDataset, TENANT_ID, CITIES } = require('../services/synthetic');
const { hashPassword } = require('../services/authService');

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Urbanflow#2026';

const DEMO_USERS = [
  { id: '22222222-2222-2222-2222-222222222221', email: 'admin@urbanflow.ai', full_name: 'Asha Raman', role: 'administrator' },
  { id: '22222222-2222-2222-2222-222222222222', email: 'planner@urbanflow.ai', full_name: 'Vikram Iyer', role: 'city_planner' },
  { id: '22222222-2222-2222-2222-222222222223', email: 'authority@urbanflow.ai', full_name: 'Meera Nair', role: 'transport_authority' },
  { id: '22222222-2222-2222-2222-222222222224', email: 'analyst@urbanflow.ai', full_name: 'Rahul Das', role: 'analyst' },
];

async function seedMemory(db) {
  const data = buildDataset('all');
  db.tables.set('tenants', CITIES.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    city_name: c.city_name,
    country_code: c.country_code,
    timezone: c.timezone,
    config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })));
  db.tables.set('users', DEMO_USERS.map((u) => ({
    ...u, tenant_id: TENANT_ID, password_hash: hashPassword(DEMO_PASSWORD),
    is_active: true, is_verified: true, preferences: {},
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  })));
  db.tables.set('zones', data.zones);
  db.tables.set('transit_points', data.points);
  db.tables.set('routes', data.routes);
  db.tables.set('route_stops', data.routeStops);
  db.tables.set('ridership_observations', data.ridership);
  db.tables.set('traffic_observations', data.traffic);
  console.log('[seed] memory adapter hydrated with full synthetic dataset');
  return { users: DEMO_USERS.map((u) => u.email), password: DEMO_PASSWORD };
}

async function seedPostgres(db) {
  const data = buildDataset('all');
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await client.connect();

  for (const c of CITIES) {
    await client.query(`INSERT INTO tenants (id, name, slug, city_name, country_code, timezone)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (slug) DO NOTHING`,
    [c.id, c.name, c.slug, c.city_name, c.country_code, c.timezone]);
  }

  for (const u of DEMO_USERS) {
    await client.query(`INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_active, is_verified)
      VALUES ($1,$2,$3,$4,$5,$6,TRUE,TRUE) ON CONFLICT DO NOTHING`,
    [u.id, TENANT_ID, u.email, hashPassword(DEMO_PASSWORD), u.full_name, u.role]);
  }

  for (const z of data.zones) {
    await client.query(`INSERT INTO zones (id, tenant_id, name, code, zone_type, population, area_sq_km, vulnerability_index, economic_activity, growth_rate, geom)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, ST_SetSRID(ST_GeomFromGeoJSON($11),4326))
      ON CONFLICT (tenant_id, code) DO NOTHING`,
    [z.id, TENANT_ID, z.name, z.code, z.zone_type, z.population, z.area_sq_km, z.vulnerability_index, z.economic_activity, z.growth_rate, JSON.stringify(z.geom)]);
  }
  for (const p of data.points) {
    await client.query(`INSERT INTO transit_points (id, tenant_id, zone_id, name, mode, code, geom, capacity, daily_ridership, accessibility_score, amenities)
      VALUES ($1,$2,$3,$4,$5,$6, ST_SetSRID(ST_GeomFromGeoJSON($7),4326), $8,$9,$10,$11)
      ON CONFLICT (tenant_id, code) DO NOTHING`,
    [p.id, TENANT_ID, p.zone_id, p.name, p.mode, p.code, JSON.stringify(p.geom), p.capacity, p.daily_ridership, p.accessibility_score, JSON.stringify(p.amenities)]);
  }
  for (const r of data.routes) {
    await client.query(`INSERT INTO routes (id, tenant_id, name, code, mode, color, geom, distance_km, frequency_min, reliability, safety_score, daily_ridership, operating_hours)
      VALUES ($1,$2,$3,$4,$5,$6, ST_SetSRID(ST_GeomFromGeoJSON($7),4326), $8,$9,$10,$11,$12,$13)
      ON CONFLICT (tenant_id, code) DO NOTHING`,
    [r.id, TENANT_ID, r.name, r.code, r.mode, r.color, JSON.stringify(r.geom), r.distance_km, r.frequency_min, r.reliability, r.safety_score, r.daily_ridership, JSON.stringify(r.operating_hours)]);
  }
  for (const o of data.ridership) {
    await client.query(`INSERT INTO ridership_observations (id, tenant_id, route_id, zone_id, observed_at, hour_of_day, day_of_week, boardings, alightings, load_factor, temperature_c, precipitation_mm, is_holiday, has_event)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT DO NOTHING`,
    [require('crypto').randomUUID(), TENANT_ID, o.route_id, o.zone_id, o.observed_at, o.hour_of_day, o.day_of_week, o.boardings, o.alightings, o.load_factor, o.temperature_c, o.precipitation_mm, o.is_holiday, o.has_event]);
  }
  for (const t of data.traffic) {
    await client.query(`INSERT INTO traffic_observations (id, tenant_id, segment_name, geom, observed_at, hour_of_day, day_of_week, speed_kmh, volume_vph, congestion_index, delay_minutes)
      VALUES ($1,$2,$3, ST_SetSRID(ST_GeomFromGeoJSON($4),4326), $5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
    [require('crypto').randomUUID(), TENANT_ID, t.segment_name, JSON.stringify(t.geom), t.observed_at, t.hour_of_day, t.day_of_week, t.speed_kmh, t.volume_vph, t.congestion_index, t.delay_minutes]);
  }

  await client.end();
  console.log('[seed] PostgreSQL seeded:', DEMO_USERS.map((u) => u.email).join(', '), `· password: ${DEMO_PASSWORD}`);
  return { users: DEMO_USERS.map((u) => u.email), password: DEMO_PASSWORD };
}

async function seed() {
  const { getDb } = require('../config/database');
  const db = await getDb();
  if (db.kind === 'memory') return seedMemory(db);
  return seedPostgres(db);
}

if (require.main === module) {
  seed().catch((err) => { console.error('[seed] failed:', err); process.exit(1); });
}

module.exports = { seed, DEMO_USERS, DEMO_PASSWORD };
