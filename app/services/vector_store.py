"""
Lightweight paper store + TF-IDF retrieval.

Uses only the Python stdlib so the Railway container stays small (~tens of MB
idle) instead of loading torch / sentence-transformers / Chroma (~1GB+).
Fine for a portfolio/demo RAG workload with modest paper counts.
"""

from __future__ import annotations

import json
import math
import os
import re
import threading
from collections import Counter
from pathlib import Path

STORE_PATH = Path(os.getenv("CHROMA_DB_PATH", "./chroma_data")) / "papers.json"
_TOKEN_RE = re.compile(r"[a-z0-9]+")
_lock = threading.Lock()


def _tokenize(text: str) -> list[str]:
    return _TOKEN_RE.findall((text or "").lower())


def _ensure_parent() -> None:
    STORE_PATH.parent.mkdir(parents=True, exist_ok=True)


def _load() -> dict[str, dict]:
    if not STORE_PATH.exists():
        return {}
    try:
        with STORE_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict):
            return data
    except (json.JSONDecodeError, OSError):
        pass
    return {}


def _save(papers: dict[str, dict]) -> None:
    _ensure_parent()
    tmp = STORE_PATH.with_suffix(".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False)
    tmp.replace(STORE_PATH)


def _tfidf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    if not tokens:
        return {}
    tf = Counter(tokens)
    length = len(tokens)
    return {term: (count / length) * idf.get(term, 0.0) for term, count in tf.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    if not a or not b:
        return 0.0
    # Iterate the smaller vector
    if len(a) > len(b):
        a, b = b, a
    dot = sum(weight * b.get(term, 0.0) for term, weight in a.items())
    norm_a = math.sqrt(sum(weight * weight for weight in a.values()))
    norm_b = math.sqrt(sum(weight * weight for weight in b.values()))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _normalize_paper(paper: dict) -> dict:
    authors = paper.get("authors", [])
    if isinstance(authors, list):
        authors_str = ", ".join(authors)
    else:
        authors_str = str(authors or "")

    return {
        "id": paper["id"],
        "title": paper.get("title", ""),
        "abstract": paper.get("abstract", ""),
        "authors": authors_str,
        "pdf_url": paper.get("pdf_url", ""),
        "published": paper.get("published", ""),
        "source": paper.get("source", "arxiv"),
    }


def upsert_papers(papers: list[dict]) -> None:
    """Store/update papers for later retrieval by id or semantic query."""
    if not papers:
        return

    with _lock:
        store = _load()
        for paper in papers:
            normalized = _normalize_paper(paper)
            store[normalized["id"]] = normalized
        _save(store)


def get_papers_by_ids(paper_ids: list[str]) -> list[dict]:
    """Fetch previously indexed papers by id."""
    if not paper_ids:
        return []

    with _lock:
        store = _load()

    papers = []
    for paper_id in paper_ids:
        paper = store.get(paper_id)
        if paper:
            papers.append(dict(paper))
    return papers


def query_papers(question: str, top_k: int = 5) -> list[dict]:
    """Return the top_k most relevant stored papers for a natural-language question."""
    with _lock:
        store = _load()

    if not store:
        return []

    docs = list(store.values())
    tokenized = [_tokenize(f"{p.get('title', '')} {p.get('abstract', '')}") for p in docs]
    doc_count = len(tokenized)

    df: Counter[str] = Counter()
    for tokens in tokenized:
        df.update(set(tokens))

    idf = {
        term: math.log((1 + doc_count) / (1 + freq)) + 1.0
        for term, freq in df.items()
    }

    doc_vectors = [_tfidf_vector(tokens, idf) for tokens in tokenized]
    query_vec = _tfidf_vector(_tokenize(question), idf)

    scored: list[tuple[float, dict]] = []
    for paper, vector in zip(docs, doc_vectors):
        score = _cosine(query_vec, vector)
        # distance-like field kept for callers that previously used Chroma distances
        scored.append((score, {**paper, "distance": 1.0 - score}))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [paper for _, paper in scored[: max(top_k, 0)]]
