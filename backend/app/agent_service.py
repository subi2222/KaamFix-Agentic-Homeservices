"""Small, role-specific agent layer around the existing booking service.

The graph stores workflow state; Firestore requests remain the booking source of truth.
"""
from __future__ import annotations

import base64
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Literal, TypedDict
from uuid import uuid4

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from pydantic import BaseModel, Field

from .firebase import get_db
from .config import get_settings
from .models import now_utc
from .nexa_rag import grounded_guidance


HAZARDS = {
    "smoke": "smoke_or_burning",
    "burning smell": "smoke_or_burning",
    "spark": "electrical_sparks",
    "live wire": "exposed_live_wires",
    "exposed wire": "exposed_live_wires",
    "gas leak": "suspected_gas_leak",
    "smell gas": "suspected_gas_leak",
    "flood": "active_flooding",
}
CATEGORIES = {
    "Electrician": ("socket", "wire", "electric", "breaker", "spark", "light"),
    "Plumber": ("leak", "pipe", "tap", "sink", "drain", "water"),
    "AC Technician": ("ac ", "air conditioner", "cooling", "compressor"),
    "Appliance Repair": ("fridge", "washer", "oven", "appliance"),
    "Carpenter": ("door", "wood", "cabinet", "furniture"),
    "CCTV Installer": ("camera", "cctv"),
    "Solar Technician": ("solar", "inverter", "panel"),
}


class AgentState(TypedDict, total=False):
    workflow_id: str
    issue_id: str
    customer_id: str
    input_text: str
    selected_category: str | None
    image_count: int
    visible_observations: list[str]
    triage_result: dict[str, Any]
    safety_assessment: dict[str, Any]
    human_review_status: str
    customer_confirmation: bool
    current_stage: str
    escalation_id: str
    clarification_status: str


class TriageOutput(BaseModel):
    suggested_category: str
    category_confidence: float = Field(ge=0, le=1)
    issue_summary: str
    reported_symptoms: list[str]
    visible_observations: list[str]
    possible_causes: list[str]
    clarification_questions: list[str]
    hazard_flags: list[str]
    urgency: Literal["low", "medium", "high", "emergency"]
    required_worker_skills: list[str]


class DiagnosticOutput(BaseModel):
    diagnostic_questions: list[str]
    suggested_checks: list[str]
    tools_or_parts_to_consider: list[str]
    safety_warnings: list[str]
    stop_conditions: list[str]


class VisionOutput(BaseModel):
    visible_observations: list[str]


def structured_model(schema: type[BaseModel]):
    """Prefer Groq for reasoning; fall back to Gemini without exposing either key."""
    settings = get_settings()
    if settings.groq_api_key:
        from langchain_groq import ChatGroq
        model = ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key,
                         temperature=0, timeout=20, max_retries=1)
        return model.with_structured_output(schema, method="json_schema")
    if settings.gemini_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI
        model = ChatGoogleGenerativeAI(model=settings.gemini_model, google_api_key=settings.gemini_api_key,
                                        temperature=0, timeout=20, max_retries=1)
        return model.with_structured_output(schema)
    return None


def _category(text: str, selected: str | None) -> tuple[str, float]:
    if selected:
        return selected, 1.0
    lowered = f" {text.lower()} "
    ranked = [(sum(term in lowered for term in terms), category) for category, terms in CATEGORIES.items()]
    score, category = max(ranked)
    return (category if score else "General Maintenance"), (min(0.95, 0.55 + score * 0.12) if score else 0.35)


def validate_images(images: list[str]) -> None:
    for image in images:
        match = re.fullmatch(r"data:image/(jpeg|png|webp);base64,(.+)", image, re.DOTALL)
        if not match:
            raise ValueError("Photos must be JPEG, PNG, or WebP")
        if len(base64.b64decode(match.group(2), validate=True)) > 5 * 1024 * 1024:
            raise ValueError("Each photo must be smaller than 5 MB")


