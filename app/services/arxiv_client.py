"""
Thin client for the arXiv API.

arXiv doesn't require an API key. It returns an Atom XML feed, so we
parse that directly instead of pulling in a feed-parsing dependency.

Docs: https://info.arxiv.org/help/api/user-manual.html
"""

import requests
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import List

ARXIV_API_URL = "http://export.arxiv.org/api/query"

# Atom + arXiv-specific XML namespaces used in the response feed
NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}


@dataclass
class Paper:
    arxiv_id: str
    title: str
    abstract: str
    authors: List[str]
    published: str
    updated: str
    pdf_url: str
    categories: List[str] = field(default_factory=list)

    def to_dict(self):
        return {
            "id": self.arxiv_id,
            "title": self.title,
            "abstract": self.abstract,
            "authors": self.authors,
            "published": self.published,
            "updated": self.updated,
            "pdf_url": self.pdf_url,
            "categories": self.categories,
            "source": "arxiv",
        }


def _clean(text: str) -> str:
    return " ".join((text or "").split())


def search_arxiv(query: str, max_results: int = 10) -> List[Paper]:
    """
    Search arXiv by keyword/topic and return parsed Paper objects.

    Example:
        search_arxiv("retrieval augmented generation evaluation", max_results=10)
    """
    params = {
        "search_query": f"all:{query}",
        "start": 0,
        "max_results": max_results,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }

    response = requests.get(ARXIV_API_URL, params=params, timeout=15)
    response.raise_for_status()

    root = ET.fromstring(response.text)
    entries = root.findall("atom:entry", NAMESPACES)

    papers = []
    for entry in entries:
        raw_id = entry.find("atom:id", NAMESPACES).text
        # raw_id looks like http://arxiv.org/abs/2301.12345v1
        arxiv_id = raw_id.rsplit("/", 1)[-1]

        title = _clean(entry.find("atom:title", NAMESPACES).text)
        abstract = _clean(entry.find("atom:summary", NAMESPACES).text)
        published = entry.find("atom:published", NAMESPACES).text
        updated = entry.find("atom:updated", NAMESPACES).text

        authors = [
            a.find("atom:name", NAMESPACES).text
            for a in entry.findall("atom:author", NAMESPACES)
        ]

        categories = [
            c.attrib.get("term")
            for c in entry.findall("atom:category", NAMESPACES)
        ]

        pdf_url = ""
        for link in entry.findall("atom:link", NAMESPACES):
            if link.attrib.get("title") == "pdf":
                pdf_url = link.attrib.get("href")
                break

        papers.append(
            Paper(
                arxiv_id=arxiv_id,
                title=title,
                abstract=abstract,
                authors=authors,
                published=published,
                updated=updated,
                pdf_url=pdf_url,
                categories=categories,
            )
        )

    return papers
