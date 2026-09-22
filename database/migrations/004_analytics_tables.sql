-- URBANFLOW AI — Migration 004: Analytics, AI & Reporting
BEGIN;

-- Composite connectivity score per zone (materialised per analysis run)
CREATE TABLE IF NOT EXISTS connectivity_scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id              UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  distance_to_transit  DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (distance_to_transit BETWEEN 0 AND 1),
  frequency_score      DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (frequency_score BETWEEN 0 AND 1),
  reliability_score    DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (reliability_score BETWEEN 0 AND 1),
  safety_score         DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (safety_score BETWEEN 0 AND 1),
  intermodal_score     DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (intermodal_score BETWEEN 0 AND 1),
  composite_score      DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (composite_score BETWEEN 0 AND 1),
  first_mile_score     DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (first_mile_score BETWEEN 0 AND 1),
  last_mile_score      DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (last_mile_score BETWEEN 0 AND 1),
  accessibility_score  DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (accessibility_score BETWEEN 0 AND 1),
  coverage_pct         DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_transit_desert    BOOLEAN NOT NULL DEFAULT FALSE,
  details              JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Gap urgency index (investment prioritisation)
CREATE TABLE IF NOT EXISTS gap_urgency_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id             UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  population_density  DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (population_density BETWEEN 0 AND 1),
  economic_activity   DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (economic_activity BETWEEN 0 AND 1),
  vulnerability_index DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (vulnerability_index BETWEEN 0 AND 1),
  growth_rate         DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (growth_rate BETWEEN 0 AND 1),
  connectivity_deficit DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (connectivity_deficit BETWEEN 0 AND 1),
  urgency_score       DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (urgency_score BETWEEN 0 AND 1),
  priority_rank       INTEGER,
  investment_hint_usd DOUBLE PRECISION,
  suggested_actions   JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Demand forecasts produced by the AI service
CREATE TABLE IF NOT EXISTS demand_forecasts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id         UUID REFERENCES zones(id) ON DELETE SET NULL,
  route_id        UUID REFERENCES routes(id) ON DELETE SET NULL,
  granularity     TEXT NOT NULL CHECK (granularity IN ('hourly','daily','weekly','seasonal')),
  horizon_label   TEXT NOT NULL,
  predicted_at    TIMESTAMPTZ NOT NULL,
  predicted_value DOUBLE PRECISION NOT NULL,
  lower_bound     DOUBLE PRECISION,
  upper_bound     DOUBLE PRECISION,
  confidence      DOUBLE PRECISION NOT NULL DEFAULT 0.8 CHECK (confidence BETWEEN 0 AND 1),
  model_name      TEXT NOT NULL DEFAULT 'xgboost',
  model_version   TEXT NOT NULL DEFAULT '1.0.0',
  features        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI recommendations (routes, shuttles, bike share, EV…)
CREATE TABLE IF NOT EXISTS recommendations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  zone_id        UUID REFERENCES zones(id) ON DELETE SET NULL,
  rec_type       recommendation_type NOT NULL,
  status         recommendation_status NOT NULL DEFAULT 'proposed',
  title          TEXT NOT NULL,
  problem        TEXT NOT NULL,
  root_cause     TEXT NOT NULL,
  estimated_cost_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  expected_impact JSONB NOT NULL DEFAULT '{}'::jsonb,
  roi            DOUBLE PRECISION NOT NULL DEFAULT 0,
  priority_level TEXT NOT NULL DEFAULT 'medium' CHECK (priority_level IN ('low','medium','high','critical')),
  priority_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  roadmap        JSONB NOT NULL DEFAULT '[]'::jsonb,
  geometry       GEOMETRY(Geometry, 4326),
  generated_by   TEXT NOT NULL DEFAULT 'rule-engine',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- What-if simulations
CREATE TABLE IF NOT EXISTS simulations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  kind           simulation_kind NOT NULL,
  parameters     JSONB NOT NULL DEFAULT '{}'::jsonb,
  geometry       GEOMETRY(Geometry, 4326),
  results        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ridership_increase_pct DOUBLE PRECISION,
  congestion_reduction_pct DOUBLE PRECISION,
  accessibility_gain DOUBLE PRECISION,
  carbon_savings_tons_yr DOUBLE PRECISION,
  roi            DOUBLE PRECISION,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Generated reports
CREATE TABLE IF NOT EXISTS reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  report_type  TEXT NOT NULL DEFAULT 'mobility_overview',
  period       report_period NOT NULL DEFAULT 'monthly',
  format       report_format NOT NULL DEFAULT 'pdf',
  storage_url  TEXT,
  content      JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI copilot conversations
CREATE TABLE IF NOT EXISTS copilot_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id   UUID NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content      TEXT NOT NULL,
  intent       TEXT,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
