from fastapi import APIRouter
from pydantic import BaseModel

from app.services.arxiv_client import search_arxiv
from app.services.vector_store import upsert_papers, query_papers, get_papers_by_ids
from app.services.answer_generator import generate_answer
from app.services.summarizer import summarize_papers
from app.services.comparator import compare_papers

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
