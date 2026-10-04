"""Build the approved-document FAISS index: python -m backend.scripts.ingest_docs DOCS_DIR."""
import hashlib
import json
import sys
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.app.config import get_settings

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path("data/approved-docs").resolve()
files = sorted([*root.rglob("*.pdf"), *root.rglob("*.txt"), *root.rglob("*.md")])
if not files:
    raise SystemExit(f"No approved PDF, TXT, or MD documents found in {root}")
documents = []
manifest = {"embedding_model": get_settings().gemini_embedding_model, "documents": {}}
for path in files:
    source_id = hashlib.sha256(path.read_bytes()).hexdigest()[:16]
    relative_source = path.relative_to(root).as_posix()
    sidecar = path.with_suffix(path.suffix + ".json")
    supplied = json.loads(sidecar.read_text(encoding="utf-8")) if sidecar.exists() else {}
    metadata = {"source": relative_source, "title": supplied.get("title", path.stem), "source_id": source_id,
                "equipment": supplied.get("equipment"), "model": supplied.get("model"),
                "version": supplied.get("version"), "section": supplied.get("section")}
    manifest["documents"][source_id] = {**metadata, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}
    loader = PyPDFLoader(str(path)) if path.suffix.lower() == ".pdf" else TextLoader(str(path), encoding="utf-8")
    for document in loader.load():
        document.metadata.update({key: value for key, value in metadata.items() if value is not None})
        documents.append(document)
chunks = RecursiveCharacterTextSplitter(chunk_size=900, chunk_overlap=120).split_documents(documents)
settings = get_settings()
embeddings = GoogleGenerativeAIEmbeddings(model=settings.gemini_embedding_model, google_api_key=settings.gemini_api_key)
store = FAISS.from_documents(chunks, embeddings)
target = Path("data/faiss"); target.mkdir(parents=True, exist_ok=True); store.save_local(str(target))
(target / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(f"Indexed {len(chunks)} chunks from {len(files)} approved documents into {target}")
