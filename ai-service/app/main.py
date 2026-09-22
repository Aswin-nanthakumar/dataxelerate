"""URBANFLOW AI Service — FastAPI entrypoint.

Run: uvicorn app.main:app --host 0.0.0.0 --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers.api import router

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "ML microservice for URBANFLOW: demand forecasting (XGBoost/LightGBM/sklearn "
        "ensemble), AI recommendations and copilot narrative. Internal service — "
        "protects its endpoints with a shared internal token."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {"service": settings.app_name, "docs": "/docs", "health": "/health"}
