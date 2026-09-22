# URBANFLOW AI

**AI-Powered Smart Urban Mobility Analytics & First/Last-Mile Connectivity Prediction Platform**

URBANFLOW AI is an enterprise SaaS platform for governments, transportation authorities, city
planners and urban development agencies. It analyses public transport usage and traffic flow,
detects first/last-mile connectivity gaps, forecasts travel demand, ranks investment urgency,
generates costed transit recommendations, simulates what-if interventions and produces
board-ready planning reports — with a natural-language AI Mobility Copilot on top.

---

## Table of contents

- [Platform modules](#platform-modules) · [Architecture](#architecture) · [Tech stack](#tech-stack)
- [Quick start](#quick-start) · [Demo accounts](#demo-accounts) · [Testing](#testing)
- [Deployment](#deployment) · [API documentation](#api-documentation) · [Security](#security)
- [Performance](#performance) · [Repository layout](#repository-layout)

---

## Platform modules

| # | Module | What it delivers |
|---|--------|------------------|
| 1 | Smart Mobility Dashboard | Role-aware KPIs, ridership trends, congestion hotspots, gap zones |
| 2 | GIS Mapping System | OpenStreetMap + PostGIS: traffic/population/transit layers, heatmaps, route analysis, clustering, geo/radius search, polygon selection |
| 3 | Connectivity Analytics | Composite Connectivity Score (distance · frequency · reliability · safety · intermodal), heatmaps, rankings, accessibility, coverage maps |
| 4 | First-Mile Analytics | Transit deserts, walking barriers, feeder-route issues, access barriers → improvement suggestions, priority zones |
| 5 | Last-Mile Analytics | Destination access problems, missing services, coverage gaps → optimisation & new-service recommendations |
| 6 | Demand Forecasting | Hourly/daily/weekly/seasonal forecasts — XGBoost + LightGBM ensemble with confidence bands, trend analysis |
| 7 | Gap Urgency Engine | Priority ranking from population density, economic activity, vulnerability, growth, connectivity deficit → investment hints |
| 8 | AI Recommendation Engine | New bus routes, shuttles, bike share, EV stations, route optimisation, service expansion — each with problem, root cause, cost, impact, ROI, priority, roadmap |
| 9 | AI Mobility Copilot | NL assistant: grounded DB querying, analytics explanations, report generation, recommendations, scenario analysis |
| 10 | What-If Simulation | New stops/routes/metro/bike-share/EV → ridership, congestion, accessibility, carbon, ROI projections |
| 11 | Report Generator | PDF / Excel / CSV across daily · weekly · monthly · annual — charts, maps, predictions, AI insights, recommendations |
| 12 | Notification System | Engine alerts: transit deserts, demand anomalies, urgency flags, report-ready events |
| 13 | Administration Portal | Users, RBAC role management, capability matrix, audit trail |

**User roles:** Administrator · City Planner · Transportation Authority · Analyst — each with
separate permissions, dashboards and navigation.

---

## Architecture

```
                        ┌──────────────────────────────┐
                        │  Vercel — React/Vite SPA     │
                        │  Tailwind · Recharts · Leaflet│
                        └──────────────┬───────────────┘
                                       │ HTTPS · /api/v1 (JWT)
                        ┌──────────────▼───────────────┐
                        │  Render — Express API        │
                        │  auth · RBAC · analytics ·   │
                        │  reports · simulations ·     │
                        │  copilot orchestration       │
                        └───┬──────────────┬───────────┘
              parameterised │              │ internal token
                    SQL     │              │
          ┌─────────────────▼──┐   ┌───────▼────────────────┐
          │ Neon PostgreSQL    │   │ Render — FastAPI AI     │
          │ + PostGIS          │   │ XGBoost + LightGBM +    │
          │ (zones, transit,   │   │ scikit-learn ensemble   │
          │  observations,     │   │ Gemini/OpenAI narrative │
          │  analytics, AI)    │   └─────────────────────────┘
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐    ┌─────────────────────────┐
          │ Redis (cache)      │    │ Cloudinary (report files)│
          └────────────────────┘    └─────────────────────────┘
```

Full diagram & data flow: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 · Vite · JavaScript · Tailwind CSS · shadcn-style UI · React Query · React Router · Framer Motion · Recharts · Leaflet + OpenStreetMap |
| Backend | Node.js · Express.js |
| AI service | Python · FastAPI · Scikit-Learn · XGBoost · LightGBM |
| AI models | Gemini API · OpenAI API (with deterministic grounded fallback) |
| Database | PostgreSQL · PostGIS (Neon in production) |
| Cache | Redis |
| Storage | Cloudinary |
| Auth | JWT + refresh-token rotation · bcrypt · RBAC |
| Monitoring | Sentry-ready error pipeline · structured error envelopes |
| Deployment | Frontend → Vercel · Backend & AI → Render · DB → Neon |
| Testing | Jest + Supertest · Vitest + React Testing Library · Pytest · full-stack smoke suite |

---

## Quick start

### Option A — zero-config (demo/CI mode)

No databases required: the API boots with an in-memory adapter preloaded with the full
Chennai demo dataset; the AI service trains its ensemble on request.

```bash
# 1 · API (http://localhost:4000)
cd backend && npm install && npm start        # auto-seeds demo data on boot

# 2 · AI service (http://localhost:8000/docs)
cd ai-service && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3 · Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev
```

### Option B — production-shaped (Docker)

```bash
docker compose up --build
# Frontend → http://localhost:5173 · API → http://localhost:4000 · AI → http://localhost:8000/docs
# Runs PostGIS 16 + Redis 7 + migrations + seed automatically
```

### Option C — real Postgres without Docker

```bash
createdb urbanflow && psql urbanflow -c "CREATE EXTENSION postgis;"
cd backend
cp .env.example .env          # set DATABASE_URL
npm run migrate               # applies database/migrations/*.sql
npm run db:seed               # bcrypt demo users + full mobility dataset
npm start
```

---

## Demo accounts

Password for every seeded account: **`Urbanflow#2026`**

| Email | Role | Default dashboard |
|-------|------|-------------------|
| `admin@urbanflow.ai` | Administrator | Administration portal |
| `planner@urbanflow.ai` | City Planner | Planner workspace |
| `authority@urbanflow.ai` | Transportation Authority | Operations view |
| `analyst@urbanflow.ai` | Analyst | Analyst workspace |

---

## Testing

```bash
# Backend — Jest + Supertest (auth, RBAC, analytics, reports, engine units)
cd backend && npm test            # 76 tests · coverage gated at 80%+ lines

# Frontend — Vitest + React Testing Library
cd frontend && npm test           # 16 tests (UI primitives, auth, dashboards, module pages)

# AI service — Pytest (forecast contract, ensemble, recommendations, LLM fallback)
cd ai-service && python -m pytest tests/ -q   # 29 tests

# Full-stack smoke — boots both services and checks 28 end-to-end behaviours
bash scripts/smoke.sh
```

Coverage targets: statements ≥ 80%, lines ≥ 80%, functions ≥ 75%, branches ≥ 65% (LLM
provider branches are exercised via mocked transports). CI enforces these gates plus a
production build of the frontend and a zero-config boot check of both services.

---

## Deployment

Production topology: **Vercel (frontend) · Render (backend + AI service) · Neon (PostgreSQL+PostGIS)**.

- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — step-by-step Neon/Render/Vercel setup, env vars, build/start commands, migrations on deploy hooks.
- [`render.yaml`](render.yaml) — Render Blueprint for `urbanflow-api` + `urbanflow-ai` (health checks included).
- [`frontend/vercel.json`](frontend/vercel.json) — SPA rewrites `/api` → the Render API host + security headers + asset caching.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — tests every push; `main` deploys via Render deploy hooks + `vercel-action`.

---

## API documentation

- **Swagger UI** — `GET /api/v1/docs` (interactive, try-it-out with your bearer token)
- **OpenAPI 3.0 spec** — `GET /api/v1/openapi.json`
- **Guide** — [`docs/API.md`](docs/API.md)
- **Postman** — [`docs/urbanflow.postman_collection.json`](docs/urbanflow.postman_collection.json)

Every list endpoint supports `?page=&limit=&q=&sort=-field` with `{ data, meta }` envelopes,
request-body validation, structured error envelopes, rate limiting and request logging.

---

## Security

JWT access tokens (15 min) + rotating refresh tokens (30 days, sha256-hashed at rest, replay
detected) · bcrypt password hashing · account lockout after repeated failures · RBAC enforced
per capability (`users:write`, `recommendations:approve`, `simulation:run`, …) · Helmet
security headers · CORS allowlist · HPP · parameterised SQL only (no string interpolation) ·
input validation on every write · Bearer-token APIs (no cookie auth ⇒ no classic CSRF surface)
· XSS protections (no `dangerouslySetInnerHTML`, CSP-ready headers) · secrets only via env.

---

## Performance

- API responses &lt; 500 ms (analytics cached in Redis; in-process fallback cache otherwise)
- Route-level code splitting — initial JS ≈ 32 KB gzip (vendor) + 31 KB app; charts/maps/motion lazy chunks
- Recharts/Leaflet loaded per-route; immutable asset caching on Vercel CDN
- GeoJSON payloads property-trimmed; heatmap points pre-aggregated server-side
- DB indexes on every foreign key, time-series `(tenant_id, observed_at DESC)` and GiST on all geometry columns

---

## Repository layout

```
urbanflow/
├── backend/                 # Express API — auth, RBAC, analytics, reports, simulations
│   ├── src/
│   │   ├── config/          # env, PostgreSQL/memory adapter, Redis/memory cache
│   │   ├── middleware/      # auth, rbac, validation, rate-limit, error handler
│   │   ├── routes/          # health, auth, mobility/GIS, analytics modules, docs
│   │   ├── services/        # analytics engine, forecasting, recommendations,
│   │   │                    # simulation, reports (PDF/Excel/CSV), copilot, notifications
│   │   └── migrations/      # SQL runner + dataset seeder
│   └── tests/               # 76 Jest/Supertest tests
├── ai-service/              # FastAPI ML service
│   ├── app/ml/              # XGBoost + LightGBM + sklearn ensemble forecasting
│   ├── app/services/        # Gemini/OpenAI narrative, recommendation cases
│   └── tests/               # 29 Pytest tests
├── frontend/                # React + Vite SPA
│   └── src/
│       ├── components/      # shadcn-style UI kit, charts, GIS map canvas
│       ├── pages/           # 12 modules + auth + admin
│       ├── hooks/           # React Query data layer
│       └── test/            # 16 Vitest/RTL tests
├── database/
│   ├── migrations/          # PostGIS schema (001–005) with constraints & indexes
│   └── seed/                # spatial demo seed SQL
├── docs/                    # architecture, deployment, API guide, Postman
├── scripts/smoke.sh         # 28-check full-stack smoke suite
├── docker-compose.yml       # PostGIS + Redis + API + AI + frontend
├── render.yaml              # Render Blueprint
└── .github/workflows/ci.yml # CI + CD pipeline
```

---

**Built for smart cities.** URBANFLOW AI turns raw mobility data into ranked, costed,
defensible transport investments — from first-mile feeder shuttles to metro-scale corridors.
#   d a t a x e l e r a t e  
 #   d a t a x e l e r a t e  
 