# Multi-Agent Research Assistant — Week 1 MVP

Searchable paper library with citation-backed Q&A, built on arXiv.
This is the foundation the rest of the multi-agent system (summarizer,
claim checker, comparison, lit review) will plug into over the next 3 weeks.

## What's here

```
app/
  main.py                    FastAPI app entry point
  services/
    arxiv_client.py          Searches arXiv, parses results
    vector_store.py          Embeds abstracts + stores/retrieves via Chroma
    answer_generator.py      Calls Claude to answer questions with citations
  routers/
    papers.py                POST /api/search and POST /api/ask endpoints
requirements.txt
.env.example
```

## Setup

1. Create a virtual environment and install dependencies:
   ```bash
   python3 -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and add your Anthropic API key:
   ```bash
   cp .env.example .env
   ```
   Get a key at https://console.anthropic.com/ (Settings → API Keys).

3. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   You should see it running at http://127.0.0.1:8000

## Try it

**1. Index some papers on a topic:**
```bash
curl -X POST http://127.0.0.1:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{"topic": "RAG evaluation methods for enterprise AI", "max_results": 10}'
```

**2. Ask a question against what you indexed:**
```bash
curl -X POST http://127.0.0.1:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What evaluation metrics are commonly used for RAG systems?"}'
```

You'll get back an answer with inline `[arxiv_id]` citations plus the raw
source paper metadata it was grounded in.

Or skip curl and use the interactive Swagger docs at
http://127.0.0.1:8000/docs

## Design notes for next weeks

- **Embeddings** currently run locally via `sentence-transformers`
  (`all-MiniLM-L6-v2`) — free, no API key, good enough for Week 1.
  Swap for a hosted embedding model later if retrieval quality needs it.
- **Vector store** is Chroma running in local persistent mode
  (`./chroma_data/`). Fine for a solo dev/demo; swap for a hosted
  vector DB before this goes to multiple users.
- **`answer_generator.py`** is intentionally the seed of the Week 3
  claim-checker: since every claim is forced to cite a paper ID, a
  claim-checker agent can later parse those citations and verify each
  one against the actual abstract text.
- Semantic Scholar and PubMedQA sources aren't wired in yet — add them
  as siblings to `arxiv_client.py` (same `Paper` shape) when you get there.

## Known gaps (by design, for Week 1)

- No ranking/filtering by recency or citation count yet (Week 1 plan
  item, not built here) — add a `ranking.py` service next.
- No summarizer agent yet — `/api/ask` answers directly from raw
  abstracts. Structured per-paper summaries are Week 2.
- No frontend — test via curl/Swagger for now.
