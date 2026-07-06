"""
Comparison agent: builds a comparison table across multiple papers'
structured summaries (method, dataset, metrics, limitations), plus a short
narrative highlighting how they differ.

Table construction is pure Python — it reuses the structured fields the
summarizer already extracted, so it's free and instant. Only the narrative
step calls Claude, since spotting patterns/contrasts across papers is
where a model actually adds value over a plain table.
"""

import os
from anthropic import Anthropic

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are a research assistant comparing multiple papers \
that have already been summarized into structured cards (method, dataset, \
metrics, limitations).

Write a short comparison (4-6 sentences) that:
- Highlights how the papers' methods or approaches differ from each other
- Notes any shared datasets/metrics that make them directly comparable, \
or flags when they aren't directly comparable
- Points out contrasting or complementary limitations

Cite papers by their ID in brackets, e.g. [2301.12345]. Base this ONLY on \
the structured summaries provided — do not invent details.
"""


def build_comparison_table(paper_cards: list[dict]) -> str:
    """Build a markdown comparison table directly from summarizer output."""
    header = "| Paper | Method | Dataset | Metrics | Limitations |\n"
    header += "|---|---|---|---|---|\n"

    rows = []
    for card in paper_cards:
        rows.append(
            f"| [{card['id']}] {card['title'][:50]} "
            f"| {card.get('method', 'not specified')} "
            f"| {card.get('dataset', 'not specified')} "
            f"| {card.get('metrics', 'not specified')} "
            f"| {card.get('limitations', 'not specified')} |"
        )

    return header + "\n".join(rows)


def generate_comparison_narrative(paper_cards: list[dict]) -> str:
    """Ask Claude for a short comparative analysis across the paper cards."""
    if len(paper_cards) < 2:
        return "Need at least 2 papers to generate a comparison."

    cards_text = "\n\n".join(
        f"[{c['id']}] {c['title']}\n"
        f"Method: {c.get('method')}\n"
        f"Dataset: {c.get('dataset')}\n"
        f"Metrics: {c.get('metrics')}\n"
        f"Limitations: {c.get('limitations')}"
        for c in paper_cards
    )

    response = _client.messages.create(
        model=MODEL,
        max_tokens=500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": cards_text}],
    )

    return "".join(
        block.text for block in response.content if block.type == "text"
    )


def compare_papers(paper_cards: list[dict]) -> dict:
    """Full comparison output: table + narrative, ready for the API response."""
    return {
        "table_markdown": build_comparison_table(paper_cards),
        "narrative": generate_comparison_narrative(paper_cards),
    }
