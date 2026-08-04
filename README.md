# Multi-Agent Research Assistant (ScholarAI)

A RAG (Retrieval-Augmented Generation) system that turns a research topic
into a source-grounded literature review — with paper retrieval,
structured summaries, comparison tables, claim verification, research gap
detection, and a full drafted lit review with citations.

Originally built as a backend pipeline, this project now features a
premium, dark-mode React/Vite frontend workspace for a seamless,
interactive research experience.

## What it does

- **Interactive Workspace** — a sleek, persistent frontend dashboard to manage papers, select workspace items, and read generated reports
- **Search** — enter a topic, retrieve real papers from arXiv
- **Ask** — ask a question, get an answer with inline citations back to specific papers
- **Summarize** — turn any paper into a structured card (problem, method, dataset, metrics, findings, limitations)
- **Compare** — compare multiple papers side by side in a structured matrix, plus a written analysis of how they differ
- **Check Claims** — independently re-verify a generated answer's claims against the actual source text, catching unsupported statements
- **Find Gaps** — detect recurring limitations/open problems across a set of papers
- **Draft a Lit Review** — generate a full structured literature review section, with an optional `.docx` export

## Project structure

```
app/
├── main.py                      FastAPI app entry point
├── routers/
│   └── papers.py                All API endpoints (see below)
├── services/
│   ├── arxiv_client.py          Searches arXiv, parses paper metadata
│   ├── vector_store.py          Embeds abstracts, stores/retrieves via Chroma
│   ├── answer_generator.py      Citation-backed Q&A
│   ├── summarizer.py            Structured paper cards
│   ├── comparator.py            Comparison matrix + narrative
│   ├── claim_checker.py         Verifies claims against sources
│   ├── gap_detector.py          Finds recurring research gaps
│   ├── lit_review.py            Drafts the full literature review
│   └── exporter.py              Exports the review to .docx
└── evaluation/
    ├── evaluate.py               Runs the pipeline against test questions, scores grounding/accuracy
    └── eval_dataset.sample.json  Sample QA pairs (PubMedQA-style shape)

frontend/
├── src/                         React/Vite source code (pages, components, UI)
├── package.json                 Frontend dependencies
└── tailwind.config.js           Dark-mode styling and UI configuration
```

## Setup & Installation

To run the full application, start both the backend API and the frontend
interface, each in its own terminal window.

### 1. Backend setup (FastAPI)

Create a virtual environment and install the Python dependencies
(Python 3.10+ required; on this machine `python3.12` works well):

```bash
python3.12 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Add your Gemini API key:

```bash
cp .env.example .env
```

Open `.env` and paste in a real key from [Google AI Studio](https://aistudio.google.com/apikey).

Run the backend server (Python 3.10+ recommended):

```bash
uvicorn app.main:app --reload
```

The API runs at `http://127.0.0.1:8000`. Interactive API docs at `/docs`.

### 2. Frontend setup (React/Vite)

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
npm run dev
```

The web application launches at `http://localhost:5173`.

## API endpoints reference

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

## Running the evaluation harness

```bash
python -m app.evaluation.evaluate
```

Runs the full pipeline against sample QA pairs and reports decision
accuracy and average grounding score. Swap in real PubMedQA rows or your
own questions by editing `app/evaluation/eval_dataset.sample.json`.

## Design notes

- **Local embeddings** — embeddings run locally via `sentence-transformers` (`all-MiniLM-L6-v2`) — no external embedding API needed
- **Vector database** — the vector store is Chroma in local persistent mode (`chroma_data/`) — optimized for solo dev/demo use
- **Anti-hallucination** — claim checking re-verifies claims independently rather than trusting that a citation next to a claim means it's actually supported
- **Grounded generation** — lit review generation reuses already-summarized/compared/gap-checked structured data rather than re-deriving everything from raw abstracts, ensuring the final review is grounded in output that's already been verified
- **State persistence** — the frontend uses `localStorage` to keep active tabs, workspace selections, and generated results intact across browser reloads

## Known gaps / next steps

- Semantic Scholar and PubMedQA aren't wired in as retrieval sources yet — only arXiv. Both can be added as siblings to `arxiv_client.py` (using the same paper shape).
- No ranking by recency/citation count — papers are currently returned in arXiv's relevance order.
- No deployment config — currently scoped for local development only.
- `.docx` export exists; PDF export was scoped but not yet built.