def generate_triage(text: str, selected: str | None, visible: list[str]) -> dict:
    settings = get_settings()
    if settings.groq_api_key or settings.gemini_api_key:
        try:
            structured = structured_model(TriageOutput)
            if structured is None:
                raise RuntimeError("No text model configured")
            output = structured.invoke(
                "You are KaamFix's customer triage agent. Separate customer-reported symptoms from strictly visible observations. "
                "Possible causes are hypotheses only. Ask at most 3 useful questions. Flag smoke, sparks, exposed live wires, gas, flooding, structural danger, or unsafe equipment. "
                "Never claim an image proves safety and never give hazardous repair instructions. Select a practical home-service trade.\n"
                f"Customer-selected category (authoritative when supplied): {selected or 'none'}\nDescription: {text}\nVerified visual observations: {json.dumps(visible)}"
            )
            result = output.model_dump()
            if selected:
                result.update({"suggested_category": selected, "category_confidence": 1.0})
            result["visible_observations"] = visible
            return result
        except Exception:
            pass
    category, confidence = _category(text, selected)
    hazards = sorted({flag for phrase, flag in HAZARDS.items() if phrase in text.lower()})
    questions = [] if len(text.split()) >= 8 else ["When did the problem start, and is it getting worse?"]
    return {"suggested_category": category, "category_confidence": confidence, "issue_summary": text[:240],
        "reported_symptoms": [text], "visible_observations": visible,
        "possible_causes": ["The reported symptoms require an on-site inspection before a cause can be confirmed."],
        "clarification_questions": questions, "hazard_flags": hazards, "urgency": "high" if hazards else "medium",
        "required_worker_skills": [category]}


def triage_node(state: AgentState) -> dict:
    text = state["input_text"].strip()
    result = generate_triage(text, state.get("selected_category"), state.get("visible_observations", []))
    result.update({"issue_id": state["issue_id"], "customer_confirmation_required": True})
    needs_answers = bool(result.get("clarification_questions")) and state.get("clarification_status") != "answered"
    return {"triage_result": result, "current_stage": "awaiting_clarification" if needs_answers else "safety_review"}


def route_after_triage(state: AgentState) -> str:
    return "clarify_issue" if state.get("current_stage") == "awaiting_clarification" else "safety"


def clarification_node(state: AgentState) -> Command:
    decision = interrupt({"kind": "customer_clarification", "questions": state["triage_result"].get("clarification_questions", [])})
    answers = decision.get("answers") or {}
    additions = " ".join(f"{question}: {answer}" for question, answer in answers.items() if str(answer).strip())
    return Command(update={"input_text": f"{state['input_text']}\nFollow-up: {additions}",
        "selected_category": decision.get("corrected_category") or state.get("selected_category"),
        "clarification_status": "answered", "current_stage": "triage"}, goto="triage")


def safety_node(state: AgentState) -> dict:
    flags = state["triage_result"]["hazard_flags"]
    critical_flags = {"smoke_or_burning", "electrical_sparks", "exposed_live_wires", "suspected_gas_leak", "structural_danger"}
    requires_review = bool(critical_flags.intersection(flags))
    # A reported water spray that the customer has already isolated is urgent work,
    # but it is not an admin-blocking emergency by itself.
    lowered = state.get("input_text", "").lower()
    water_isolated = bool(re.search(r"(shut.?off|isolate)[^\n:.?]{0,100}[?:]+\s*yes", lowered))
    if "active_flooding" in flags and not water_isolated:
        requires_review = True
    safety = {
        "hazard_flags": flags, "requires_admin_review": requires_review,
        "guidance": "Move away from the hazard and contact local emergency assistance when there is immediate danger." if requires_review else "Keep the water isolated and avoid attempting repairs beyond your training.",
    }
    if not requires_review:
        visible_result = {**state["triage_result"], "hazard_flags": []}
        return {"safety_assessment": safety, "triage_result": visible_result,
                "current_stage": "awaiting_customer_confirmation"}
    escalation_id = f"esc_{state['issue_id']}"
    get_db().collection("agent_escalations").document(escalation_id).set({
        "escalationId": escalation_id, "workflowId": state["workflow_id"], "issueId": state["issue_id"],
        "customerId": state["customer_id"], "severity": "high", "escalationReason": "Potential safety hazard",
        "supportingEvidence": flags, "recommendedNextAction": "Admin review before dispatch",
        "workflowPaused": True, "humanReviewRequired": True, "status": "open", "createdAt": now_utc(),
    })
    return {"safety_assessment": safety, "escalation_id": escalation_id, "current_stage": "awaiting_admin_review"}


