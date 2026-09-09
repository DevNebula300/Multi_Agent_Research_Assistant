"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Optional

from fastapi import Header, HTTPException

from app.services.llm import LlmCredentials, build_credentials


def parse_llm_credentials(
    x_llm_provider: Optional[str] = Header(
        default=None,
        alias="X-LLM-Provider",
        description="LLM provider: gemini | anthropic | openai | openrouter",
    ),
    x_llm_api_key: Optional[str] = Header(
        default=None,
        alias="X-LLM-Api-Key",
        description="Client-provided API key for the selected provider.",
    ),
    x_llm_model: Optional[str] = Header(
        default=None,
        alias="X-LLM-Model",
        description="Optional model override (e.g. gpt-4o-mini, claude-3-5-haiku-latest).",
    ),
    x_gemini_api_key: Optional[str] = Header(
        default=None,
        alias="X-Gemini-Api-Key",
        description="Deprecated: use X-LLM-Api-Key instead.",
    ),
) -> LlmCredentials:
    """
    Parse client LLM headers (with server env fallback) into credentials.

    Returns a value for the endpoint to bind with `applied_credentials(...)`
    on the same worker thread (avoids ContextVar / yield teardown bugs).
    """
    api_key = (x_llm_api_key or x_gemini_api_key or "").strip() or None
    provider = (x_llm_provider or "").strip() or None
    model = (x_llm_model or "").strip() or None

    if api_key and not provider and x_gemini_api_key and not x_llm_api_key:
        provider = "gemini"

    try:
        return build_credentials(provider=provider, api_key=api_key, model=model)
    except RuntimeError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


# Backward-compatible aliases
llm_credentials = parse_llm_credentials
gemini_api_key = parse_llm_credentials
