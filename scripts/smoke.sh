#!/usr/bin/env bash
# URBANFLOW AI — full-stack smoke test.
# Boots AI service + backend against the memory adapter and exercises
# every core module end-to-end through real HTTP.
set -uo pipefail

API="http://127.0.0.1:4000/api/v1"
AI="http://127.0.0.1:8000"
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    PASS=$((PASS+1)); echo "  ✓ $name"
  else
    FAIL=$((FAIL+1)); echo "  ✗ $name — expected '$expected' in: $(echo "$actual" | head -c 160)"
  fi
}

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON_BIN="python3"
if [ -f "$ROOT_DIR/ai-service/.venv/Scripts/python.exe" ]; then
  PYTHON_BIN="$ROOT_DIR/ai-service/.venv/Scripts/python.exe"
elif [ -f "$ROOT_DIR/ai-service/.venv/bin/python" ]; then
  PYTHON_BIN="$ROOT_DIR/ai-service/.venv/bin/python"
fi

echo "== booting services =="
(cd "$ROOT_DIR/ai-service" && "$PYTHON_BIN" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 >/tmp/uf-ai.log 2>&1) &
AI_PID=$!
(cd "$ROOT_DIR/backend" && NODE_ENV=development node src/index.js >/tmp/uf-api.log 2>&1) &
API_PID=$!
for i in $(seq 1 15); do
  if curl -s "$AI/health" | grep -q "ok" && curl -s "$API/health" | grep -q "ok"; then
    break
  fi
  sleep 1
done

echo "== health =="
check "ai health" '"status":"ok"' "$(curl -s $AI/health)"
check "api liveness" '"status":"ok"' "$(curl -s $API/health)"
check "api readiness" '"database"' "$(curl -s $API/health/ready)"

echo "== auth & RBAC =="
ADMIN=$(curl -s -X POST $API/auth/login -H 'content-type: application/json' -d '{"email":"admin@urbanflow.ai","password":"Urbanflow#2026"}')
check "admin login" '"accessToken"' "$ADMIN"
TOKEN=$(echo "$ADMIN" | "$PYTHON_BIN" -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
REFRESH=$(echo "$ADMIN" | "$PYTHON_BIN" -c "import sys,json; print(json.load(sys.stdin)['data']['refreshToken'])")
check "auth/me" '"administrator"' "$(curl -s $API/auth/me -H "Authorization: Bearer $TOKEN")"
check "refresh rotation" '"accessToken"' "$(curl -s -X POST $API/auth/refresh -H 'content-type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}")"

ANALYST=$(curl -s -X POST $API/auth/login -H 'content-type: application/json' -d '{"email":"analyst@urbanflow.ai","password":"Urbanflow#2026"}' | "$PYTHON_BIN" -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
check "RBAC analyst blocked from /admin/users" 'not permitted' "$(curl -s $API/admin/users -H "Authorization: Bearer $ANALYST")"

echo "== mobility & GIS =="
check "dashboard KPIs" 'total_zones' "$(curl -s $API/mobility/dashboard -H "Authorization: Bearer $TOKEN")"
check "gis zones geojson" 'FeatureCollection' "$(curl -s $API/mobility/gis/zones -H "Authorization: Bearer $TOKEN")"
check "gis points filter" 'metro' "$(curl -s "$API/mobility/gis/points?mode=metro" -H "Authorization: Bearer $TOKEN")"
check "geo radius search" 'points' "$(curl -s "$API/mobility/gis/search?lat=13.05&lng=80.2&radius_km=3" -H "Authorization: Bearer $TOKEN")"
check "heatmap ridership" 'intensity' "$(curl -s $API/mobility/heatmap/ridership -H "Authorization: Bearer $TOKEN")"

echo "== analytics =="
check "connectivity scores" 'composite_score' "$(curl -s $API/connectivity -H "Authorization: Bearer $TOKEN")"
check "rankings" '"rank"' "$(curl -s $API/connectivity/rankings -H "Authorization: Bearer $TOKEN")"
check "first-mile issues" 'walk_barrier' "$(curl -s $API/first-mile -H "Authorization: Bearer $TOKEN")"
check "last-mile gaps" 'missing_services' "$(curl -s $API/last-mile -H "Authorization: Bearer $TOKEN")"
check "gap urgency" 'investment_hint_usd' "$(curl -s $API/gap-urgency -H "Authorization: Bearer $TOKEN")"
check "traffic hotspots" 'hotspot_level' "$(curl -s $API/mobility/traffic/hotspots -H "Authorization: Bearer $TOKEN")"

echo "== AI modules =="
check "forecast daily (AI service)" 'predicted_value' "$(curl -s "$API/forecast?granularity=daily&horizon=5" -H "Authorization: Bearer $TOKEN")"
check "recommendations business case" 'root_cause' "$(curl -s $API/recommendations -H "Authorization: Bearer $TOKEN")"
check "copilot intent" 'show_connectivity_gaps' "$(curl -s -X POST $API/copilot/chat -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"message":"Show connectivity gaps"}')"
check "simulation results" 'carbon_savings' "$(curl -s -X POST $API/simulations -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"name":"Smoke test stop","kind":"bus_stop","coordinates":[80.2,13.05]}')"

echo "== reports =="
check "pdf report bytes" 'bytes' "$(curl -s -X POST $API/reports -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"reportType":"mobility_overview","format":"pdf"}')"
PDF=$(curl -s -X POST "$API/reports?download=true" -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"format":"csv"}')
check "csv download stream" 'section,metric,value' "$PDF"

echo "== notifications & admin =="
check "notifications" 'items' "$(curl -s $API/notifications -H "Authorization: Bearer $TOKEN")"
check "admin users" 'email' "$(curl -s $API/admin/users -H "Authorization: Bearer $TOKEN")"
check "openapi spec" 'openapi' "$(curl -s $API/openapi.json)"
check "swagger docs" 'swagger-ui' "$(curl -s $API/docs)"

echo "== openapi docs =="
kill $AI_PID $API_PID 2>/dev/null
wait 2>/dev/null
echo
echo "SMOKE RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
