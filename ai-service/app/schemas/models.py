"""Pydantic request/response schemas for the AI service."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HistoryPoint(BaseModel):
    observed_at: str
    boardings: float
    hour_of_day: int = 0
    day_of_week: int = 0
    temperature_c: Optional[float] = None
    precipitation_mm: Optional[float] = None
    is_holiday: bool = False
    has_event: bool = False


class ForecastRequest(BaseModel):
    granularity: str = Field("daily", pattern="^(hourly|daily|weekly|seasonal)$")
    horizon: int = Field(14, ge=1, le=90)
    zone_id: Optional[str] = None
    history: List[HistoryPoint] = []


class Prediction(BaseModel):
    timestamp: str
    predicted_value: float
    lower_bound: float
    upper_bound: float
    confidence: float


class ForecastResponse(BaseModel):
    model_name: str
    model_version: str
    granularity: str
    horizon: int
    predictions: List[Prediction]
    feature_importance: Dict[str, float] = {}
    metrics: Dict[str, float] = {}


class RecommendRequest(BaseModel):
    zone_name: str
    connectivity_deficit: float = Field(0.5, ge=0, le=1)
    urgency: float = Field(0.5, ge=0, le=1)
    population: int = 50000
    growth_rate: float = 0.03
    context: str = ""


class RecommendationItem(BaseModel):
    rec_type: str
    title: str
    problem: str
    root_cause: str
    priority_level: str
    roi: float
    estimated_cost_usd: float


class RecommendResponse(BaseModel):
    items: List[RecommendationItem]
    generator: str


class CopilotRequest(BaseModel):
    message: str
    context: Dict[str, Any] = {}


class CopilotResponse(BaseModel):
    answer: str
    provider: str
    intent: str = "general"


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    models: Dict[str, bool] = {}
