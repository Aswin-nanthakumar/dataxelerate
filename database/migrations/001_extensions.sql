-- URBANFLOW AI — Migration 001: Extensions & Shared Types
-- PostgreSQL + PostGIS
BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Shared enums -----------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('administrator', 'city_planner', 'transport_authority', 'analyst');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_type AS ENUM (
    'new_bus_route', 'shuttle_service', 'bike_share', 'ev_station',
    'route_optimization', 'service_expansion', 'pedestrian_improvement'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recommendation_status AS ENUM ('proposed', 'approved', 'in_progress', 'implemented', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE simulation_kind AS ENUM ('bus_stop', 'bus_route', 'metro_station', 'bike_share', 'ev_station');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_format AS ENUM ('pdf', 'excel', 'csv');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_period AS ENUM ('daily', 'weekly', 'monthly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_kind AS ENUM ('gap_alert', 'demand_anomaly', 'recommendation', 'report_ready', 'system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transit_mode AS ENUM ('bus', 'metro', 'rail', 'tram', 'ferry', 'bike_share', 'ev_charger', 'parking');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMIT;
