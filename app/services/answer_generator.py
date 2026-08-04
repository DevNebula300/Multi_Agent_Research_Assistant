"""
Generates a citation-backed answer to a user's question, grounded strictly
in the retrieved paper abstracts. This is the seed of the Week 3 "claim
checker" idea: by forcing the model to cite paper IDs inline, unsupported
claims become easy to spot later.
"""

from app.services.llm import complete

SYSTEM_PROMPT = """You are a research assistant. You will be given a user \
question and a set of retrieved paper abstracts, each with an ID.

Rules:
- Answer ONLY using information present in the provided abstracts.
- After every claim, cite the paper ID(s) it came from, like [2301.12345].
- If the abstracts don't contain enough information to answer, say so \
explicitly instead of guessing.
- Be concise and structured (use bullet points where useful).
"""


def generate_answer(question: str, retrieved_papers: list[dict]) -> str:
    context_blocks = []
    for p in retrieved_papers:
        context_blocks.append(
            f"[{p['id']}] {p['title']}\nAbstract: {p['abstract']}"
        )
    context = "\n\n".join(context_blocks)

    user_message = f"Question: {question}\n\nRetrieved abstracts:\n\n{context}"

    return complete(SYSTEM_PROMPT, user_message, max_tokens=1000)
