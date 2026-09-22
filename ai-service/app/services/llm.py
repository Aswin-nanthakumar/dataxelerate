"""LLM narrative layer: Gemini / OpenAI polish with deterministic fallback."""

from __future__ import annotations

import json
from typing import Optional

import httpx

from ..config import settings


async def _gemini(prompt: str, system: str) -> Optional[str]:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-1.5-flash:generateContent?key={settings.gemini_api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": f"{system}\n\n{prompt}"}]}],
        "generationConfig": {"maxOutputTokens": 500, "temperature": 0.3},
    }
    async with httpx.AsyncClient(timeout=12.0) as client:
        res = await client.post(url, json=body)
        if res.status_code != 200:
            return None
        data = res.json()
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
            return text.strip() or None
        except (KeyError, IndexError, TypeError):
            return None


async def _openai(prompt: str, system: str) -> Optional[str]:
    async with httpx.AsyncClient(timeout=12.0) as client:
        res = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 500,
                "temperature": 0.3,
            },
        )
        if res.status_code != 200:
            return None
        try:
            text = res.json()["choices"][0]["message"]["content"]
            return text.strip() or None
        except (KeyError, IndexError, TypeError):
            return None


async def polish(system: str, prompt: str, fallback: str) -> tuple[str, str]:
    """Returns (answer, provider). Never raises — always yields usable text."""
    if settings.gemini_api_key:
        try:
            text = await _gemini(prompt, system)
            if text:
                return text, "gemini"
        except Exception:
            pass
    if settings.openai_api_key:
        try:
            text = await _openai(prompt, system)
            if text:
                return text, "openai"
        except Exception:
            pass
    return fallback, "deterministic"
