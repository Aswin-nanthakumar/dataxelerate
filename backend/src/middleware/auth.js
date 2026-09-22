'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const { HttpError } = require('../utils/response');
const { getDb } = require('../config/database');

/** Verifies Bearer access tokens and attaches { id, role, tenantId } to req.user. */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Authentication required');

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.accessSecret);
    } catch (err) {
      const msg = err.name === 'TokenExpiredError' ? 'Access token expired' : 'Invalid access token';
      throw new HttpError(401, msg);
    }

    const db = await getDb();
    const [user] = await db.select('users', { id: payload.sub });
    if (!user || user.is_active === false) throw new HttpError(401, 'Account inactive or not found');

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id || payload.tenantId,
      fullName: user.full_name,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };
