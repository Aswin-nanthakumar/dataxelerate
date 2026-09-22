"""Unit tests for ML forecasting internals and recommendation logic."""

import numpy as np

from app.ml import forecasting
from app.services import recommend as recsvc
from app.schemas.models import RecommendRequest


def hist(n=80):
    return [
        {
            "observed_at": f"2026-03-{(i // 24) + 1:02d}T{i % 24:02d}:00:00Z",
            "boardings": 500 + (i % 24) * 30 + (i % 7) * 40,
            "hour_of_day": i % 24,
            "day_of_week": i % 7,
        }
        for i in range(n)
    ]


class TestFeatureEngineering:
    def test_build_frame_empty_gets_single_row(self):
        df = forecasting.build_frame([])
        assert len(df) == 1
        assert df["boardings"].iloc[0] == 1000

    def test_make_features_creates_lags(self):
        df = forecasting.build_frame(hist(30))
        feats = forecasting.make_features(df)
        for col in forecasting.FEATURE_COLS:
            assert col in feats.columns
        assert not feats[forecasting.FEATURE_COLS].isna().any().any()

    def test_signature_is_stable(self):
        rows = hist(20)
        assert forecasting._signature(rows, "daily") == forecasting._signature(rows, "daily")
        assert forecasting._signature(rows, "daily") != forecasting._signature(rows, "hourly")


class TestEnsemble:
    def test_ensemble_trains_and_predicts(self):
        df = forecasting.build_frame(hist(120))
        feats = forecasting.make_features(df)
        model = forecasting.EnsembleModel().fit(feats[forecasting.FEATURE_COLS], feats["boardings"])
        preds = model.predict_frame(feats[forecasting.FEATURE_COLS])
        assert len(preds) == len(feats)
        assert np.isfinite(preds).all()
        assert model.mae >= 0
        assert abs(sum(model.importances.values()) - 1.0) < 0.05

    def test_forecast_end_to_end_contract(self):
        out = forecasting.forecast(hist(120), "hourly", 6)
        assert out["model_version"] == "2.0.0"
        assert len(out["predictions"]) == 6
        timestamps = [p["timestamp"] for p in out["predictions"]]
        assert timestamps == sorted(timestamps)
        assert out["metrics"]["train_rows"] == 120

    def test_model_cache_hits(self):
        rows = hist(60)
        forecasting.forecast(rows, "daily", 3)
        sig = forecasting._signature(rows, "daily")
        assert sig in forecasting._cache


class TestRecommendationLogic:
    def test_priority_buckets(self):
        assert recsvc._priority(0.9) == "critical"
        assert recsvc._priority(0.6) == "high"
        assert recsvc._priority(0.45) == "medium"
        assert recsvc._priority(0.1) == "low"

    def test_high_deficit_builds_comprehensive_plan(self):
        items = recsvc.recommend(RecommendRequest(
            zone_name="Manali", connectivity_deficit=0.85, urgency=0.8, growth_rate=0.05))
        types = [i.rec_type for i in items]
        assert "shuttle_service" in types
        assert "ev_station" in types
        assert "pedestrian_improvement" in types

    def test_costs_and_roi_are_positive_for_strong_cases(self):
        items = recsvc.recommend(RecommendRequest(
            zone_name="Avadi", connectivity_deficit=0.7, urgency=0.7))
        for i in items:
            assert i.estimated_cost_usd > 0
            assert isinstance(i.roi, float)


class TestLLMFallback:
    def test_polish_falls_back_without_keys(self):
        import anyio
        from app.services import llm
        from app.config import settings
        settings.gemini_api_key = ""
        settings.openai_api_key = ""

        async def run():
            return await llm.polish("sys", "prompt", "fallback answer")

        answer, provider = anyio.run(run)
        assert answer == "fallback answer"
        assert provider == "deterministic"

    def test_polish_handles_provider_exceptions(self):
        import anyio
        from app.services import llm
        from app.config import settings
        settings.gemini_api_key = "bad-key"

        async def run():
            return await llm.polish("sys", "prompt", "safe fallback")

        answer, provider = anyio.run(run)
        assert answer == "safe fallback"
        settings.gemini_api_key = ""