def route_safety(state: AgentState) -> str:
    return "admin_review" if state["safety_assessment"]["requires_admin_review"] else "confirm_customer"


def admin_review_node(state: AgentState) -> Command:
    decision = interrupt({"kind": "admin_review", "escalation_id": state["escalation_id"]})
    approved = decision.get("action") in {"approve", "require_specialist", "resolve"}
    return Command(
        update={"human_review_status": decision.get("action", "rejected"), "current_stage": "awaiting_customer_confirmation" if approved else "stopped"},
        goto="confirm_customer" if approved else END,
    )


def customer_confirmation_node(state: AgentState) -> Command:
    decision = interrupt({"kind": "customer_confirmation", "issue": state["triage_result"]})
    confirmed = bool(decision.get("confirmed"))
    return Command(update={"customer_confirmation": confirmed, "current_stage": "ready_for_booking" if confirmed else "cancelled"}, goto=END)


builder = StateGraph(AgentState)
builder.add_node("triage", triage_node)
builder.add_node("clarify_issue", clarification_node)
builder.add_node("safety", safety_node)
builder.add_node("admin_review", admin_review_node)
builder.add_node("confirm_customer", customer_confirmation_node)
builder.add_edge(START, "triage")
builder.add_conditional_edges("triage", route_after_triage)
builder.add_conditional_edges("safety", route_safety)

checkpoint_path = get_settings().data_dir / "agent-checkpoints.sqlite"
checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
_connection = sqlite3.connect(checkpoint_path, check_same_thread=False)
graph = builder.compile(checkpointer=SqliteSaver(_connection))


def public_state(state: dict) -> dict:
    return {key: value for key, value in state.items() if not key.startswith("__")}


def inspect_images(description: str, images: list[str]) -> list[str]:
    """Use Gemini vision when configured; never turn uncertainty into an observation."""
    settings = get_settings()
    if not images:
        return []
    if settings.gemini_api_key:
        try:
            from google import genai
            from google.genai import types
            parts: list[Any] = ["List only clearly visible repair-relevant observations as JSON: {\"visible_observations\":[...]}. Do not diagnose, infer safety, or invent details. Customer description: " + description]
            for image in images:
                header, encoded = image.split(",", 1)
                mime = header.removeprefix("data:").split(";", 1)[0]
                parts.append(types.Part.from_bytes(data=base64.b64decode(encoded), mime_type=mime))
            response = genai.Client(api_key=settings.gemini_api_key,
                                    http_options=types.HttpOptions(timeout=20_000)).models.generate_content(
                                        model=settings.gemini_model, contents=parts)
            parsed = json.loads((response.text or "{}").replace("```json", "").replace("```", "").strip())
            return [str(item)[:300] for item in parsed.get("visible_observations", [])[:8]]
        except Exception:
            pass
    if settings.groq_api_key:
        try:
            from langchain_groq import ChatGroq
            model = ChatGroq(model=settings.groq_model, api_key=settings.groq_api_key,
                             temperature=0, timeout=20, max_retries=1).with_structured_output(VisionOutput, method="json_schema")
            content: list[dict[str, Any]] = [{"type": "text", "text": "List only clearly visible repair-relevant observations. Do not diagnose, infer safety, or invent details. Customer description: " + description}]
            content.extend({"type": "image_url", "image_url": {"url": image}} for image in images)
            output = model.invoke([{"role": "user", "content": content}])
            return [str(item)[:300] for item in output.visible_observations[:8]]
        except Exception:
            pass
    return []


