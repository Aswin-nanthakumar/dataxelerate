'use strict';

const express = require('express');
const { body } = require('express-validator');
const authService = require('../services/authService');
const { validate } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { requireAuth } = require('../middleware/auth');
const { ok, created } = require('../utils/response');
const { getDb } = require('../config/database');
const { TENANT_ID } = require('../services/synthetic');

const router = express.Router();

router.post('/register', authLimiter, validate([
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 10 }).withMessage('Password must be at least 10 characters'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name required'),
  body('role').optional().isIn(['administrator', 'city_planner', 'transport_authority', 'analyst']),
]), async (req, res, next) => {
  try {
    const user = await authService.register({
      email: req.body.email,
      password: req.body.password,
      fullName: req.body.fullName,
      role: req.body.role || 'analyst',
      tenantId: req.body.tenantId || TENANT_ID,
    });
    return created(res, { user });
  } catch (err) { return next(err); }
});

router.post('/login', authLimiter, validate([
  body('email').isEmail(),
  body('password').isString().isLength({ min: 1 }),
]), async (req, res, next) => {
  try {
    const result = await authService.login(
      { email: req.body.email, password: req.body.password },
      { ip: req.ip, deviceInfo: req.headers['user-agent'] },
    );
    return ok(res, result);
  } catch (err) { return next(err); }
});

router.post('/refresh', validate([
  body('refreshToken').isString().isLength({ min: 20 }),
]), async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken, { ip: req.ip });
    return ok(res, result);
  } catch (err) { return next(err); }
});

router.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    return ok(res, { loggedOut: true });
  } catch (err) { return next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const db = await getDb();
    const [user] = await db.select('users', { id: req.user.id });
    return ok(res, { user: authService.sanitize(user), role_dashboard: require('../middleware/rbac').ROLE_DASHBOARDS[user.role] });
  } catch (err) { return next(err); }
});

module.exports = router;
