"""
Local vector store for paper abstracts, using Chroma + a small local
sentence-transformers model (no external embedding API needed for Week 1).
"""

import os
import chromadb
from chromadb.utils import embedding_functions

CHROMA_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_data")
COLLECTION_NAME = "papers"

_embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

_client = chromadb.PersistentClient(path=CHROMA_PATH)
_collection = _client.get_or_create_collection(
    name=COLLECTION_NAME,
    embedding_function=_embedding_fn,
)


def upsert_papers(papers: list[dict]):
    """Embed each paper's abstract and store/update it in the vector DB."""
    if not papers:
        return

    ids = [p["id"] for p in papers]
    documents = [p["abstract"] for p in papers]
    metadatas = [
        {
            "title": p["title"],
            "authors": ", ".join(p["authors"]),
            "pdf_url": p["pdf_url"],
            "published": p["published"],
            "source": p.get("source", "arxiv"),
        }
        for p in papers
    ]

    _collection.upsert(ids=ids, documents=documents, metadatas=metadatas)


def query_papers(question: str, top_k: int = 5) -> list[dict]:
    """Return the top_k most relevant stored papers for a natural-language question."""
    results = _collection.query(query_texts=[question], n_results=top_k)

    hits = []
    for i in range(len(results["ids"][0])):
        hits.append(
            {
                "id": results["ids"][0][i],
                "abstract": results["documents"][0][i],
                "distance": results["distances"][0][i],
                **results["metadatas"][0][i],
            }
        )
    return hits
