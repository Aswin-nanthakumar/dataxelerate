"""FastAPI routers: health, forecast, recommend, copilot."""

from typing import Dict

from fastapi import APIRouter, Header, HTTPException

from ..config import settings
from ..ml import forecasting
from ..schemas.models import (
    CopilotRequest, CopilotResponse,
    ForecastRequest, ForecastResponse,
    RecommendRequest, RecommendResponse,
)
from ..services import llm, recommend as recsvc

router = APIRouter()


def _check_token(x_internal_token: str) -> None:
    if settings.internal_token and x_internal_token != settings.internal_token:
        raise HTTPException(status_code=401, detail="invalid internal token")


@router.get("/health")
async def health() -> Dict:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "models": forecasting.available_models(),
    }


@router.post("/forecast", response_model=ForecastResponse)
async def forecast(
    req: ForecastRequest,
    x_internal_token: str = Header(default=""),
) -> Dict:
    _check_token(x_internal_token)
    if not req.history:
        raise HTTPException(status_code=422, detail="history must not be empty")
    rows = [h.model_dump() for h in req.history]
    return forecasting.forecast(rows, req.granularity, req.horizon)


@router.post("/recommend", response_model=RecommendResponse)
async def recommend(
    req: RecommendRequest,
    x_internal_token: str = Header(default=""),
) -> Dict:
    _check_token(x_internal_token)
    items = recsvc.recommend(req)
    system = "You are URBANFLOW AI, a public-sector mobility investment analyst. Be concise and specific."
    prompt = (
        f"Zone {req.zone_name}: deficit {req.connectivity_deficit}, urgency {req.urgency}. "
        f"Context: {req.context or 'n/a'}\n"
        "Briefly (3 sentences) explain why these interventions matter and sequencing:"
        + ", ".join(i.rec_type for i in items)
    )
    narrative, provider = await llm.polish(
        system, prompt,
        "Interventions should sequence quick wins (shuttles, bike share) before capital works (new trunk routes).",
    )
    return {"items": items, "generator": provider, "narrative": narrative}


@router.post("/copilot", response_model=CopilotResponse)
async def copilot(
    req: CopilotRequest,
    x_internal_token: str = Header(default=""),
) -> Dict:
    _check_token(x_internal_token)
    system = (
        "You are URBANFLOW AI Mobility Copilot for city planners and transport authorities. "
        "Answer concisely and never invent numbers; use only provided context."
    )
    fallback = (
        "I analysed your request against live platform analytics. "
        "Open the related module for the full visual breakdown, or ask me to "
        "'show connectivity gaps', 'predict demand' or 'recommend feeder routes'."
    )
    prompt = f"Question: {req.message}\nPlatform context: {req.context or 'n/a'}"
    answer, provider = await llm.polish(system, prompt, fallback)
    return {"answer": answer, "provider": provider, "intent": "general"}
