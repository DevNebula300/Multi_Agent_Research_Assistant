"""
Summarizer agent: turns a raw paper abstract into a structured "paper card"
covering problem, method, dataset, metrics, findings, and limitations.

This is what Week 1's /api/ask was missing — instead of answering a
one-off question, this gives a consistent, structured note per paper that
the comparison agent (Week 2) and lit review agent (Week 4) can both build
on top of.
"""

import os
import json
from anthropic import Anthropic

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are a research assistant that converts a paper's \
title and abstract into a structured summary card.

Respond with ONLY a JSON object (no markdown fences, no preamble) in \
exactly this shape:

{
  "problem": "what problem/gap the paper addresses",
  "method": "the core approach or technique used",
  "dataset": "datasets or benchmarks used, or 'not specified' if the abstract doesn't say",
  "metrics": "evaluation metrics used, or 'not specified' if unclear",
  "findings": "the main result or claim",
  "limitations": "stated or reasonably inferable limitations, or 'not specified'"
}

Base every field ONLY on the provided abstract. If the abstract doesn't \
contain enough information for a field, say "not specified" rather than \
guessing.
"""


def summarize_paper(paper: dict) -> dict:
    """
    paper: dict with at least 'id', 'title', 'abstract' keys
    returns: dict with the paper's id/title plus the structured summary fields
    """
    user_message = f"Title: {paper['title']}\n\nAbstract: {paper['abstract']}"

    response = _client.messages.create(
        model=MODEL,
        max_tokens=600,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    raw_text = "".join(
        block.text for block in response.content if block.type == "text"
    ).strip()

    # Claude sometimes wraps JSON in ```json fences despite instructions —
    # strip those defensively rather than trusting the prompt alone.
    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        card = json.loads(raw_text)
    except json.JSONDecodeError:
        card = {
            "problem": "not specified",
            "method": "not specified",
            "dataset": "not specified",
            "metrics": "not specified",
            "findings": "not specified",
            "limitations": "not specified",
            "parse_error": True,
            "raw_response": raw_text,
        }

    return {
        "id": paper["id"],
        "title": paper["title"],
        **card,
    }


def summarize_papers(papers: list[dict]) -> list[dict]:
    """Summarize a batch of papers, one Claude call per paper."""
    return [summarize_paper(p) for p in papers]
