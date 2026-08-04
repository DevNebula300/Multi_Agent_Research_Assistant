"""
Evaluation harness (Week 3): runs the full retrieve -> answer -> claim-check
pipeline against a set of known question/expected-decision pairs, and
reports both decision accuracy and grounding quality.

This is deliberately dataset-agnostic: `eval_dataset.sample.json` ships
with 2 illustrative examples in a PubMedQA-like yes/no/maybe shape, but
you can swap in real PubMedQA rows (question, final_decision) or fully
custom QA pairs without changing this script — it only expects
{"question": ..., "expected_decision": "yes"|"no"|"maybe", "topic_for_retrieval": ...}.

Run directly with:
    python -m app.evaluation.evaluate
"""
from dotenv import load_dotenv
load_dotenv()

import time
import os
import sys
import json

# Allow running this file directly (`python -m app.evaluation.evaluate`)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.services.arxiv_client import search_arxiv
from app.services.vector_store import upsert_papers, query_papers
from app.services.answer_generator import generate_answer
from app.services.claim_checker import check_claims
from app.services.llm import complete

JUDGE_SYSTEM_PROMPT = """You classify a research assistant's answer into \
exactly one word: yes, no, or maybe/unclear — based on what stance the \
answer takes on the question. Respond with ONLY that one word, nothing else.
"""


def _judge_decision(question: str, answer: str) -> str:
    """Ask the model to classify the generated answer's implied yes/no/maybe stance."""
    text = complete(
        JUDGE_SYSTEM_PROMPT,
        f"Question: {question}\n\nAnswer: {answer}",
        max_tokens=10,
    )
    return text.strip().lower()


def evaluate_dataset(dataset_path: str) -> dict:
    with open(dataset_path) as f:
        dataset = json.load(f)

    results = []

    for item in dataset["items"]:
        # 1. Retrieve papers relevant to this question
        papers = search_arxiv(item["topic_for_retrieval"], max_results=8)
        time.sleep(3)

        paper_dicts = [p.to_dict() for p in papers]
        upsert_papers(paper_dicts)

        # 2. Retrieve + generate a cited answer
        hits = query_papers(item["question"], top_k=5)
        answer = generate_answer(item["question"], hits)

        # 3. Claim-check the generated answer against its cited sources
        claim_report = check_claims(answer, hits)

        # 4. Judge whether the answer's stance matches the expected decision
        predicted_decision = _judge_decision(item["question"], answer)
        expected = item["expected_decision"].lower()
        decision_correct = expected in predicted_decision

        results.append(
            {
                "id": item["id"],
                "question": item["question"],
                "expected_decision": expected,
                "predicted_decision": predicted_decision,
                "decision_correct": decision_correct,
                "grounding_score": claim_report["grounding_score"],
                "verdict_counts": claim_report["verdict_counts"],
            }
        )

    accuracy = sum(r["decision_correct"] for r in results) / len(results)
    avg_grounding = sum(r["grounding_score"] for r in results) / len(results)

    return {
        "results": results,
        "decision_accuracy": round(accuracy, 2),
        "average_grounding_score": round(avg_grounding, 2),
    }


if __name__ == "__main__":
    default_path = os.path.join(os.path.dirname(__file__), "eval_dataset.sample.json")
    path = sys.argv[1] if len(sys.argv) > 1 else default_path

    print(f"Running evaluation on: {path}\n")
    report = evaluate_dataset(path)

    for r in report["results"]:
        status = "PASS" if r["decision_correct"] else "FAIL"
        print(f"[{status}] {r['id']}: expected={r['expected_decision']} "
              f"predicted={r['predicted_decision']} grounding={r['grounding_score']}")

    print(f"\nDecision accuracy: {report['decision_accuracy']}")
    print(f"Average grounding score: {report['average_grounding_score']}")
