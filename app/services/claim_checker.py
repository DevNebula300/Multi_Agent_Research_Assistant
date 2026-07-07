"""
Claim checker agent: takes an answer that was generated with inline
citations (e.g. from answer_generator.py) and independently verifies each
claim against the actual abstract of the paper it cited.

This is the core "reduce hallucinations" piece from the proposal — it
doesn't trust that a citation next to a claim means the claim is actually
supported. It re-checks each one.
"""

import os
import json
import re
from anthropic import Anthropic

_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MODEL = "claude-sonnet-4-6"

SYSTEM_PROMPT = """You are a fact-checking agent for a research assistant.

You will be given:
1. An answer that makes several claims, each followed by a citation like [paper_id]
2. The actual abstracts for each cited paper_id

For EACH distinct claim in the answer, determine whether the cited \
paper's abstract actually supports it.

Respond with ONLY a JSON array (no markdown fences, no preamble), where \
each item has this shape:

{
  "claim": "the claim text as it appeared in the answer",
  "cited_id": "the paper id it was cited to",
  "verdict": "supported" | "partially_supported" | "unsupported" | "citation_not_found",
  "explanation": "one sentence on why you reached this verdict"
}

Use "citation_not_found" if the claim cites a paper_id that wasn't in \
the provided abstracts. Use "unsupported" if the abstract doesn't back \
the claim at all. Use "partially_supported" if the abstract supports \
part of the claim but overstates or adds something not present. Be \
strict — this is meant to catch hallucinations, not to be generous.
"""


def _extract_cited_ids(answer_text: str) -> list[str]:
    """Pull out every [paper_id] citation token that appears in the answer."""
    return list(set(re.findall(r"\[([\w\.\-]+)\]", answer_text)))


def check_claims(answer_text: str, sources: list[dict]) -> dict:
    """
    answer_text: the generated answer, containing [paper_id] citations
    sources: list of dicts with at least 'id' and 'abstract' keys — the
             same sources the answer was generated from
    """
    sources_by_id = {s["id"]: s for s in sources}
    cited_ids = _extract_cited_ids(answer_text)

    abstracts_block = "\n\n".join(
        f"[{sid}] {sources_by_id[sid]['abstract']}"
        for sid in cited_ids
        if sid in sources_by_id
    )

    user_message = (
        f"Answer to check:\n{answer_text}\n\n"
        f"Cited paper abstracts:\n{abstracts_block}"
    )

    response = _client.messages.create(
        model=MODEL,
        max_tokens=1200,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
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
        claims = json.loads(raw_text)
    except json.JSONDecodeError:
        claims = [{"parse_error": True, "raw_response": raw_text}]

    # Simple evidence-quality summary for a "dashboard" style view
    verdict_counts = {}
    for c in claims:
        v = c.get("verdict", "unknown")
        verdict_counts[v] = verdict_counts.get(v, 0) + 1

    total = len(claims) or 1
    supported = verdict_counts.get("supported", 0)

    return {
        "claims": claims,
        "verdict_counts": verdict_counts,
        "grounding_score": round(supported / total, 2),
    }