def start_triage(customer_id: str, description: str, selected_category: str | None, images: list[str]) -> dict:
    validate_images(images)
    workflow_id, issue_id = f"wf_{uuid4().hex}", f"issue_{uuid4().hex}"
    state: AgentState = {"workflow_id": workflow_id, "issue_id": issue_id, "customer_id": customer_id,
        "input_text": description, "selected_category": selected_category, "image_count": len(images),
        "visible_observations": inspect_images(description, images), "current_stage": "triage"}
    result = graph.invoke(state, {"configurable": {"thread_id": workflow_id}, "recursion_limit": 12})
    clean = public_state(result)
    get_db().collection("agent_workflows").document(workflow_id).set({**clean, "updatedAt": now_utc()})
    return clean


def resume_workflow(workflow_id: str, decision: dict) -> dict:
    result = graph.invoke(Command(resume=decision), {"configurable": {"thread_id": workflow_id}, "recursion_limit": 12})
    clean = public_state(result)
    get_db().collection("agent_workflows").document(workflow_id).set({**clean, "updatedAt": now_utc()}, merge=True)
    return clean


def diagnostic_brief(booking: dict, question: str, worker: dict, images: list[str] | None = None) -> dict:
    images = images or []
    validate_images(images)
    observations = inspect_images(f"Worker follow-up for {booking.get('description', '')}: {question}", images)
    query = f"{booking.get('serviceCategory', '')} {booking.get('description', '')} {question} {' '.join(observations)}"
    rag = grounded_guidance(query)
    qualified = worker.get("verified", False) and worker.get("status") == "approved"
    sources = rag["sources"]
    evidence_ok = bool(rag.get("approvedEvidence"))
    generated: DiagnosticOutput | None = None
    if qualified and evidence_ok:
        try:
            model = structured_model(DiagnosticOutput)
            if model:
                context = "\n\n".join(
                    f"SOURCE {index + 1} ({chunk.get('title')}, page {chunk.get('page')}):\n{chunk.get('text')}"
                    for index, chunk in enumerate(rag.get("chunks", []))
                )
                generated = model.invoke(
                    "You are KaamFix's worker technical assistant. Use only the supplied approved-document excerpts. "
                    "Provide safe diagnostic checks, not a confirmed diagnosis. Do not invent specifications, parts, citations, or page numbers. "
                    "Stop when qualifications, documentation, or safety are insufficient.\n"
                    f"JOB: {booking.get('description', booking.get('title', ''))}\nQUESTION: {question}\n"
                    f"VISIBLE OBSERVATIONS: {json.dumps(observations)}\nAPPROVED EXCERPTS:\n{context}"
                )
        except Exception:
            generated = None
    return {
        "issue_summary": booking.get("description", booking.get("title", "")),
        "relevant_documentation": sources,
        "worker_photo_observations": observations,
        "diagnostic_questions": generated.diagnostic_questions if generated else ["What changed immediately before the fault appeared?", "Does the equipment model match the cited document?"],
        "suggested_checks": generated.suggested_checks if generated else ([rag["answer"]] if qualified and evidence_ok else []),
        "tools_or_parts_to_consider": generated.tools_or_parts_to_consider if generated else [],
        "safety_warnings": generated.safety_warnings if generated else ["Stop if conditions are unsafe or outside your verified qualifications."],
        "stop_conditions": generated.stop_conditions if generated else ["Smoke, sparks, gas odor, live wiring, or insufficient qualification"],
        "citations": sources, "evidence_sufficiency": rag.get("evidenceSufficiency", "limited"),
        "escalation_required": not qualified or not evidence_ok,
    }
