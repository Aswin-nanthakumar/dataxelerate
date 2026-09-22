'use strict';

/**
 * Migration runner — applies database/migrations/*.sql in order and records
 * them in schema_migrations. Works against any PostgreSQL+PostGIS database
 * (Neon in production, local Postgres in docker-compose).
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', '..', 'database', 'migrations');

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('[migrate] DATABASE_URL not set — skipping SQL migrations (memory adapter active).');
    return;
  }
  const client = new Client({ connectionString: url, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  await client.connect();
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now())');

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const { rows } = await client.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (rows.length) { console.log(`[migrate] skip ${file}`); continue; }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`[migrate] apply ${file}`);
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }
  await client.end();
  console.log('[migrate] done');
}

if (require.main === module) {
  run().catch((err) => { console.error('[migrate] failed:', err.message); process.exit(1); });
}

module.exports = { run };
