# URBANFLOW AI — API Guide

Base URL: `/api/v1` · Interactive Swagger: **`/api/v1/docs`** · Spec: **`/api/v1/openapi.json`**

## Conventions

- **Auth** — `Authorization: Bearer <access>` on every endpoint except `/auth/*`, `/health*`, `/docs`.
- **Envelopes** — success `{ "success": true, "data": …, "meta": … }`; failure
  `{ "success": false, "error": { "message": …, "details": […] } }`.
- **Lists** — `?page=1&limit=20&q=text&sort=-composite_score` → `meta: { page, limit, total, totalPages, hasNext, hasPrev }`.
- **Validation** — write bodies validated with express-validator → `422` with per-field details.
- **Rate limit** — 300 req/min per IP (`RATE_LIMIT_*`); auth endpoints 50/15 min.
- **Geospatial** — GeoJSON (`EPSG:4326`) everywhere; search supports `q`, `lat/lng/radius_km`, `bbox=minLng,minLat,maxLng,maxLat`.

## Endpoint map

### Health (public)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + uptime |
| GET | `/health/ready` | Readiness (db · cache · ai probes) |

### Auth (public except `/me`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register (role optional; admin-gated in prod flows) |
| POST | `/auth/login` | Returns `{ user, accessToken, refreshToken }` |
| POST | `/auth/refresh` | Rotates refresh token (old token revoked — replay → 401) |
| POST | `/auth/logout` | Revokes refresh token |
| GET | `/auth/me` | Profile + role dashboard key |

### Mobility dashboard & GIS — `analytics:read`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/mobility/dashboard` | Role-aware KPIs, trends, gap zones, hotspots, distribution |
| GET | `/mobility/dashboard/kpis` | Headline KPIs only |
| GET | `/mobility/gis/zones` | Zone polygons (GeoJSON FeatureCollection) |
| GET | `/mobility/gis/points?mode=bus\|metro\|bike_share\|ev_charger\|parking` | Transit points |
| GET | `/mobility/gis/routes` | Route linestrings with service attributes |
| GET | `/mobility/gis/search` | Geo + radius + bbox + text search |
| GET | `/mobility/traffic/hotspots` | Congestion hotspot ranking |
| GET | `/mobility/heatmap/{ridership\|congestion\|connectivity\|demand}` | Heatmap intensity points |

### Analytics — `analytics:read`
| Method | Path | Description |
|--------|------|-------------|
| GET | `/connectivity` | Composite scores (all five parameters) + pagination |
| GET | `/connectivity/rankings` | League table |
| GET | `/connectivity/heatmap` | Connectivity heat points |
| GET | `/first-mile` | Transit deserts, walk barriers, feeder issues + suggestions |
| GET | `/last-mile` | Destination gaps, missing services + optimisation advice |
| GET | `/gap-urgency` | Urgency ranking + investment hints + suggested actions |
| GET | `/forecast?granularity=hourly\|daily\|weekly\|seasonal&horizon=1..90` | Demand forecast with confidence bands + feature importance |

### Recommendations
| Method | Path | Capability | Description |
|--------|------|------------|-------------|
| GET | `/recommendations?type=&status=` | `analytics:read` | Full business cases |
| POST | `/recommendations/generate` | `recommendations:write` | Re-run engine |
| PATCH | `/recommendations/:id` | `recommendations:write` (+`recommendations:approve` for approved/implemented) | Status/priority |

### What-if simulation
| Method | Path | Capability | Description |
|--------|------|------------|-------------|
| POST | `/simulations` | `simulation:run` | `{ name, kind: bus_stop\|bus_route\|metro_station\|bike_share\|ev_station, coordinates: [lng,lat], radius_km }` |
| GET | `/simulations` | `analytics:read` | History |

### Reports
| Method | Path | Capability | Description |
|--------|------|------------|-------------|
| POST | `/reports?download=true` | `reports:write` | Generate PDF/Excel/CSV (stream with `download=true`) |
| GET | `/reports` | `reports:write` | List |
| GET | `/reports/:id/download` | `reports:write` | Download artefact |

### AI Mobility Copilot
| Method | Path | Capability | Description |
|--------|------|------------|-------------|
| POST | `/copilot/chat` | `copilot:use` | `{ message, sessionId? }` → grounded answer + intent + slim data payload |
| GET | `/copilot/sessions/:sessionId` | `copilot:use` | Conversation history |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/notifications?include_read=false` | List + unread count |
| POST | `/notifications/:id/read` | Mark read |
| POST | `/notifications/read-all` | Mark all read |

### Administration
| Method | Path | Capability | Description |
|--------|------|------------|-------------|
| GET | `/admin/users` | `users:read` | Users (password hashes always stripped) |
| PATCH | `/admin/users/:id` | `users:write` | Role / active flag |
| GET | `/admin/audit` | `audit:read` | Audit trail |
| GET | `/admin/capabilities` | `users:read` | RBAC capability matrix |

## Quick examples

```bash
TOKEN=$(curl -s -X POST $HOST/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"planner@urbanflow.ai","password":"Urbanflow#2026"}' | jq -r .data.accessToken)

curl -s "$HOST/api/v1/connectivity?sort=-composite_score&limit=5" -H "Authorization: Bearer $TOKEN"

curl -s -X POST "$HOST/api/v1/simulations" -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"name":"Metro extension","kind":"metro_station","coordinates":[80.227,12.9],"radius_km":3}'

curl -s -X POST "$HOST/api/v1/reports?download=true" -H "Authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' \
  -d '{"reportType":"investment_plan","period":"annual","format":"pdf"}' -o plan.pdf
```

## Error codes

| Status | Meaning |
|--------|---------|
| 400 | Malformed JSON body |
| 401 | Missing/expired/invalid token · bad credentials · revoked refresh |
| 403 | RBAC capability denied |
| 404 | Unknown route or entity |
| 409 | Conflicting entity (e.g. email exists) |
| 422 | Validation failure (details per field) |
| 423 | Account temporarily locked |
| 429 | Rate limit exceeded |
| 500 | Internal error (message only; stack never exposed) |
