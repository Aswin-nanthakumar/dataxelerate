'use strict';

/**
 * Swagger UI (CDN) + ReDoc fallback at /api/v1/docs — no build step required.
 */
const express = require('express');

const router = express.Router();

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>URBANFLOW AI — API Documentation</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/>
<style>
  body { margin: 0; background: #ffffff; font-family: ui-sans-serif, system-ui, sans-serif; }
  .topbar { display:none }
  header { background:#0F172A; color:#fff; padding:16px 24px; }
  header h1 { margin:0; font-size:18px; font-weight:600; letter-spacing:-0.01em }
  header p { margin:4px 0 0; color:#94A3B8; font-size:12px }
  .badge { display:inline-block; background:#2563EB; border-radius:10px; font-size:10px; padding:2px 8px; margin-left:8px; vertical-align:middle }
</style>
</head>
<body>
<header><h1>URBANFLOW AI <span class="badge">v1 · REST</span></h1>
<p>Smart Urban Mobility Analytics & First/Last-Mile Connectivity Prediction — OpenAPI 3.0</p></header>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  window.ui = SwaggerUIBundle({ url: '/api/v1/openapi.json', dom_id: '#swagger-ui', deepLinking: true, defaultModelsExpandDepth: 1 });
</script>
</body>
</html>`;

router.get('/', (req, res) => res.type('html').send(HTML));
router.get('/openapi.json', (req, res) => res.json(require('../openapi')));

module.exports = router;
