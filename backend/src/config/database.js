'use strict';

/**
 * Data access layer.
 *
 * Two interchangeable adapters:
 *  - PgAdapter      → production (Neon / any PostgreSQL+PostGIS), parameterised SQL.
 *  - MemoryAdapter  → zero-dependency fallback used in CI, tests, demos.
 *
 * The repository layer only ever calls `query(sql, params)` and the small
 * helpers below, so swapping adapters is a one-line config change.
 */

const config = require('./index');

class MemoryAdapter {
  constructor() {
    this.kind = 'memory';
    this.tables = new Map();
    this._seedBase();
  }

  _table(name) {
    if (!this.tables.has(name)) this.tables.set(name, []);
    return this.tables.get(name);
  }

  _seedBase() {
    // Minimal rows so the API is useful out of the box before seeding runs.
    const now = new Date().toISOString();
    this.tables.set('tenants', [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Chennai Metropolitan Mobility Authority',
        slug: 'chennai', city_name: 'Chennai', country_code: 'IN', timezone: 'Asia/Kolkata',
        config: {}, created_at: now, updated_at: now,
      },
      {
        id: '22222222-2222-2222-2222-222222222221',
        name: 'Coimbatore Urban Transport Authority',
        slug: 'coimbatore', city_name: 'Coimbatore', country_code: 'IN', timezone: 'Asia/Kolkata',
        config: {}, created_at: now, updated_at: now,
      },
      {
        id: '33333333-3333-3333-3333-333333333331',
        name: 'Bengaluru Metropolitan Transport Authority',
        slug: 'bengaluru', city_name: 'Bengaluru', country_code: 'IN', timezone: 'Asia/Kolkata',
        config: {}, created_at: now, updated_at: now,
      },
    ]);
  }

  async init() { return this; }

  async close() { /* noop */ }

  async healthy() { return true; }

  /** Insert a row, returns the stored row. */
  async insert(table, row) {
    const rows = this._table(table);
    const stored = { ...row };
    if (!stored.id) stored.id = require('crypto').randomUUID();
    if (!stored.created_at) stored.created_at = new Date().toISOString();
    rows.push(stored);
    return stored;
  }

  /** Update rows matching filter, returns updated rows. */
  async update(table, filter, patch) {
    const rows = this._table(table);
    const out = [];
    for (const r of rows) {
      if (Object.entries(filter).every(([k, v]) => r[k] === v)) {
        Object.assign(r, patch, { updated_at: new Date().toISOString() });
        out.push({ ...r });
      }
    }
    return out;
  }

  async delete(table, filter) {
    const rows = this._table(table);
    let removed = 0;
    for (let i = rows.length - 1; i >= 0; i -= 1) {
      if (Object.entries(filter).every(([k, v]) => rows[i][k] === v)) {
        rows.splice(i, 1); removed += 1;
      }
    }
    return removed;
  }

  /** Select with simple equality filters + optional predicate fn. */
  async select(table, filter = {}, predicate = null) {
    const rows = this._table(table);
    return rows
      .filter((r) => Object.entries(filter).every(([k, v]) => r[k] === v))
      .filter((r) => (predicate ? predicate(r) : true))
      .map((r) => ({ ...r }));
  }

  async count(table, filter = {}) {
    return (await this.select(table, filter)).length;
  }

  /**
   * SQL shim: only a tiny surface is supported (used by a handful of shared
   * code paths). Prefer the typed helpers above inside repositories.
   */
  async query(sql, params = []) {
    return { rows: [], rowCount: 0, adapter: 'memory', sql, params };
  }
}

class PgAdapter {
  constructor() {
    this.kind = 'postgres';
    this.pool = null;
  }

  async init() {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    await this.pool.query('SELECT 1');
    return this;
  }

  async close() { if (this.pool) await this.pool.end(); }

  async healthy() {
    await this.pool.query('SELECT 1');
    return true;
  }

  async query(sql, params = []) {
    return this.pool.query(sql, params);
  }

  // Typed helpers implemented with parameterised SQL (injection-safe).
  async insert(table, row) {
    const keys = Object.keys(row);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const vals = keys.map((_, i) => `$${i + 1}`);
    const sql = `INSERT INTO ${table} (${cols}) VALUES (${vals}) RETURNING *`;
    const res = await this.pool.query(sql, keys.map((k) => row[k]));
    return res.rows[0];
  }

  async update(table, filter, patch) {
    const fk = Object.keys(filter); const pk = Object.keys(patch);
    const setSql = pk.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const whereSql = fk.map((k, i) => `"${k}" = $${pk.length + i + 1}`).join(' AND ');
    const sql = `UPDATE ${table} SET ${setSql} WHERE ${whereSql} RETURNING *`;
    const res = await this.pool.query(sql, [...pk.map((k) => patch[k]), ...fk.map((k) => filter[k])]);
    return res.rows;
  }

  async delete(table, filter) {
    const fk = Object.keys(filter);
    const whereSql = fk.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ');
    const res = await this.pool.query(`DELETE FROM ${table} WHERE ${whereSql}`, fk.map((k) => filter[k]));
    return res.rowCount;
  }

  async select(table, filter = {}) {
    const fk = Object.keys(filter);
    const whereSql = fk.length ? `WHERE ${fk.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ')}` : '';
    const res = await this.pool.query(`SELECT * FROM ${table} ${whereSql}`, fk.map((k) => filter[k]));
    return res.rows;
  }

  async count(table, filter = {}) {
    const fk = Object.keys(filter);
    const whereSql = fk.length ? `WHERE ${fk.map((k, i) => `"${k}" = $${i + 1}`).join(' AND ')}` : '';
    const res = await this.pool.query(`SELECT COUNT(*)::int AS n FROM ${table} ${whereSql}`, fk.map((k) => filter[k]));
    return res.rows[0].n;
  }
}

let adapterPromise = null;

function getDb() {
  if (!adapterPromise) {
    const usePg = Boolean(config.database.url) && process.env.FORCE_MEMORY_DB !== 'true';
    const adapter = usePg ? new PgAdapter() : new MemoryAdapter();
    adapterPromise = adapter.init().catch((err) => {
      // Fail open to memory in non-production so environments without Postgres
      // still run; in production a DB failure should crash loudly.
      if (config.env === 'production') throw err;
      console.warn('[db] PostgreSQL unavailable, falling back to memory adapter:', err.message);
      adapterPromise = new MemoryAdapter().init();
      return adapterPromise;
    });
  }
  return adapterPromise;
}

async function closeDb() {
  if (adapterPromise) {
    const db = await adapterPromise;
    await db.close();
    adapterPromise = null;
  }
}

module.exports = { getDb, closeDb, MemoryAdapter, PgAdapter };
