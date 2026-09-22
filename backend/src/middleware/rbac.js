'use strict';

const { HttpError } = require('../utils/response');

/**
 * Role matrix — every API declares the minimum capability it needs.
 * administrator   : full platform control
 * city_planner    : planning, simulation, recommendations, reports
 * transport_authority: operations, analytics, recommendations approval
 * analyst         : read-only analytics + personal reports
 */

const CAPABILITIES = {
  'users:read': ['administrator'],
  'users:write': ['administrator'],
  'admin:settings': ['administrator'],
  'audit:read': ['administrator'],
  'recommendations:write': ['administrator', 'city_planner', 'transport_authority'],
  'recommendations:approve': ['administrator', 'transport_authority'],
  'simulation:run': ['administrator', 'city_planner', 'transport_authority'],
  'reports:write': ['administrator', 'city_planner', 'transport_authority', 'analyst'],
  'analytics:read': ['administrator', 'city_planner', 'transport_authority', 'analyst'],
  'copilot:use': ['administrator', 'city_planner', 'transport_authority', 'analyst'],
  'notifications:read': ['administrator', 'city_planner', 'transport_authority', 'analyst'],
};

function requireCapability(capability) {
  const allowed = CAPABILITIES[capability];
  if (!allowed) throw new Error(`Unknown capability: ${capability}`);
  return (req, res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (!allowed.includes(req.user.role)) {
      return next(new HttpError(403, `Role '${req.user.role}' is not permitted to perform '${capability}'`));
    }
    return next();
  };
}

/** Dashboard navigation per role (used by the frontend shell too). */
const ROLE_DASHBOARDS = {
  administrator: 'admin',
  city_planner: 'planner',
  transport_authority: 'operations',
  analyst: 'analyst',
};

module.exports = { requireCapability, CAPABILITIES, ROLE_DASHBOARDS };
