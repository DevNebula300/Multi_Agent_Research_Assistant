import os
from typing import Annotated, Callable, TypeVar

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.deps import parse_llm_credentials
from app.services.llm import LlmCredentials, applied_credentials
from app.services.arxiv_client import search_arxiv
from app.services.vector_store import upsert_papers, query_papers, get_papers_by_ids
from app.services.answer_generator import generate_answer
from app.services.summarizer import summarize_papers
from app.services.comparator import compare_papers
from app.services.claim_checker import check_claims
from app.services.gap_detector import detect_research_gaps
from app.services.lit_review import generate_lit_review
from app.services.exporter import export_lit_review_to_docx, EXPORT_DIR

router = APIRouter()

RequireLlm = Annotated[LlmCredentials, Depends(parse_llm_credentials)]

T = TypeVar("T")


def _run_with_llm(creds: LlmCredentials, fn: Callable[[], T]) -> T:
    """Bind credentials on this worker thread and map LLM failures to HTTP errors."""
    try:
        with applied_credentials(creds):
            return fn()
    except RuntimeError as exc:
        message = str(exc)
        lower = message.lower()
        if any(
            token in lower
            for token in (
                "api key",
                "no llm api key",
                "unauthenticated",
                "invalid authentication",
                "incorrect api key",
                "authentication",
                "401",
                "403",
            )
        ):
            raise HTTPException(status_code=401, detail=message) from exc
        raise HTTPException(status_code=502, detail=message) from exc


class SearchRequest(BaseModel):
    topic: str
    max_results: int = 10


class AskRequest(BaseModel):
    question: str
    top_k: int = 5


class SummarizeRequest(BaseModel):
    paper_ids: list[str]


class CompareRequest(BaseModel):
    paper_ids: list[str]


class CheckClaimsRequest(BaseModel):
    answer_text: str
    paper_ids: list[str]


class GapsRequest(BaseModel):
    paper_ids: list[str]


class LitReviewRequest(BaseModel):
    topic: str
    paper_ids: list[str]
    export_docx: bool = False


@router.post("/search")
def search(req: SearchRequest):
    """
    Step 1: retrieve papers from arXiv for a topic and index them into
    the local vector store so they can be queried later.
    """
    papers = search_arxiv(req.topic, max_results=req.max_results)
    paper_dicts = [p.to_dict() for p in papers]
    upsert_papers(paper_dicts)

    return {
        "topic": req.topic,
        "papers_found": len(paper_dicts),
        "papers": paper_dicts,
    }


@router.post("/ask")
def ask(req: AskRequest, creds: RequireLlm):
    """
    Step 2: answer a question against whatever has been indexed so far,
    with inline citations back to arXiv paper IDs.
    """
    def _work():
        hits = query_papers(req.question, top_k=req.top_k)
        answer = generate_answer(req.question, hits)
        return {
            "question": req.question,
            "answer": answer,
            "sources": hits,
        }

    return _run_with_llm(creds, _work)


@router.post("/summarize")
def summarize(req: SummarizeRequest, creds: RequireLlm):
    """
    Week 2: turn already-indexed papers into structured summary cards
    (problem, method, dataset, metrics, findings, limitations).
    """
    def _work():
        papers = get_papers_by_ids(req.paper_ids)
        cards = summarize_papers(papers)
        return {
            "requested_ids": req.paper_ids,
            "cards": cards,
        }

    return _run_with_llm(creds, _work)


@router.post("/compare")
def compare(req: CompareRequest, creds: RequireLlm):
    """
    Week 2: compare multiple already-indexed papers by method, dataset,
    metrics, and limitations — table plus a short narrative analysis.
    """
    def _work():
        papers = get_papers_by_ids(req.paper_ids)
        cards = summarize_papers(papers)
        comparison = compare_papers(cards)
        return {
            "requested_ids": req.paper_ids,
            "cards": cards,
            "comparison": comparison,
        }

    return _run_with_llm(creds, _work)


@router.post("/check-claims")
def check_claims_endpoint(req: CheckClaimsRequest, creds: RequireLlm):
    """
    Week 3: independently verify each claim in a generated answer against
    the actual abstracts of the papers it cited. Returns a per-claim
    verdict plus an overall grounding score — the "evidence quality
    dashboard" piece from the proposal.
    """
    def _work():
        papers = get_papers_by_ids(req.paper_ids)
        report = check_claims(req.answer_text, papers)
        return {
            "answer_text": req.answer_text,
            **report,
        }

    return _run_with_llm(creds, _work)


@router.post("/gaps")
def gaps(req: GapsRequest, creds: RequireLlm):
    """
    Week 3: summarize each paper, then look across their limitations to
    find recurring, unresolved themes in the field.
    """
    def _work():
        papers = get_papers_by_ids(req.paper_ids)
        cards = summarize_papers(papers)
        gap_report = detect_research_gaps(cards)
        return {
            "requested_ids": req.paper_ids,
            "cards": cards,
            **gap_report,
        }

    return _run_with_llm(creds, _work)


@router.post("/lit-review")
def lit_review(req: LitReviewRequest, creds: RequireLlm):
    """
    Week 4: the final synthesis step. Summarizes papers, compares them,
    detects research gaps, then drafts a full literature review section
    grounded in that already-verified structured output.

    Set export_docx=true to also save a downloadable .docx file — the
    filename returned can be fetched via GET /api/lit-review/download/{filename}.
    """
    def _work():
        papers = get_papers_by_ids(req.paper_ids)
        cards = summarize_papers(papers)
        comparison = compare_papers(cards)
        gaps = detect_research_gaps(cards)
        review_text = generate_lit_review(req.topic, cards, comparison, gaps)

        result = {
            "topic": req.topic,
            "cards": cards,
            "comparison": comparison,
            "gaps": gaps,
            "lit_review_markdown": review_text,
        }

        if req.export_docx:
            filepath = export_lit_review_to_docx(req.topic, review_text)
            result["docx_filename"] = os.path.basename(filepath)

        return result

    return _run_with_llm(creds, _work)


@router.get("/lit-review/download/{filename}")
def download_lit_review(filename: str):
    """Download a previously generated lit review .docx file by filename."""
    filepath = os.path.join(EXPORT_DIR, filename)
    return FileResponse(
        filepath,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=filename,
    )
