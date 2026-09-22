-- URBANFLOW AI — Migration 005: Performance Indexes
BEGIN;

CREATE INDEX IF NOT EXISTS idx_users_tenant      ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email       ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_refresh_user      ON refresh_tokens(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refresh_expires   ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_zones_tenant      ON zones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_zones_geom        ON zones USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_zones_centroid    ON zones USING GIST (centroid);

CREATE INDEX IF NOT EXISTS idx_tp_tenant_mode    ON transit_points(tenant_id, mode);
CREATE INDEX IF NOT EXISTS idx_tp_geom           ON transit_points USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_tp_zone           ON transit_points(zone_id);

CREATE INDEX IF NOT EXISTS idx_routes_tenant     ON routes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routes_geom       ON routes USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_ridership_time    ON ridership_observations(tenant_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ridership_route   ON ridership_observations(route_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ridership_zone    ON ridership_observations(zone_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_ridership_hour    ON ridership_observations(tenant_id, hour_of_day, day_of_week);

CREATE INDEX IF NOT EXISTS idx_traffic_time      ON traffic_observations(tenant_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_traffic_geom      ON traffic_observations USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_conn_zone         ON connectivity_scores(zone_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_conn_composite    ON connectivity_scores(tenant_id, composite_score);

CREATE INDEX IF NOT EXISTS idx_gap_zone          ON gap_urgency_scores(zone_id, computed_at DESC);
CREATE INDEX IF NOT EXISTS idx_gap_urgency       ON gap_urgency_scores(tenant_id, urgency_score DESC);

CREATE INDEX IF NOT EXISTS idx_fcst_time         ON demand_forecasts(tenant_id, predicted_at);
CREATE INDEX IF NOT EXISTS idx_fcst_granularity  ON demand_forecasts(tenant_id, granularity, predicted_at);

CREATE INDEX IF NOT EXISTS idx_reco_tenant       ON recommendations(tenant_id, status, priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_reco_geom         ON recommendations USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_sim_tenant        ON simulations(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_tenant    ON reports(tenant_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_user        ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_tenant      ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_session   ON copilot_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON audit_logs(tenant_id, created_at DESC);

COMMIT;
