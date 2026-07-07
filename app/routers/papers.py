from fastapi import APIRouter
from pydantic import BaseModel

from app.services.arxiv_client import search_arxiv
from app.services.vector_store import upsert_papers, query_papers, get_papers_by_ids
from app.services.answer_generator import generate_answer
from app.services.summarizer import summarize_papers
from app.services.comparator import compare_papers
from app.services.claim_checker import check_claims
from app.services.gap_detector import detect_research_gaps

router = APIRouter()


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
def ask(req: AskRequest):
    """
    Step 2: answer a question against whatever has been indexed so far,
    with inline citations back to arXiv paper IDs.
    """
    hits = query_papers(req.question, top_k=req.top_k)
    answer = generate_answer(req.question, hits)

    return {
        "question": req.question,
        "answer": answer,
        "sources": hits,
    }


@router.post("/summarize")
def summarize(req: SummarizeRequest):
    """
    Week 2: turn already-indexed papers into structured summary cards
    (problem, method, dataset, metrics, findings, limitations).
    """
    papers = get_papers_by_ids(req.paper_ids)
    cards = summarize_papers(papers)

    return {
        "requested_ids": req.paper_ids,
        "cards": cards,
    }


@router.post("/compare")
def compare(req: CompareRequest):
    """
    Week 2: compare multiple already-indexed papers by method, dataset,
    metrics, and limitations — table plus a short narrative analysis.
    """
    papers = get_papers_by_ids(req.paper_ids)
    cards = summarize_papers(papers)
    comparison = compare_papers(cards)

    return {
        "requested_ids": req.paper_ids,
        "cards": cards,
        "comparison": comparison,
    }


@router.post("/check-claims")
def check_claims_endpoint(req: CheckClaimsRequest):
    """
    Week 3: independently verify each claim in a generated answer against
    the actual abstracts of the papers it cited. Returns a per-claim
    verdict plus an overall grounding score — the "evidence quality
    dashboard" piece from the proposal.
    """
    papers = get_papers_by_ids(req.paper_ids)
    report = check_claims(req.answer_text, papers)

    return {
        "answer_text": req.answer_text,
        **report,
    }


@router.post("/gaps")
def gaps(req: GapsRequest):
    """
    Week 3: summarize each paper, then look across their limitations to
    find recurring, unresolved themes in the field.
    """
    papers = get_papers_by_ids(req.paper_ids)
    cards = summarize_papers(papers)
    gap_report = detect_research_gaps(cards)

    return {
        "requested_ids": req.paper_ids,
        "cards": cards,
        **gap_report,
    }
