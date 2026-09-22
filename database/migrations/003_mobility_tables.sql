-- URBANFLOW AI — Migration 003: GIS / Mobility Domain (PostGIS)
BEGIN;

-- Administrative / analytical zones (wards, districts, TAZs)
CREATE TABLE IF NOT EXISTS zones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,
  zone_type    TEXT NOT NULL DEFAULT 'ward',
  population   INTEGER NOT NULL DEFAULT 0 CHECK (population >= 0),
  area_sq_km   DOUBLE PRECISION NOT NULL DEFAULT 0,
  vulnerability_index DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (vulnerability_index BETWEEN 0 AND 1),
  economic_activity  DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (economic_activity BETWEEN 0 AND 1),
  growth_rate  DOUBLE PRECISION NOT NULL DEFAULT 0,
  geom         GEOMETRY(MultiPolygon, 4326) NOT NULL,
  centroid     GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_Centroid(geom)) STORED,
  properties   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT zones_code_unique UNIQUE (tenant_id, code)
);

-- Transit infrastructure points (bus stops, metro, parking, EV, bike share…)
CREATE TABLE IF NOT EXISTS transit_points (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id      UUID REFERENCES zones(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  mode         transit_mode NOT NULL,
  code         TEXT,
  geom         GEOMETRY(Point, 4326) NOT NULL,
  capacity     INTEGER,
  daily_ridership INTEGER NOT NULL DEFAULT 0,
  accessibility_score DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (accessibility_score BETWEEN 0 AND 1),
  amenities    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transit_points_code_unique UNIQUE (tenant_id, code)
);

-- Routes and their shapes
CREATE TABLE IF NOT EXISTS routes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL,
  mode         transit_mode NOT NULL DEFAULT 'bus',
  color        TEXT NOT NULL DEFAULT '#2563EB',
  geom         GEOMETRY(LineString, 4326),
  distance_km  DOUBLE PRECISION NOT NULL DEFAULT 0,
  frequency_min INTEGER NOT NULL DEFAULT 15 CHECK (frequency_min > 0),
  reliability  DOUBLE PRECISION NOT NULL DEFAULT 0.8 CHECK (reliability BETWEEN 0 AND 1),
  safety_score DOUBLE PRECISION NOT NULL DEFAULT 0.7 CHECK (safety_score BETWEEN 0 AND 1),
  daily_ridership INTEGER NOT NULL DEFAULT 0,
  operating_hours JSONB NOT NULL DEFAULT '{"start":"05:00","end":"23:00"}'::jsonb,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT routes_code_unique UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS route_stops (
  route_id     UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_id      UUID NOT NULL REFERENCES transit_points(id) ON DELETE CASCADE,
  stop_sequence INTEGER NOT NULL,
  PRIMARY KEY (route_id, stop_id)
);

-- Ridership / traffic observations (fact table, time-series)
CREATE TABLE IF NOT EXISTS ridership_observations (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  route_id     UUID REFERENCES routes(id) ON DELETE SET NULL,
  stop_id      UUID REFERENCES transit_points(id) ON DELETE SET NULL,
  zone_id      UUID REFERENCES zones(id) ON DELETE SET NULL,
  observed_at  TIMESTAMPTZ NOT NULL,
  hour_of_day  INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week  INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  boardings    INTEGER NOT NULL DEFAULT 0 CHECK (boardings >= 0),
  alightings   INTEGER NOT NULL DEFAULT 0 CHECK (alightings >= 0),
  load_factor  DOUBLE PRECISION NOT NULL DEFAULT 0,
  temperature_c DOUBLE PRECISION,
  precipitation_mm DOUBLE PRECISION,
  is_holiday   BOOLEAN NOT NULL DEFAULT FALSE,
  has_event    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Traffic flow / congestion sensors
CREATE TABLE IF NOT EXISTS traffic_observations (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  segment_name  TEXT NOT NULL,
  geom          GEOMETRY(Point, 4326),
  observed_at   TIMESTAMPTZ NOT NULL,
  hour_of_day   INTEGER NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  speed_kmh     DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_vph    INTEGER NOT NULL DEFAULT 0,
  congestion_index DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (congestion_index BETWEEN 0 AND 1),
  delay_minutes DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
