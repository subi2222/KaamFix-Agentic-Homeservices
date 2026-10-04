import re
from pathlib import Path

from .config import get_settings

INDEX_DIR = get_settings().data_dir / "faiss"

KNOWLEDGE = [
    {"id": "safe-hiring", "title": "Safe hiring", "text": "Choose verified professionals, compare ratings and written price offers, keep communication in KaamFix, and never share an OTP or wallet PIN."},
    {"id": "pricing", "title": "Price negotiation", "text": "Compare the proposed price, arrival estimate, included materials, service scope, and warranty before accepting a worker bid."},
    {"id": "electrical", "title": "Electrical safety", "text": "For sparks, burning smells, exposed wires, or repeated breaker trips, switch off the relevant circuit and avoid touching wet electrical equipment."},
    {"id": "plumbing", "title": "Plumbing safety", "text": "For an active leak, close the nearest isolation valve or main water supply and keep electricity away from standing water."},
    {"id": "gas", "title": "Gas emergency", "text": "If gas is suspected, do not operate electrical switches, extinguish flames, ventilate if safe, leave the property, and contact emergency services."},
    {"id": "payments", "title": "Payment verification", "text": "Manual transfers require a sender name, reference, and screenshot. Workers and admins can review evidence, but only an admin should mark a transfer verified."},
    {"id": "disputes", "title": "Dispute process", "text": "Document the work with photos, written scope, price offer, messages, and payment proof before opening a dispute."},
]


def retrieve(query: str, limit: int = 4) -> tuple[list[dict], bool]:
    if (INDEX_DIR / "index.faiss").exists():
        try:
            from langchain_community.vectorstores import FAISS
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            settings = get_settings()
            embeddings = GoogleGenerativeAIEmbeddings(model=settings.gemini_embedding_model, google_api_key=settings.gemini_api_key)
            store = FAISS.load_local(str(INDEX_DIR), embeddings, allow_dangerous_deserialization=True)
            matches = store.similarity_search_with_relevance_scores(query, k=limit)
            docs = [(doc, score) for doc, score in matches if score >= 0.35]
            return ([{"id": doc.metadata.get("source_id", doc.metadata.get("source", "approved-document")),
                     "title": doc.metadata.get("title", Path(doc.metadata.get("source", "Approved document")).name),
                     "text": doc.page_content, "page": doc.metadata.get("page"), "section": doc.metadata.get("section"),
                     "equipment": doc.metadata.get("equipment"), "model": doc.metadata.get("model"),
                     "version": doc.metadata.get("version"), "source": doc.metadata.get("source"),
                     "score": round(float(score), 3)} for doc, score in docs], bool(docs))
        except Exception:
            # The built-in safety references keep ordinary booking available if RAG is offline.
            pass
    tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    scored = []
    for document in KNOWLEDGE:
        document_tokens = set(re.findall(r"[a-z0-9]+", (document["title"] + " " + document["text"]).lower()))
        score = len(tokens & document_tokens) / max(1, len(tokens))
        scored.append((score, document))
    ranked = [document for score, document in sorted(scored, key=lambda item: item[0], reverse=True) if score > 0]
    return (ranked or KNOWLEDGE[:2])[:limit], False


def grounded_guidance(query: str) -> dict:
    sources, approved_evidence = retrieve(query)
    citations = [{key: source.get(key) for key in ("id", "title", "source", "page", "section", "equipment", "model", "version", "score") if source.get(key) is not None} for source in sources]
    return {"answer": " ".join(source["text"] for source in sources), "sources": citations,
            "chunks": sources, "approvedEvidence": approved_evidence,
            "evidenceSufficiency": "sufficient" if approved_evidence else "limited"}
