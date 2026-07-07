# Multi-Agent Research Assistant

A RAG (Retrieval-Augmented Generation) system that turns a research topic
into a source-grounded literature review — with paper retrieval,
structured summaries, comparison tables, claim verification, research gap
detection, and a full drafted lit review with citations.

Built over a 4-week plan; all four weeks are complete.

## What it does

1. **Search** — enter a topic, retrieve real papers from arXiv
2. **Ask** — ask a question, get an answer with inline citations back to specific papers
3. **Summarize** — turn any paper into a structured card (problem, method, dataset, metrics, findings, limitations)
4. **Compare** — compare multiple papers side by side in a table, plus a written analysis of how they differ
5. **Check claims** — independently re-verify a generated answer's claims against the actual source text, catching unsupported statements
6. **Find gaps** — detect recurring limitations/open problems across a set of papers
7. **Draft a lit review** — generate a full structured literature review section, with an optional `.docx` export

## Project structure

```
app/
├── main.py                      FastAPI app entry point
├── routers/
│   └── papers.py                All API endpoints (see below)
├── services/
│   ├── arxiv_client.py          Searches arXiv, parses paper metadata
│   ├── vector_store.py          Embeds abstracts, stores/retrieves via Chroma
│   ├── answer_generator.py      Week 1 — citation-backed Q&A
│   ├── summarizer.py            Week 2 — structured paper cards
│   ├── comparator.py            Week 2 — comparison table + narrative
│   ├── claim_checker.py         Week 3 — verifies claims against sources
│   ├── gap_detector.py          Week 3 — finds recurring research gaps
│   ├── lit_review.py            Week 4 — drafts the full literature review
│   └── exporter.py              Week 4 — exports the review to .docx
└── evaluation/
    ├── evaluate.py               Runs the pipeline against test questions, scores grounding/accuracy
    └── eval_dataset.sample.json  Sample QA pairs (PubMedQA-style shape)
```

## API endpoints

| Method | Endpoint | What it does |
|---|---|---|
| POST | `/api/search` | Retrieve + index papers from arXiv for a topic |
| POST | `/api/ask` | Ask a question, get a cited answer from indexed papers |
| POST | `/api/summarize` | Turn indexed papers into structured summary cards |
| POST | `/api/compare` | Compare papers by method/dataset/metrics/limitations |
| POST | `/api/check-claims` | Verify a generated answer's claims against its sources |
| POST | `/api/gaps` | Detect recurring research gaps across papers |
| POST | `/api/lit-review` | Draft a full literature review (optionally export to `.docx`) |
| GET | `/api/lit-review/download/{filename}` | Download a previously generated `.docx` |

Full interactive docs available at `/docs` once the server is running.

## Setup

1. **Create a virtual environment and install dependencies:**
   ```bash
   python -m venv venv
   source venv/bin/activate        # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Add your Anthropic API key:**
   ```bash
   cp .env.example .env
   ```
   Then open `.env` and paste in a real key from console.anthropic.com.

3. **Run the server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   Server runs at `http://127.0.0.1:8000`. Interactive docs at `/docs`.

## Example workflow

1. `POST /api/search` with `{"topic": "RAG evaluation methods"}` — get back paper IDs
2. `POST /api/ask` with a question — get a cited answer
3. `POST /api/check-claims` with that answer + the paper IDs it cited — verify grounding
4. `POST /api/compare` with 2-3 paper IDs — see how they differ
5. `POST /api/gaps` with the same IDs — find recurring open problems
6. `POST /api/lit-review` with `{"topic": ..., "paper_ids": [...], "export_docx": true}` — get the final drafted review + downloadable Word doc

## Running the evaluation harness

```bash
python -m app.evaluation.evaluate
```

Runs the full pipeline against sample QA pairs and reports decision
accuracy and average grounding score. Swap in real PubMedQA rows or your
own questions by editing `app/evaluation/eval_dataset.sample.json`.

## Design notes

- **Embeddings** run locally via `sentence-transformers` (`all-MiniLM-L6-v2`) — no external embedding API needed.
- **Vector store** is Chroma in local persistent mode (`chroma_data/`) — fine for solo dev/demo use.
- **Claim checking** re-verifies claims independently rather than trusting that a citation next to a claim means it's actually supported — this is the main hallucination-reduction mechanism.
- **Lit review generation** reuses already-summarized/compared/gap-checked structured data rather than re-deriving everything from raw abstracts, so the final review is grounded in output that's already been checked.

## Known gaps / possible next steps

- Semantic Scholar and PubMedQA aren't wired in as retrieval sources yet — only arXiv. Both can be added as siblings to `arxiv_client.py` (same paper shape).
- No ranking by recency/citation count — papers are returned in arXiv's relevance order.
- No frontend UI — everything is tested via `/docs` or curl.
- No deployment config — currently local-dev only.
- `.docx` export exists; PDF export was scoped but not built.
