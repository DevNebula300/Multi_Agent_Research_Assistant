"""
Research gap detector: looks across several papers' structured summaries
(specifically their "limitations" fields) and finds recurring themes or
unresolved problems — the kind of thing a literature review's "future
work" section would call out.
"""

import os
import json
from anthropic import Anthropic

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are a research analyst looking across multiple \
papers' stated limitations to find recurring gaps in the field.

You will be given a list of papers with their id, title, and stated \
limitations.

Respond with ONLY a JSON object (no markdown fences, no preamble) in \
this shape:

{
  "gaps": [
    {
      "theme": "short name for the recurring gap/limitation theme",
      "description": "1-2 sentence description of the gap",
      "supporting_paper_ids": ["id1", "id2"]
    }
  ],
  "summary": "2-3 sentence overview of the biggest gap in this set of papers"
}

Only include a theme if at least 2 papers point to it, unless there are \
fewer than 2 papers total. Base this ONLY on the limitations text \
provided — do not invent limitations that weren't stated.
"""


def detect_research_gaps(paper_cards: list[dict]) -> dict:
    """
    paper_cards: list of dicts from summarizer.py, each with at least
                 'id', 'title', 'limitations'
    """
    if len(paper_cards) < 1:
        return {"gaps": [], "summary": "No papers provided."}

    cards_text = "\n\n".join(
        f"[{c['id']}] {c['title']}\nLimitations: {c.get('limitations', 'not specified')}"
        for c in paper_cards
    )

    response = _client.messages.create(
        model=MODEL,
        max_tokens=800,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": cards_text}],
    )

    raw_text = "".join(
        block.text for block in response.content if block.type == "text"
    ).strip()

    if raw_text.startswith("```"):
        raw_text = raw_text.strip("`")
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {"gaps": [], "summary": "Could not parse gap analysis.", "raw_response": raw_text}
