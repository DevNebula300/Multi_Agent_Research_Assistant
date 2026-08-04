"""
Shared Gemini client used by all generation agents.

Uses the Gemini REST API via requests so we don't pull in heavy Google
SDK / cryptography build deps. Keeps model choice and API wiring in one
place so services only care about system/user prompts and max tokens.
"""

import os

import requests

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


def complete(system: str, user: str, max_tokens: int = 1000) -> str:
    """Generate a text completion with a system instruction."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to your .env file "
            "(see .env.example)."
        )

    url = f"{_API_BASE}/models/{MODEL}:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"maxOutputTokens": max_tokens},
    }

    response = requests.post(
        url,
        params={"key": api_key},
        json=payload,
        timeout=120,
    )
    if not response.ok:
        detail = response.text
        raise RuntimeError(
            f"Gemini API error ({response.status_code}): {detail}"
        )

    data = response.json()
    try:
        parts = data["candidates"][0]["content"]["parts"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"Unexpected Gemini response shape: {data}") from exc

    text = "".join(part.get("text", "") for part in parts)
    return text.strip()
