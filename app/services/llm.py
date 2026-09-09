"""
Shared multi-provider LLM client used by all generation agents.

Supports client- or server-provided credentials for:
  - gemini     (Google Generative Language API)
  - anthropic  (Claude Messages API)
  - openai     (Chat Completions)
  - openrouter (OpenAI-compatible; many underlying models)

Uses plain `requests` so we don't pull in heavy SDKs. Agents only call
`complete(system, user, max_tokens)`.
"""

from __future__ import annotations

import os
import threading
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator, Optional

import requests

SUPPORTED_PROVIDERS = ("gemini", "anthropic", "openai", "openrouter")

DEFAULT_MODELS = {
    "gemini": os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
    "anthropic": os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-latest"),
    "openai": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    "openrouter": os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini"),
}

_ENV_KEY_NAMES = {
    "gemini": "GEMINI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}

# threading.local is safe with FastAPI sync routes (threadpool). ContextVar
# breaks across dependency enter/exit when workers differ.
_thread_state = threading.local()


@dataclass(frozen=True)
class LlmCredentials:
    provider: str
    api_key: Optional[str] = None
    model: Optional[str] = None


def _normalize_provider(provider: Optional[str]) -> str:
    value = (provider or "").strip().lower()
    if not value:
        return (os.getenv("LLM_PROVIDER") or "gemini").strip().lower()
    return value


def build_credentials(
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> LlmCredentials:
    """Build + validate credentials from client headers and/or server env."""
    normalized = _normalize_provider(provider)
    if normalized not in SUPPORTED_PROVIDERS:
        raise RuntimeError(
            f"Unsupported LLM provider '{normalized}'. "
            f"Choose one of: {', '.join(SUPPORTED_PROVIDERS)}."
        )

    key = (api_key or "").strip() or None
    chosen_model = (model or "").strip() or None

    if not key:
        key = (os.getenv(_ENV_KEY_NAMES[normalized]) or "").strip() or None
    if not key:
        key = (os.getenv("LLM_API_KEY") or "").strip() or None
    if not chosen_model:
        chosen_model = DEFAULT_MODELS[normalized]

    if not key:
        raise RuntimeError(
            "No LLM API key provided. Add your provider + key in the app "
            f"settings, or set {_ENV_KEY_NAMES[normalized]} on the server."
        )

    return LlmCredentials(provider=normalized, api_key=key, model=chosen_model)


def resolve_credentials() -> LlmCredentials:
    """Resolve credentials for the current worker thread."""
    override = getattr(_thread_state, "creds", None)
    if isinstance(override, LlmCredentials):
        return override
    return build_credentials()


@contextmanager
def applied_credentials(creds: LlmCredentials) -> Iterator[LlmCredentials]:
    """Bind credentials for the duration of an endpoint body (same thread)."""
    prev = getattr(_thread_state, "creds", None)
    _thread_state.creds = creds
    try:
        yield creds
    finally:
        _thread_state.creds = prev


@contextmanager
def use_llm_credentials(
    provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None,
) -> Iterator[LlmCredentials]:
    """Temporarily set request-scoped LLM credentials."""
    creds = build_credentials(provider=provider, api_key=api_key, model=model)
    with applied_credentials(creds) as bound:
        yield bound


@contextmanager
def use_api_key(api_key: Optional[str]) -> Iterator[LlmCredentials]:
    with use_llm_credentials(api_key=api_key) as bound:
        yield bound


def get_api_key() -> str:
    """Resolve just the API key (used by early validation)."""
    return resolve_credentials().api_key or ""


def complete(system: str, user: str, max_tokens: int = 1000) -> str:
    """Generate a text completion with a system instruction."""
    creds = resolve_credentials()
    assert creds.api_key and creds.model

    if creds.provider == "gemini":
        return _complete_gemini(creds.api_key, creds.model, system, user, max_tokens)
    if creds.provider == "anthropic":
        return _complete_anthropic(creds.api_key, creds.model, system, user, max_tokens)
    if creds.provider in ("openai", "openrouter"):
        return _complete_openai_compatible(
            creds.provider, creds.api_key, creds.model, system, user, max_tokens
        )

    raise RuntimeError(f"Unsupported LLM provider '{creds.provider}'.")


def _complete_gemini(
    api_key: str, model: str, system: str, user: str, max_tokens: int
) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"maxOutputTokens": max_tokens},
    }
    response = requests.post(
        url, params={"key": api_key}, json=payload, timeout=120
    )
    if not response.ok:
        raise RuntimeError(
            f"Gemini API error ({response.status_code}): {response.text}"
        )

    data = response.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Gemini response shape: {data}") from exc

    return "".join(part.get("text", "") for part in parts).strip()


def _complete_anthropic(
    api_key: str, model: str, system: str, user: str, max_tokens: int
) -> str:
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    if not response.ok:
        raise RuntimeError(
            f"Anthropic API error ({response.status_code}): {response.text}"
        )

    data = response.json()
    try:
        blocks = data["content"]
        text = "".join(
            block.get("text", "") for block in blocks if block.get("type") == "text"
        )
    except (KeyError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Anthropic response shape: {data}") from exc

    return text.strip()


def _complete_openai_compatible(
    provider: str,
    api_key: str,
    model: str,
    system: str,
    user: str,
    max_tokens: int,
) -> str:
    if provider == "openrouter":
        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173"),
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "ScholarAI"),
        }
    else:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    response = requests.post(url, headers=headers, json=payload, timeout=120)
    if not response.ok:
        label = "OpenRouter" if provider == "openrouter" else "OpenAI"
        raise RuntimeError(
            f"{label} API error ({response.status_code}): {response.text}"
        )

    data = response.json()
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected {provider} response shape: {data}") from exc

    return (text or "").strip()
