-- URBANFLOW AI — Seed Data
-- Demo tenant: Chennai Metropolitan Mobility Authority
-- NOTE: password hashes are written by the Node seeder (backend: npm run db:seed)
-- which bcrypt-hashes 'Urbanflow#2026'. This SQL seeds the spatial/analytic base data.
BEGIN;

INSERT INTO tenants (id, name, slug, city_name, country_code, timezone)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Chennai Metropolitan Mobility Authority',
  'cmma',
  'Chennai',
  'IN',
  'Asia/Kolkata'
) ON CONFLICT (slug) DO NOTHING;

-- 12 wards laid on a deterministic 4x3 grid around Chennai coordinates.
INSERT INTO zones (id, tenant_id, name, code, zone_type, population, area_sq_km,
                   vulnerability_index, economic_activity, growth_rate, geom)
SELECT
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  z.name, z.code, 'ward', z.population, z.area_sq_km, z.vuln, z.econ, z.growth,
  ST_SetSRID(ST_MakeEnvelope(
    80.10 + (z.idx % 4) * 0.06,
    13.00 + (z.idx / 4) * 0.05,
    80.10 + (z.idx % 4) * 0.06 + 0.05,
    13.00 + (z.idx / 4) * 0.05 + 0.04
  , 4326), 4326)::MultiPolygon
FROM (VALUES
  (0,  'T. Nagar',      'WARD-001', 128000,  6.4, 0.42, 0.88, 0.031),
  (1,  'Adyar',         'WARD-002', 152000,  8.1, 0.35, 0.81, 0.028),
  (2,  'Velachery',     'WARD-003', 118000,  7.2, 0.48, 0.72, 0.042),
  (3,  'Anna Nagar',    'WARD-004', 141000,  7.8, 0.28, 0.86, 0.022),
  (4,  'Tambaram',      'WARD-005', 176000, 12.5, 0.55, 0.61, 0.055),
  (5,  'Porur',         'WARD-006', 132000, 10.2, 0.51, 0.58, 0.061),
  (6,  'Ambattur',      'WARD-007', 189000, 14.1, 0.58, 0.55, 0.058),
  (7,  'Royapuram',     'WARD-008', 164000,  5.2, 0.66, 0.49, 0.019),
  (8,  'Thiruvanmiyur', 'WARD-009',  97000,  5.8, 0.31, 0.77, 0.036),
  (9,  'Sholinganallur','WARD-010', 210000, 18.6, 0.38, 0.74, 0.082),
  (10, 'Avadi',         'WARD-011', 158000, 15.4, 0.62, 0.47, 0.049),
  (11, 'Manali',        'WARD-012', 121000, 16.8, 0.71, 0.38, 0.044)
) AS z(idx, name, code, population, area_sq_km, vuln, econ, growth)
ON CONFLICT (tenant_id, code) DO NOTHING;

COMMIT;
