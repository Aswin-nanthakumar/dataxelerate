'use strict';

/** OpenAPI 3.0 specification — also served at /api/v1/openapi.json and rendered by Swagger UI at /api/v1/docs. */

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'URBANFLOW AI API',
    description: 'AI-Powered Smart Urban Mobility Analytics & First/Last-Mile Connectivity Prediction Platform. All analytics endpoints require a Bearer access token from /auth/login.',
    version: '1.0.0',
    contact: { name: 'URBANFLOW AI', url: 'https://urbanflow.ai' },
    license: { name: 'Commercial', url: 'https://urbanflow.ai/license' },
  },
  servers: [
    { url: '/api/v1', description: 'Current deployment' },
    { url: 'https://dataxelerate.onrender.com/api/v1', description: 'Production (Render)' },
  ],
  tags: [
    { name: 'Health', description: 'Liveness & readiness probes' },
    { name: 'Auth', description: 'JWT authentication, refresh rotation, RBAC' },
    { name: 'Mobility', description: 'Smart Mobility Dashboard & GIS layers' },
    { name: 'Connectivity', description: 'Composite connectivity scoring' },
    { name: 'First-Mile', description: 'Transit deserts & access barriers' },
    { name: 'Last-Mile', description: 'Destination access gaps' },
    { name: 'Gap Urgency', description: 'Investment prioritisation index' },
    { name: 'Forecasting', description: 'AI demand prediction (XGBoost/LightGBM)' },
    { name: 'Recommendations', description: 'AI recommendation engine' },
    { name: 'Simulation', description: 'What-if scenario engine' },
    { name: 'Reports', description: 'PDF / Excel / CSV generation' },
    { name: 'Copilot', description: 'AI Mobility Copilot (NL assistant)' },
    { name: 'Notifications', description: 'Alerts & notifications' },
    { name: 'Admin', description: 'User & RBAC administration' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              details: { type: 'array', items: { type: 'object' } },
            },
          },
        },
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' },
          totalPages: { type: 'integer' }, hasNext: { type: 'boolean' }, hasPrev: { type: 'boolean' },
        },
      },
      Zone: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' }, name: { type: 'string' }, code: { type: 'string' },
          population: { type: 'integer' }, area_sq_km: { type: 'number' },
          vulnerability_index: { type: 'number' }, economic_activity: { type: 'number' }, growth_rate: { type: 'number' },
        },
      },
      ConnectivityScore: {
        type: 'object',
        properties: {
          zone_id: { type: 'string' }, zone_name: { type: 'string' },
          distance_to_transit: { type: 'number' }, frequency_score: { type: 'number' },
          reliability_score: { type: 'number' }, safety_score: { type: 'number' }, intermodal_score: { type: 'number' },
          composite_score: { type: 'number' }, first_mile_score: { type: 'number' }, last_mile_score: { type: 'number' },
          accessibility_score: { type: 'number' }, is_transit_desert: { type: 'boolean' },
        },
      },
      Recommendation: {
        type: 'object',
        properties: {
          id: { type: 'string' }, title: { type: 'string' }, rec_type: { type: 'string' },
          problem: { type: 'string' }, root_cause: { type: 'string' },
          estimated_cost_usd: { type: 'number' }, roi: { type: 'number' },
          priority_level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          roadmap: { type: 'array', items: { type: 'object' } },
        },
      },
      ForecastPoint: {
        type: 'object',
        properties: {
          predicted_at: { type: 'string', format: 'date-time' }, predicted_value: { type: 'number' },
          lower_bound: { type: 'number' }, upper_bound: { type: 'number' }, confidence: { type: 'number' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: { tags: ['Health'], summary: 'Liveness probe', security: [], responses: { 200: { description: 'Service is alive' } } },
    },
    '/health/ready': {
      get: { tags: ['Health'], summary: 'Readiness probe (db + cache + ai)', security: [], responses: { 200: { description: 'Ready' }, 503: { description: 'Degraded' } } },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'], summary: 'Register a user', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password', 'fullName'], properties: { email: { type: 'string' }, password: { type: 'string' }, fullName: { type: 'string' }, role: { type: 'string' } } } } } },
        responses: { 201: { description: 'Created' }, 409: { description: 'Email exists' }, 422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Login → access + refresh tokens', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } } } } },
        responses: { 200: { description: 'Tokens issued' }, 401: { description: 'Invalid credentials' }, 423: { description: 'Account locked' } },
      },
    },
    '/auth/refresh': {
      post: { tags: ['Auth'], summary: 'Rotate refresh token', security: [], responses: { 200: { description: 'New token pair' }, 401: { description: 'Invalid refresh token' } } },
    },
    '/auth/logout': {
      post: { tags: ['Auth'], summary: 'Revoke refresh token', security: [], responses: { 200: { description: 'Logged out' } } },
    },
    '/auth/me': {
      get: { tags: ['Auth'], summary: 'Current user + role dashboard', responses: { 200: { description: 'Profile' } } },
    },
    '/mobility/dashboard': {
      get: { tags: ['Mobility'], summary: 'Role-aware Smart Mobility Dashboard payload', responses: { 200: { description: 'KPIs, trends, hotspots, gap zones' } } },
    },
    '/mobility/dashboard/kpis': {
      get: { tags: ['Mobility'], summary: 'Headline KPIs', responses: { 200: { description: 'KPI object' } } },
    },
    '/mobility/gis/zones': {
      get: { tags: ['Mobility'], summary: 'Zones as GeoJSON FeatureCollection', responses: { 200: { description: 'GeoJSON' } } },
    },
    '/mobility/gis/points': {
      get: { tags: ['Mobility'], summary: 'Transit points (bus/metro/bike/EV/parking)', parameters: [{ name: 'mode', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'GeoJSON' } } },
    },
    '/mobility/gis/routes': {
      get: { tags: ['Mobility'], summary: 'Transit routes as GeoJSON', responses: { 200: { description: 'GeoJSON' } } },
    },
    '/mobility/gis/search': {
      get: {
        tags: ['Mobility'], summary: 'Geo / radius / bbox search',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'lat', in: 'query', schema: { type: 'number' } }, { name: 'lng', in: 'query', schema: { type: 'number' } },
          { name: 'radius_km', in: 'query', schema: { type: 'number' } },
          { name: 'bbox', in: 'query', schema: { type: 'string', description: 'minLng,minLat,maxLng,maxLat' } },
        ],
        responses: { 200: { description: 'Matches' } },
      },
    },
    '/mobility/traffic/hotspots': {
      get: { tags: ['Mobility'], summary: 'Congestion hotspot ranking', responses: { 200: { description: 'Hotspots' } } },
    },
    '/mobility/heatmap/{layer}': {
      get: {
        tags: ['Mobility'], summary: 'Heatmap points (ridership|congestion|connectivity|demand)',
        parameters: [{ name: 'layer', in: 'path', required: true, schema: { type: 'string', enum: ['ridership', 'congestion', 'connectivity', 'demand'] } }],
        responses: { 200: { description: 'Heat points' } },
      },
    },
    '/connectivity': {
      get: {
        tags: ['Connectivity'], summary: 'Composite connectivity scores (paginated)',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'q', in: 'query', schema: { type: 'string' } }, { name: 'sort', in: 'query', schema: { type: 'string', description: '-composite_score' } },
        ],
        responses: { 200: { description: 'Scores + meta', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/ConnectivityScore' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } } } } } },
      },
    },
    '/connectivity/rankings': {
      get: { tags: ['Connectivity'], summary: 'Zone connectivity league table', responses: { 200: { description: 'Rankings' } } },
    },
    '/connectivity/heatmap': {
      get: { tags: ['Connectivity'], summary: 'Connectivity heatmap points', responses: { 200: { description: 'Heat points' } } },
    },
    '/first-mile': {
      get: { tags: ['First-Mile'], summary: 'Transit deserts, walking barriers, feeder issues + suggestions', responses: { 200: { description: 'First-mile report' } } },
    },
    '/last-mile': {
      get: { tags: ['Last-Mile'], summary: 'Destination access gaps + optimisation recommendations', responses: { 200: { description: 'Last-mile report' } } },
    },
    '/gap-urgency': {
      get: { tags: ['Gap Urgency'], summary: 'Gap Urgency Index ranking & investment hints', responses: { 200: { description: 'Urgency scores' } } },
    },
    '/forecast': {
      get: {
        tags: ['Forecasting'], summary: 'AI demand forecast (XGBoost/LightGBM ensemble w/ fallback)',
        parameters: [
          { name: 'granularity', in: 'query', schema: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'seasonal'] } },
          { name: 'horizon', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 90 } },
          { name: 'zone_id', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Predictions + confidence bands' } },
      },
    },
    '/recommendations': {
      get: {
        tags: ['Recommendations'], summary: 'AI recommendations (routes, shuttles, bike share, EV…)',
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string' } }, { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } }, { name: 'limit', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Recommendations', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Recommendation' } } } } } } } },
      },
    },
    '/recommendations/generate': {
      post: { tags: ['Recommendations'], summary: 'Regenerate recommendation set', responses: { 201: { description: 'Generated' }, 403: { description: 'RBAC denied' } } },
    },
    '/recommendations/{id}': {
      patch: {
        tags: ['Recommendations'], summary: 'Update recommendation status/priority',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Updated' }, 404: { description: 'Not found' } },
      },
    },
    '/simulations': {
      get: { tags: ['Simulation'], summary: 'List what-if simulations', responses: { 200: { description: 'Simulations' } } },
      post: {
        tags: ['Simulation'], summary: 'Run what-if scenario (bus stop/route/metro/bike/EV)',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'kind', 'coordinates'], properties: { name: { type: 'string' }, kind: { type: 'string', enum: ['bus_stop', 'bus_route', 'metro_station', 'bike_share', 'ev_station'] }, coordinates: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 }, radius_km: { type: 'number' } } } } } },
        responses: { 201: { description: 'Simulation result' } },
      },
    },
    '/reports': {
      get: { tags: ['Reports'], summary: 'List generated reports', responses: { 200: { description: 'Reports' } } },
      post: {
        tags: ['Reports'], summary: 'Generate PDF/Excel/CSV report',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { reportType: { type: 'string' }, period: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'annual'] }, format: { type: 'string', enum: ['pdf', 'excel', 'csv'] } } } } } },
        responses: { 201: { description: 'Report record (or binary with ?download=true)' } },
      },
    },
    '/reports/{id}/download': {
      get: { tags: ['Reports'], summary: 'Download report artefact', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Binary' } } },
    },
    '/copilot/chat': {
      post: {
        tags: ['Copilot'], summary: 'AI Mobility Copilot — NL query over live analytics',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['message'], properties: { message: { type: 'string' }, sessionId: { type: 'string' } } } } } },
        responses: { 200: { description: 'Grounded answer + intent + data' } },
      },
    },
    '/copilot/sessions/{sessionId}': {
      get: { tags: ['Copilot'], summary: 'Conversation history', parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Messages' } } },
    },
    '/notifications': {
      get: { tags: ['Notifications'], summary: 'User notifications', responses: { 200: { description: 'Notifications' } } },
    },
    '/notifications/{id}/read': {
      post: { tags: ['Notifications'], summary: 'Mark notification read', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
    },
    '/notifications/read-all': {
      post: { tags: ['Notifications'], summary: 'Mark all read', responses: { 200: { description: 'Count' } } },
    },
    '/admin/users': {
      get: { tags: ['Admin'], summary: 'List users (administrator)', responses: { 200: { description: 'Users' }, 403: { description: 'RBAC denied' } } },
    },
    '/admin/users/{id}': {
      patch: { tags: ['Admin'], summary: 'Update role / activate', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
    },
    '/admin/audit': {
      get: { tags: ['Admin'], summary: 'Audit log', responses: { 200: { description: 'Audit entries' } } },
    },
    '/admin/capabilities': {
      get: { tags: ['Admin'], summary: 'RBAC capability matrix', responses: { 200: { description: 'Matrix' } } },
    },
  },
};
