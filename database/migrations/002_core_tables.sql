-- URBANFLOW AI — Migration 002: Identity, Tenancy & Administration
BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

-- Tenancy: a deployment can serve multiple agencies/cities.
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  city_name   TEXT NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'IN',
  timezone    TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email              CITEXT NOT NULL,
  password_hash      TEXT NOT NULL,
  full_name          TEXT NOT NULL,
  role               user_role NOT NULL DEFAULT 'analyst',
  avatar_url         TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  is_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  last_login_at      TIMESTAMPTZ,
  failed_logins      INTEGER NOT NULL DEFAULT 0,
  locked_until       TIMESTAMPTZ,
  preferences        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (tenant_id, email),
  CONSTRAINT users_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT users_password_len CHECK (char_length(password_hash) >= 20)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  device_info TEXT,
  ip_address  INET,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT,
  entity_id   TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  kind        notification_kind NOT NULL DEFAULT 'system',
  severity    alert_severity NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
