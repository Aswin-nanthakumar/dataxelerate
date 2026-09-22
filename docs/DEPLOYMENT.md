# URBANFLOW AI — Deployment Guide

Target topology: **Vercel (frontend) · Render (backend + AI) · Neon (PostgreSQL + PostGIS) ·
Redis (Render Key Value) · Cloudinary (report artefacts) · Sentry (error monitoring)**.

---

## 1. Database — Neon PostgreSQL

1. Create a Neon project → Postgres **16** (PostGIS is enabled per-database below).
2. In the Neon SQL editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Copy the **pooled** connection string (`?sslmode=require`) — this becomes `DATABASE_URL`.
4. Run migrations + seed from your machine (or CI):
   ```bash
   cd backend
   DATABASE_URL='<neon-url>' DB_SSL=true npm run migrate    # 001–005 SQL migrations
   DATABASE_URL='<neon-url>' DB_SSL=true npm run db:seed     # demo tenant, users, dataset
   ```

---

## 2. Backend — Render

1. Render → **New → Blueprint** → connect the repo (`render.yaml` provisions both services).
   Or manually: **New → Web Service** with:
   | Setting | Value |
   |---------|-------|
   | Root directory | `backend` |
   | Runtime | Node |
   | Build command | `npm ci` |
   | Start command | `node src/index.js` |
   | Health check path | `/health/ready` |
2. Environment variables (see `backend/.env.example`):

   | Variable | Notes |
   |----------|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` (Render injects its own; app reads `process.env.PORT`) |
   | `DATABASE_URL` | Neon pooled string |
   | `DB_SSL` | `true` |
   | `REDIS_URL` | Render Key Value URL |
   | `AI_SERVICE_URL` | e.g. `https://urbanflow-ai.onrender.com` |
   | `AI_SERVICE_TOKEN` | long random string (same as AI `INTERNAL_TOKEN`) |
   | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | 64-char random strings |
   | `CORS_ORIGINS` | `https://<your-app>.vercel.app` |
   | `GEMINI_API_KEY` / `OPENAI_API_KEY` | optional LLM polish |
   | `CLOUDINARY_*` | optional report uploads |
   | `SENTRY_DSN` | optional error monitoring |

3. Deploy triggers: create a **Deploy Hook** on the service and put the URL in GitHub secret
   `RENDER_DEPLOY_HOOK_BACKEND` (CI fires it on `main`).

---

## 3. AI service — Render

| Setting | Value |
|---------|-------|
| Root directory | `ai-service` |
| Runtime | Python 3.12 |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port 8000` |
| Health check path | `/health` |

Env: `INTERNAL_TOKEN` (match `AI_SERVICE_TOKEN`), optional `GEMINI_API_KEY`, `OPENAI_API_KEY`.
GitHub secret `RENDER_DEPLOY_HOOK_AI` for CI deploys.

---

## 4. Frontend — Vercel

1. Vercel → **Add New → Project** → import repo.
2. | Setting | Value |
   |---------|-------|
   | Root directory | `frontend` |
   | Framework preset | Vite |
   | Build command | `npm run build` |
   | Output directory | `dist` |
3. `frontend/vercel.json` is picked up automatically:
   - rewrites `/api/*` and `/health*` to the Render API host (`https://dataxelerate.onrender.com`)
   - SPA fallback to `index.html`
   - security headers + immutable `/assets/*` caching
4. Env: `VITE_API_BASE=/api/v1`.
5. GitHub secrets for CI deploys: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

---

## 5. Post-deploy checklist

```bash
curl https://dataxelerate.onrender.com/health          # {"status":"ok"}
curl https://dataxelerate.onrender.com/health/ready    # database:true, cache:true
curl https://urbanflow-ai.onrender.com/health           # models: xgboost/lightgbm/sklearn true
curl -X POST https://dataxelerate.onrender.com/api/v1/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"admin@urbanflow.ai","password":"Urbanflow#2026"}'   # 200 + tokens
```
- Open `https://<app>.vercel.app` → login dashboard renders, map tiles load.
- `GET /api/v1/docs` shows Swagger UI against production.
- Change the seeded passwords immediately: `PATCH /api/v1/admin/users` + user re-registration
  policies, or run `npm run db:seed` with `SEED_PASSWORD` set to a strong secret.

---

## 6. Local production-parity run (Docker)

```bash
docker compose up --build
# migrate + seed run via the one-shot `migrate` service
```

## 7. Build & start commands (all targets)

| Service | Build | Start | Test |
|---------|-------|-------|------|
| Frontend | `npm run build` | `npm run preview` / static host | `npm test` |
| Backend | `npm ci` | `npm start` | `npm test` |
| AI service | `pip install -r requirements.txt` | `uvicorn app.main:app --port 8000` | `pytest` |
| Migrations | — | `npm run migrate && npm run db:seed` | — |
