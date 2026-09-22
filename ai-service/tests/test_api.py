"""AI service test suite: health, forecasting, recommendations, copilot."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings

client = TestClient(app)
HEADERS = {"x-internal-token": settings.internal_token}


def sample_history(n: int = 120) -> list:
    import math
    rows = []
    for i in range(n):
        h = i % 24
        dow = i % 7
        base = 800 + 500 * math.sin(h / 3.8) + (200 if dow < 5 else -150) + i * 2
        rows.append({
            "observed_at": f"2026-06-{(i // 24) + 1:02d}T{h:02d}:00:00Z",
            "boardings": max(0, base),
            "hour_of_day": h,
            "day_of_week": dow,
            "temperature_c": 28 + (h % 8),
            "precipitation_mm": 2.0 if i % 17 == 0 else 0.0,
            "is_holiday": i == 40,
            "has_event": i == 55,
        })
    return rows


class TestHealth:
    def test_health_reports_model_availability(self):
        res = client.get("/health")
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "ok"
        assert body["models"]["sklearn"] is True
        assert "xgboost" in body["models"]
        assert "lightgbm" in body["models"]

    def test_root_meta(self):
        res = client.get("/")
        assert res.status_code == 200
        assert "docs" in res.json()


class TestForecast:
    def test_daily_forecast_contract(self):
        res = client.post("/forecast", headers=HEADERS, json={
            "granularity": "daily", "horizon": 7, "history": sample_history(),
        })
        assert res.status_code == 200
        body = res.json()
        assert len(body["predictions"]) == 7
        assert body["metrics"]["mae"] >= 0
        p = body["predictions"][0]
        assert p["lower_bound"] <= p["predicted_value"] <= p["upper_bound"]
        assert 0 < p["confidence"] <= 1
        assert body["feature_importance"]

    def test_hourly_forecast(self):
        res = client.post("/forecast", headers=HEADERS, json={
            "granularity": "hourly", "horizon": 24, "history": sample_history(),
        })
        assert res.status_code == 200
        assert len(res.json()["predictions"]) == 24

    def test_weekly_and_seasonal(self):
        for g in ("weekly", "seasonal"):
            res = client.post("/forecast", headers=HEADERS, json={
                "granularity": g, "horizon": 3, "history": sample_history(60),
            })
            assert res.status_code == 200
            assert res.json()["granularity"] == g

    def test_invalid_granularity_rejected(self):
        res = client.post("/forecast", headers=HEADERS, json={
            "granularity": "yearly", "horizon": 3, "history": sample_history(),
        })
        assert res.status_code == 422

    def test_empty_history_rejected(self):
        res = client.post("/forecast", headers=HEADERS, json={
            "granularity": "daily", "horizon": 3, "history": [],
        })
        assert res.status_code == 422

    def test_horizon_bounds_enforced(self):
        res = client.post("/forecast", headers=HEADERS, json={
            "granularity": "daily", "horizon": 999, "history": sample_history(),
        })
        assert res.status_code == 422

    def test_requires_internal_token(self):
        res = client.post("/forecast", json={
            "granularity": "daily", "horizon": 3, "history": sample_history(),
        })
        assert res.status_code == 401

    def test_predictions_never_negative(self):
        tiny = [{"observed_at": f"2026-06-01T{i:02d}:00:00Z", "boardings": i % 3,
                 "hour_of_day": i, "day_of_week": i % 7} for i in range(12)]
        res = client.post("/forecast", headers=HEADERS, json={
            "granularity": "hourly", "horizon": 5, "history": tiny,
        })
        assert res.status_code == 200
        for p in res.json()["predictions"]:
            assert p["predicted_value"] >= 0


class TestRecommend:
    def test_deficit_zone_gets_full_business_cases(self):
        res = client.post("/recommend", headers=HEADERS, json={
            "zone_name": "Manali", "connectivity_deficit": 0.8,
            "urgency": 0.75, "population": 121000, "growth_rate": 0.044,
        })
        assert res.status_code == 200
        items = res.json()["items"]
        assert len(items) >= 3
        types = {i["rec_type"] for i in items}
        assert "new_bus_route" in types
        for i in items:
            assert i["problem"] and i["root_cause"]
            assert i["estimated_cost_usd"] > 0
            assert i["priority_level"] in {"low", "medium", "high", "critical"}
        assert res.json()["generator"] in {"gemini", "openai", "deterministic"}

    def test_healthy_zone_gets_minimal_plan(self):
        res = client.post("/recommend", headers=HEADERS, json={
            "zone_name": "Anna Nagar", "connectivity_deficit": 0.1, "urgency": 0.2,
        })
        assert res.status_code == 200
        assert len(res.json()["items"]) >= 1

    def test_roi_ordered_desc(self):
        res = client.post("/recommend", headers=HEADERS, json={
            "zone_name": "Avadi", "connectivity_deficit": 0.7, "urgency": 0.6,
        })
        rois = [i["roi"] for i in res.json()["items"]]
        assert rois == sorted(rois, reverse=True)

    def test_validation_bounds(self):
        res = client.post("/recommend", headers=HEADERS, json={
            "zone_name": "X", "connectivity_deficit": 2.0,
        })
        assert res.status_code == 422


class TestCopilot:
    def test_copilot_answers_without_llm_keys(self):
        res = client.post("/copilot", headers=HEADERS, json={
            "message": "Show connectivity gaps",
            "context": {"gaps": 4},
        })
        assert res.status_code == 200
        body = res.json()
        assert len(body["answer"]) > 10
        assert body["provider"] == "deterministic"

    def test_copilot_requires_token(self):
        res = client.post("/copilot", json={"message": "hello"})
        assert res.status_code == 401


class TestModelInternals:
    def test_available_models_shape(self):
        from app.ml import forecasting
        avail = forecasting.available_models()
        assert set(avail.keys()) == {"xgboost", "lightgbm", "sklearn"}

    def test_build_frame_handles_empty(self):
        from app.ml.forecasting import build_frame
        df = build_frame([])
        assert len(df) == 1
