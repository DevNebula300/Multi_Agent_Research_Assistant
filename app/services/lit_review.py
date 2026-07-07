"""
Literature review agent: the final synthesis step. Takes structured
paper summaries, the comparison analysis, and detected research gaps,
and drafts a coherent literature review section with inline citations —
the "client/student-ready deliverable" from the proposal.

This deliberately doesn't call Claude with raw abstracts again — it
reuses the already-verified structured output from earlier agents
(summarizer, comparator, gap_detector), so the lit review is grounded in
work that's already been checked, not a fresh ungrounded generation.
"""

import os
from anthropic import Anthropic

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are drafting a literature review section for a \
research topic. You will be given:
1. The research topic
2. Structured summaries of several papers (problem, method, dataset, \
metrics, findings, limitations)
3. A comparison analysis across those papers
4. Detected research gaps across the papers' limitations

Write a literature review section with this structure:
- A short introduction framing the topic (2-3 sentences)
- A body organized by theme or approach (not just one paragraph per \
paper) that synthesizes findings and cites papers inline as [paper_id]
- A "Research Gaps" subsection summarizing the open problems
- Use markdown headers (##) for structure

Base this ONLY on the provided summaries/comparison/gaps — do not add \
outside claims or papers that weren't provided. Aim for roughly 400-600 \
words.
"""


def generate_lit_review(topic: str, paper_cards: list[dict], comparison: dict, gaps: dict) -> str:
    cards_text = "\n\n".join(
        f"[{c['id']}] {c['title']}\n"
        f"Problem: {c.get('problem')}\n"
        f"Method: {c.get('method')}\n"
        f"Dataset: {c.get('dataset')}\n"
        f"Metrics: {c.get('metrics')}\n"
        f"Findings: {c.get('findings')}\n"
        f"Limitations: {c.get('limitations')}"
        for c in paper_cards
    )

    gaps_text = "\n".join(
        f"- {g['theme']}: {g['description']} (sources: {', '.join(g.get('supporting_paper_ids', []))})"
        for g in gaps.get("gaps", [])
    )

    user_message = (
        f"Research topic: {topic}\n\n"
        f"Paper summaries:\n{cards_text}\n\n"
        f"Comparison narrative:\n{comparison.get('narrative', '')}\n\n"
        f"Detected research gaps:\n{gaps_text}\n\n"
        f"Gap summary: {gaps.get('summary', '')}"
    )

    response = _client.messages.create(
        model=MODEL,
        max_tokens=1500,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    return "".join(
        block.text for block in response.content if block.type == "text"
    )
