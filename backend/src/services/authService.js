'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const { getDb } = require('../config/database');
const { HttpError } = require('../utils/response');

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 15;

function hashPassword(plain) {
  return bcrypt.hashSync(plain, config.security.bcryptRounds);
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, tenantId: user.tenant_id, email: user.email },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function issueRefreshToken(user, meta = {}) {
  const db = await getDb();
  const token = crypto.randomBytes(48).toString('hex');
  const expires_at = new Date(Date.now() + config.jwt.refreshExpiresDays * 86400000).toISOString();
  await db.insert('refresh_tokens', {
    user_id: user.id,
    token_hash: hashToken(token),
    device_info: meta.deviceInfo || null,
    ip_address: meta.ip || null,
    expires_at,
    created_at: new Date().toISOString(),
  });
  return token;
}

async function register({ email, password, fullName, role = 'analyst', tenantId }) {
  const db = await getDb();
  const existing = (await db.select('users', { email: email.toLowerCase() }))[0]
    || (await db.select('users', { email }))[0];
  if (existing) throw new HttpError(409, 'An account with this email already exists');
  if (password.length < 10) throw new HttpError(422, 'Password must be at least 10 characters');

  const user = await db.insert('users', {
    tenant_id: tenantId,
    email: email.toLowerCase(),
    password_hash: hashPassword(password),
    full_name: fullName,
    role,
    is_active: true,
    is_verified: false,
    preferences: {},
  });
  return sanitize(user);
}

async function login({ email, password }, meta = {}) {
  const db = await getDb();
  const user = (await db.select('users', { email: email.toLowerCase() }))[0]
    || (await db.select('users', { email }))[0];
  if (!user) throw new HttpError(401, 'Invalid email or password');

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    throw new HttpError(423, 'Account temporarily locked due to repeated failed logins');
  }

  const match = bcrypt.compareSync(password, user.password_hash);
  if (!match) {
    const failed = (user.failed_logins || 0) + 1;
    const patch = { failed_logins: failed };
    if (failed >= MAX_FAILED_LOGINS) {
      patch.locked_until = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
      patch.failed_logins = 0;
    }
    await db.update('users', { id: user.id }, patch);
    throw new HttpError(401, 'Invalid email or password');
  }

  await db.update('users', {
    id: user.id,
  }, {
    failed_logins: 0, locked_until: null, last_login_at: new Date().toISOString(),
  });

  const fresh = (await db.select('users', { id: user.id }))[0] || user;
  const accessToken = signAccessToken(fresh);
  const refreshToken = await issueRefreshToken(fresh, meta);
  return { user: sanitize(fresh), accessToken, refreshToken };
}

async function refresh(rawToken, meta = {}) {
  const db = await getDb();
  const rows = await db.select('refresh_tokens', { token_hash: hashToken(rawToken) });
  const record = rows[0];
  if (!record || record.revoked_at || new Date(record.expires_at) < new Date()) {
    throw new HttpError(401, 'Refresh token is invalid or expired');
  }
  const [user] = await db.select('users', { id: record.user_id });
  if (!user || user.is_active === false) throw new HttpError(401, 'Account inactive');

  // Rotate: revoke old, issue new.
  await db.update('refresh_tokens', { id: record.id }, { revoked_at: new Date().toISOString() });
  const accessToken = signAccessToken(user);
  const refreshToken = await issueRefreshToken(user, meta);
  return { user: sanitize(user), accessToken, refreshToken };
}

async function logout(rawToken) {
  if (!rawToken) return;
  const db = await getDb();
  await db.update('refresh_tokens', { token_hash: hashToken(rawToken) }, { revoked_at: new Date().toISOString() });
}

function sanitize(user) {
  const { password_hash: _ph, ...safe } = user;
  return safe;
}

module.exports = { register, login, refresh, logout, hashPassword, signAccessToken, sanitize };
