from uuid import uuid4
from pathlib import Path
import base64
import re
from math import asin, cos, radians, sin, sqrt

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from google import genai

from .auth import current_user, require_roles
from .config import get_settings
from .firebase import get_db
from .nexa_rag import grounded_guidance
from .agent_service import diagnostic_brief, resume_workflow, start_triage
from .models import AdvisorRequest, BidCreate, BookingTransition, ClarificationRequest, DiagnosticRequest, DispatchRequest, EscalationDecision, LocationUpdate, MessageCreate, PaymentCreate, RequestCreate, RequestStatusUpdate, ReviewCreate, TriageRequest, UserUpdate, WorkerModeration, WorkerUpdate, now_utc

settings = get_settings()
PAYMENT_PROOF_DIR = settings.data_dir / "payment-proofs"
CHAT_IMAGE_DIR = settings.data_dir / "chat-images"
app = FastAPI(title=settings.app_name, version="1.0.0", docs_url="/docs", redoc_url="/redoc")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
    max_age=600,
)


def serialize(snapshot):
    data = snapshot.to_dict() or {}
    data.setdefault("id", snapshot.id)
    return data


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok", "service": settings.app_name, "environment": settings.environment}


def distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lat, d_lng = radians(lat2 - lat1), radians(lng2 - lng1)
    value = sin(d_lat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ** 2
    return 6371 * 2 * asin(sqrt(value))


def nearby_workers(category: str, latitude: float, longitude: float, radius_km: float) -> list[dict]:
    workers = []
    for item in get_db().collection("workers").where("status", "==", "approved").stream():
        worker = serialize(item)
        if worker.get("category", "").lower() != category.lower() or not worker.get("online", False):
            continue
        location = worker.get("location") or {}
        if "latitude" not in location or "longitude" not in location:
            continue
        distance = distance_km(latitude, longitude, float(location["latitude"]), float(location["longitude"]))
        if distance <= radius_km:
            worker["distanceKm"] = round(distance, 2)
            worker["matchScore"] = round(max(0, 100 - distance * 3) + min(float(worker.get("rating", 0)) * 3, 15), 1)
            workers.append(worker)
    return sorted(workers, key=lambda value: (-value["matchScore"], value["distanceKm"]))


def booking_access(request_id: str, user: dict) -> tuple[dict, dict]:
    db = get_db()
    booking = db.collection("requests").document(request_id).get().to_dict() or {}
    profile = db.collection("users").document(user["uid"]).get().to_dict() or {}
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if profile.get("role") != "admin" and user["uid"] not in {booking.get("customerId"), booking.get("workerId")}:
        raise HTTPException(status_code=403, detail="You cannot access this booking room")
    return booking, profile


def add_system_message(request_id: str, text: str):
    message_id = f"msg_{uuid4().hex}"
    get_db().collection("requests").document(request_id).collection("messages").document(message_id).set({
        "messageId": message_id, "requestId": request_id, "senderId": "system", "senderName": "KaamFix",
        "text": text, "imageFile": "", "createdAt": now_utc(), "system": True,
    })


@app.patch("/api/location", tags=["dispatch"])
def update_location(payload: LocationUpdate, user: dict = Depends(current_user)):
    db = get_db()
    profile = db.collection("users").document(user["uid"]).get().to_dict() or {}
    data = {"location": {"latitude": payload.latitude, "longitude": payload.longitude, "address": payload.address}, "online": payload.online, "locationUpdatedAt": now_utc()}
    db.collection("users").document(user["uid"]).set(data, merge=True)
    if profile.get("role") == "worker":
        db.collection("workers").document(user["uid"]).set(data, merge=True)
    return {"ok": True, **data}


@app.get("/api/radar", tags=["dispatch"])
def worker_radar(category: str, latitude: float, longitude: float, radiusKm: float = Query(default=15, ge=1, le=100), user: dict = Depends(current_user)):
    return nearby_workers(category, latitude, longitude, radiusKm)


@app.post("/api/agent/dispatch", tags=["agent"])
def agent_dispatch(payload: DispatchRequest, user: dict = Depends(require_roles("customer"))):
    matches = nearby_workers(payload.category, payload.latitude, payload.longitude, payload.radiusKm)[:10]
    rag = grounded_guidance(f"{payload.category} {payload.problem} pricing safety payment")
    return {"agent": "KaamFix NEXA", "strategy": "category + live availability + distance + rating", "matches": matches, "summary": f"NEXA found {len(matches)} online {payload.category} professional(s) within {payload.radiusKm:g} km.", "ragGuidance": rag["answer"], "ragSources": rag["sources"]}


@app.get("/api/requests/{request_id}/room", tags=["booking-room"])
def booking_room(request_id: str, user: dict = Depends(current_user)):
    booking, _ = booking_access(request_id, user)
    if booking.get("status") not in {"accepted", "en_route", "arrived", "in_progress", "work_finished", "completed", "disputed"}:
        raise HTTPException(status_code=409, detail="The booking room opens after a price offer is accepted")
    db = get_db()
    customer = db.collection("users").document(booking.get("customerId", "")).get().to_dict() or {}
    worker_profile = db.collection("users").document(booking.get("workerId", "")).get().to_dict() or {}
    worker = db.collection("workers").document(booking.get("workerId", "")).get().to_dict() or {}
    return {"booking": booking, "customer": {"uid": booking.get("customerId"), "name": customer.get("name", booking.get("customerName")), "email": customer.get("email", ""), "phone": customer.get("phone", ""), "location": booking.get("customerLocation") or customer.get("location")}, "worker": {"uid": booking.get("workerId"), "name": worker.get("name", booking.get("workerName")), "email": worker_profile.get("email", ""), "phone": worker.get("phone", ""), "location": worker.get("location"), "online": worker.get("online", False)}}


@app.get("/api/requests/{request_id}/messages", tags=["chat"])
def list_messages(request_id: str, user: dict = Depends(current_user)):
    booking_access(request_id, user)
    items = [serialize(item) for item in get_db().collection("requests").document(request_id).collection("messages").order_by("createdAt").stream()]
    return items[-100:]


@app.post("/api/requests/{request_id}/confirm-completion", tags=["booking-room"])
def confirm_completion(request_id: str, user: dict = Depends(current_user)):
    booking, profile = booking_access(request_id, user)
    if booking.get("status") != "work_finished" or booking.get("paymentStatus") != "confirmed":
        raise HTTPException(status_code=409, detail="Work must be finished and payment confirmed before completion")
    field = "workerCompletionConfirmed" if profile.get("role") == "worker" else "customerCompletionConfirmed"
    ref = get_db().collection("requests").document(request_id)
    ref.set({field: True, f"{field}At": now_utc()}, merge=True)
    updated = ref.get().to_dict() or {}
    if updated.get("workerCompletionConfirmed") and updated.get("customerCompletionConfirmed"):
        ref.set({"status": "completed", "completedAt": now_utc()}, merge=True)
        get_db().collection("workers").document(booking.get("workerId", "")).set({"availability": "available"}, merge=True)
        add_system_message(request_id, "Booking completed by both parties.")
    return serialize(ref.get())


@app.post("/api/requests/{request_id}/transition", tags=["booking-room"])
def transition_booking(request_id: str, payload: BookingTransition, user: dict = Depends(require_roles("worker"))):
    booking, _ = booking_access(request_id, user)
    if booking.get("workerId") != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the assigned professional can update this job")
    transitions = {
        "start_journey": ("accepted", "en_route", "Professional is on the way."),
        "mark_arrived": ("en_route", "arrived", "Professional has arrived."),
        "start_work": ("arrived", "in_progress", "Work has started."),
        "finish_work": ("in_progress", "work_finished", "Work is finished. Customer can now pay."),
    }
    expected, next_status, message = transitions[payload.action]
    if booking.get("status") != expected:
        raise HTTPException(status_code=409, detail=f"This action requires status: {expected.replace('_', ' ')}")
    ref = get_db().collection("requests").document(request_id)
    ref.set({"status": next_status, f"{next_status}At": now_utc()}, merge=True)
    add_system_message(request_id, message)
    return serialize(ref.get())


@app.post("/api/requests/{request_id}/messages", status_code=status.HTTP_201_CREATED, tags=["chat"])
def send_message(request_id: str, payload: MessageCreate, user: dict = Depends(current_user)):
    booking, profile = booking_access(request_id, user)
    if not payload.text.strip() and not payload.imageData:
        raise HTTPException(status_code=422, detail="Write a message or attach an image")
    message_id = f"msg_{uuid4().hex}"
    image_file = ""
    if payload.imageData:
        match = re.fullmatch(r"data:image/(jpeg|png|webp);base64,(.+)", payload.imageData, re.DOTALL)
        if not match:
            raise HTTPException(status_code=422, detail="Chat image must be JPEG, PNG, or WebP")
        try:
            raw = base64.b64decode(match.group(2), validate=True)
        except Exception as exc:
            raise HTTPException(status_code=422, detail="Invalid image data") from exc
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Chat image must be smaller than 5 MB")
        extension = "jpg" if match.group(1) == "jpeg" else match.group(1)
        CHAT_IMAGE_DIR.mkdir(parents=True, exist_ok=True)
        image_file = f"{message_id}.{extension}"
        (CHAT_IMAGE_DIR / image_file).write_bytes(raw)
    data = {"messageId": message_id, "requestId": request_id, "senderId": user["uid"], "senderName": profile.get("name", "KaamFix user"), "text": payload.text.strip(), "imageFile": image_file, "createdAt": now_utc()}
    get_db().collection("requests").document(request_id).collection("messages").document(message_id).set(data)
    return data


@app.get("/api/requests/{request_id}/messages/{message_id}/image", tags=["chat"])
def get_message_image(request_id: str, message_id: str, user: dict = Depends(current_user)):
    booking_access(request_id, user)
    message = get_db().collection("requests").document(request_id).collection("messages").document(message_id).get().to_dict() or {}
    path = (CHAT_IMAGE_DIR / message.get("imageFile", "")).resolve()
    if not message.get("imageFile") or CHAT_IMAGE_DIR.resolve() not in path.parents or not path.exists():
        raise HTTPException(status_code=404, detail="Chat image not found")
    return FileResponse(path)


@app.get("/api/users/me", tags=["users"])
def get_me(user: dict = Depends(current_user)):
    snapshot = get_db().collection("users").document(user["uid"]).get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="User profile not found")
    return serialize(snapshot)


@app.patch("/api/users/me", tags=["users"])
def update_me(payload: UserUpdate, user: dict = Depends(current_user)):
    ref = get_db().collection("users").document(user["uid"])
    ref.set(payload.model_dump(), merge=True)
    return serialize(ref.get())


@app.get("/api/users", tags=["users"])
def list_users(user: dict = Depends(require_roles("admin"))):
    return [serialize(item) for item in get_db().collection("users").stream()]


@app.get("/api/workers", tags=["workers"])
def list_workers(category: str | None = None, city: str | None = None, availability: str | None = None):
    query = get_db().collection("workers").where("status", "==", "approved")
    if category:
        query = query.where("category", "==", category)
    if city:
        query = query.where("city", "==", city)
    if availability:
        query = query.where("availability", "==", availability)
    return [serialize(item) for item in query.stream()]


@app.get("/api/workers/{worker_id}", tags=["workers"])
def get_worker(worker_id: str):
    snapshot = get_db().collection("workers").document(worker_id).get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Worker not found")
    return serialize(snapshot)


@app.patch("/api/workers/me", tags=["workers"])
def update_worker(payload: WorkerUpdate, user: dict = Depends(require_roles("worker"))):
    ref = get_db().collection("workers").document(user["uid"])
    ref.set({key: value for key, value in payload.model_dump().items() if value is not None}, merge=True)
    return serialize(ref.get())


@app.patch("/api/workers/{worker_id}/moderation", tags=["workers"])
def moderate_worker(worker_id: str, payload: WorkerModeration, user: dict = Depends(require_roles("admin"))):
    ref = get_db().collection("workers").document(worker_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Worker not found")
    ref.update(payload.model_dump())
    return serialize(ref.get())


@app.get("/api/requests", tags=["requests"])
def list_requests(user: dict = Depends(current_user)):
    db = get_db()
    profile = db.collection("users").document(user["uid"]).get().to_dict() or {}
    role = profile.get("role")
    if role == "admin":
        snapshots = db.collection("requests").stream()
    elif role == "worker":
        assigned = list(db.collection("requests").where("workerId", "==", user["uid"]).stream())
        worker = db.collection("workers").document(user["uid"]).get().to_dict() or {}
        pending = list(db.collection("requests").where("status", "==", "pending").where("serviceCategory", "==", worker.get("category", "")).stream())
        snapshots = {item.id: item for item in assigned + pending}.values()
    else:
        snapshots = db.collection("requests").where("customerId", "==", user["uid"]).stream()
    return [serialize(item) for item in snapshots]


@app.post("/api/requests", status_code=status.HTTP_201_CREATED, tags=["requests"])
def create_request(payload: RequestCreate, user: dict = Depends(require_roles("customer"))):
    db = get_db()
    profile = db.collection("users").document(user["uid"]).get().to_dict() or {}
    if payload.workflowId:
        workflow = db.collection("agent_workflows").document(payload.workflowId).get().to_dict() or {}
        if workflow.get("customer_id") != user["uid"] or workflow.get("current_stage") != "ready_for_booking":
            raise HTTPException(status_code=409, detail="The AI issue must be confirmed before booking")
        existing = list(db.collection("requests").where("workflowId", "==", payload.workflowId).limit(1).stream())
        if existing:
            return serialize(existing[0])
    request_id = f"req_{uuid4().hex}"
    data = {**payload.model_dump(), "requestId": request_id, "customerId": user["uid"], "customerName": profile.get("name", "Customer"), "status": "pending", "createdAt": now_utc()}
    db.collection("requests").document(request_id).set(data)
    return data


@app.post("/api/agents/triage", tags=["agents"])
def triage_issue(payload: TriageRequest, user: dict = Depends(require_roles("customer"))):
    try:
        result = start_triage(user["uid"], payload.description, payload.selected_category, payload.images)
        return {key: value for key, value in result.items() if not key.startswith("__")}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/agents/status", tags=["agents"])
def agent_status(user: dict = Depends(current_user)):
    """Deployment check without exposing API keys or other secrets."""
    return {
        "orchestrator": "LangGraph",
        "agents": {
            "triage_vision": "ready",
            "booking_dispatch": "existing_service_connected",
            "diagnostic_rag": "ready",
            "admin_escalation": "ready",
        },
        "visionModel": settings.gemini_model,
        "groqModel": settings.groq_model,
        "embeddingModel": settings.gemini_embedding_model,
        "visionConfigured": bool(settings.gemini_api_key),
        "groqConfigured": bool(settings.groq_api_key),
        "faissIndexReady": (settings.data_dir / "faiss" / "index.faiss").exists(),
    }


@app.post("/api/agents/workflows/{workflow_id}/confirm", tags=["agents"])
def confirm_issue(workflow_id: str, user: dict = Depends(require_roles("customer"))):
    workflow = get_db().collection("agent_workflows").document(workflow_id).get().to_dict() or {}
    if workflow.get("customer_id") != user["uid"]:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow.get("current_stage") != "awaiting_customer_confirmation":
        raise HTTPException(status_code=409, detail="This issue is not ready for customer confirmation")
    result = resume_workflow(workflow_id, {"confirmed": True})
    return {key: value for key, value in result.items() if not key.startswith("__")}


@app.post("/api/agents/workflows/{workflow_id}/clarify", tags=["agents"])
def clarify_issue(workflow_id: str, payload: ClarificationRequest, user: dict = Depends(require_roles("customer"))):
    workflow = get_db().collection("agent_workflows").document(workflow_id).get().to_dict() or {}
    if workflow.get("customer_id") != user["uid"]:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if workflow.get("current_stage") != "awaiting_clarification":
        raise HTTPException(status_code=409, detail="This workflow is not awaiting clarification")
    return resume_workflow(workflow_id, {"action": "clarify", "answers": payload.answers,
                                         "corrected_category": payload.corrected_category})


@app.get("/api/agents/workflows/{workflow_id}", tags=["agents"])
def workflow_status(workflow_id: str, user: dict = Depends(current_user)):
    workflow = get_db().collection("agent_workflows").document(workflow_id).get().to_dict() or {}
    profile = get_db().collection("users").document(user["uid"]).get().to_dict() or {}
    if not workflow or (profile.get("role") != "admin" and workflow.get("customer_id") != user["uid"]):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow


@app.post("/api/requests/{request_id}/technical-assistant", tags=["agents"])
def technical_assistant(request_id: str, payload: DiagnosticRequest, user: dict = Depends(require_roles("worker", "admin"))):
    db = get_db()
    booking = db.collection("requests").document(request_id).get().to_dict() or {}
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if user["role"] == "worker" and booking.get("workerId") != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the assigned worker can use this assistant")
    worker_id = booking.get("workerId", user["uid"])
    worker = db.collection("workers").document(worker_id).get().to_dict() or {}
    try:
        result = diagnostic_brief(booking, payload.question, worker, payload.images)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if result["escalation_required"]:
        escalation_id = f"esc_diag_{request_id}"
        db.collection("agent_escalations").document(escalation_id).set({
            "escalationId": escalation_id, "bookingId": request_id, "issueId": booking.get("issueId"),
            "workerId": worker_id, "severity": "medium", "escalationReason": "Insufficient approved evidence or worker qualification",
            "supportingEvidence": {"evidenceSufficiency": result["evidence_sufficiency"], "qualified": bool(worker.get("verified"))},
            "recommendedNextAction": "Review documentation or require a qualified specialist", "workflowPaused": False,
            "humanReviewRequired": True, "status": "open", "createdAt": now_utc()}, merge=True)
        result["escalation_id"] = escalation_id
    return result


@app.get("/api/requests/{request_id}/technical-sources/{source_id}", tags=["agents"])
def technical_source(request_id: str, source_id: str, user: dict = Depends(require_roles("worker", "admin"))):
    db = get_db()
    booking = db.collection("requests").document(request_id).get().to_dict() or {}
    if not booking or (user["role"] == "worker" and booking.get("workerId") != user["uid"]):
        raise HTTPException(status_code=403, detail="You cannot access this job source")
    docs_root = (settings.data_dir / "approved-docs").resolve()
    manifest_path = settings.data_dir / "faiss" / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Source manifest not found")
    import json
    item = json.loads(manifest_path.read_text(encoding="utf-8")).get("documents", {}).get(source_id)
    if not item:
        raise HTTPException(status_code=404, detail="Approved source not found")
    path = (docs_root / item["source"]).resolve()
    if docs_root not in path.parents or not path.exists():
        raise HTTPException(status_code=404, detail="Approved source file not found")
    return FileResponse(path, filename=path.name)


@app.get("/api/admin/escalations", tags=["agents"])
def list_escalations(user: dict = Depends(require_roles("admin"))):
    return [serialize(item) for item in get_db().collection("agent_escalations").stream()]


@app.post("/api/admin/escalations/{escalation_id}/decision", tags=["agents"])
def decide_escalation(escalation_id: str, payload: EscalationDecision, user: dict = Depends(require_roles("admin"))):
    ref = get_db().collection("agent_escalations").document(escalation_id)
    escalation = ref.get().to_dict() or {}
    if not escalation or escalation.get("status") != "open":
        raise HTTPException(status_code=409, detail="Escalation is not open")
    ref.set({"status": "resolved", "decision": payload.action, "reason": payload.reason,
             "reviewedBy": user["uid"], "reviewedAt": now_utc(), "workflowPaused": False}, merge=True)
    result = resume_workflow(escalation["workflowId"], {"action": payload.action, "reason": payload.reason})
    return {key: value for key, value in result.items() if not key.startswith("__")}


@app.patch("/api/requests/{request_id}/status", tags=["requests"])
def update_request_status(request_id: str, payload: RequestStatusUpdate, user: dict = Depends(current_user)):
    db = get_db()
    ref = db.collection("requests").document(request_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Request not found")
    request = snapshot.to_dict() or {}
    role = (db.collection("users").document(user["uid"]).get().to_dict() or {}).get("role")
    allowed = role == "admin" or request.get("customerId") == user["uid"] or request.get("workerId") == user["uid"] or (role == "worker" and request.get("status") == "pending")
    if not allowed:
        raise HTTPException(status_code=403, detail="You cannot update this request")
    changes = {"status": payload.status}
    if payload.workerId is not None:
        changes["workerId"] = payload.workerId
    if payload.workerName is not None:
        changes["workerName"] = payload.workerName
    ref.update(changes)
    return serialize(ref.get())


@app.get("/api/requests/{request_id}/bids", tags=["bids"])
def list_bids(request_id: str, user: dict = Depends(current_user)):
    db = get_db()
    booking = db.collection("requests").document(request_id).get().to_dict() or {}
    profile = db.collection("users").document(user["uid"]).get().to_dict() or {}
    if profile.get("role") != "admin" and booking.get("customerId") != user["uid"] and profile.get("role") != "worker":
        raise HTTPException(status_code=403, detail="You cannot view these bids")
    return [serialize(item) for item in db.collection("requests").document(request_id).collection("bids").stream()]


@app.post("/api/requests/{request_id}/bids", status_code=status.HTTP_201_CREATED, tags=["bids"])
def submit_bid(request_id: str, payload: BidCreate, user: dict = Depends(require_roles("worker"))):
    db = get_db()
    request_ref = db.collection("requests").document(request_id)
    booking = request_ref.get().to_dict() or {}
    worker = db.collection("workers").document(user["uid"]).get().to_dict() or {}
    if not booking or booking.get("status") != "pending":
        raise HTTPException(status_code=409, detail="This booking is no longer accepting bids")
    if worker.get("status") != "approved" or worker.get("category") != booking.get("serviceCategory") or worker.get("availability") == "busy":
        raise HTTPException(status_code=403, detail="Only an approved matching professional can bid")
    old = request_ref.collection("bids").document(user["uid"]).get().to_dict() or {}
    data = {**payload.model_dump(), "bidId": user["uid"], "workerId": user["uid"], "workerName": worker.get("name", "Professional"), "workerRating": worker.get("rating", 0), "status": "submitted", "version": int(old.get("version", 0)) + 1, "createdAt": old.get("createdAt", now_utc()), "updatedAt": now_utc()}
    request_ref.collection("bids").document(user["uid"]).set(data)
    return data


@app.post("/api/requests/{request_id}/bids/{worker_id}/accept", tags=["bids"])
def accept_bid(request_id: str, worker_id: str, user: dict = Depends(require_roles("customer"))):
    db = get_db()
    request_ref = db.collection("requests").document(request_id)
    booking = request_ref.get().to_dict() or {}
    if booking.get("customerId") != user["uid"] or booking.get("status") != "pending":
        raise HTTPException(status_code=409, detail="This bid cannot be accepted")
    bid_ref = request_ref.collection("bids").document(worker_id)
    bid = bid_ref.get().to_dict() or {}
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    request_ref.set({"workerId": worker_id, "workerName": bid.get("workerName", "Professional"), "budget": bid["price"], "negotiatedPrice": bid["price"], "status": "accepted", "acceptedBidId": worker_id}, merge=True)
    bid_ref.set({"status": "accepted", "acceptedAt": now_utc()}, merge=True)
    db.collection("workers").document(worker_id).set({"availability": "busy"}, merge=True)
    for other in request_ref.collection("bids").stream():
        if other.id != worker_id:
            other.reference.set({"status": "rejected"}, merge=True)
    add_system_message(request_id, f"{bid.get('workerName', 'Professional')} was booked for Rs. {bid['price']:,.0f}.")
    return serialize(request_ref.get())


@app.get("/api/workers/{worker_id}/reviews", tags=["reviews"])
def list_reviews(worker_id: str):
    return [serialize(item) for item in get_db().collection("reviews").where("workerId", "==", worker_id).stream()]


@app.post("/api/reviews", status_code=status.HTTP_201_CREATED, tags=["reviews"])
def create_review(payload: ReviewCreate, user: dict = Depends(require_roles("customer"))):
    db = get_db()
    profile = db.collection("users").document(user["uid"]).get().to_dict() or {}
    review_id = f"review_{uuid4().hex}"
    data = {**payload.model_dump(), "reviewId": review_id, "customerId": user["uid"], "customerName": profile.get("name", "Customer"), "createdAt": now_utc()}
    db.collection("reviews").document(review_id).set(data)
    return data


@app.get("/api/notifications", tags=["notifications"])
def list_notifications(user: dict = Depends(current_user)):
    return [serialize(item) for item in get_db().collection("notifications").where("userId", "==", user["uid"]).stream()]


@app.patch("/api/notifications/{notification_id}/read", tags=["notifications"])
def read_notification(notification_id: str, user: dict = Depends(current_user)):
    ref = get_db().collection("notifications").document(notification_id)
    snapshot = ref.get()
    if not snapshot.exists or snapshot.to_dict().get("userId") != user["uid"]:
        raise HTTPException(status_code=404, detail="Notification not found")
    ref.update({"read": True})
    return {"ok": True}


@app.get("/api/payments", tags=["payments"])
def list_payments(user: dict = Depends(current_user)):
    db = get_db()
    profile = db.collection("users").document(user["uid"]).get().to_dict() or {}
    query = db.collection("payments")
    if profile.get("role") == "admin":
        snapshots = query.stream()
    elif profile.get("role") == "worker":
        snapshots = query.where("workerId", "==", user["uid"]).stream()
    else:
        snapshots = query.where("customerId", "==", user["uid"]).stream()
    return [serialize(item) for item in snapshots]


@app.post("/api/payments", status_code=status.HTTP_201_CREATED, tags=["payments"])
def create_payment(payload: PaymentCreate, user: dict = Depends(require_roles("customer"))):
    db = get_db()
    request_snapshot = db.collection("requests").document(payload.requestId).get()
    if not request_snapshot.exists:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking = request_snapshot.to_dict() or {}
    if booking.get("customerId") != user["uid"]:
        raise HTTPException(status_code=403, detail="This booking does not belong to you")
    if booking.get("status") != "work_finished":
        raise HTTPException(status_code=409, detail="Payment unlocks only after the professional marks the work finished")
    existing = list(db.collection("payments").where("requestId", "==", payload.requestId).where("customerId", "==", user["uid"]).stream())
    if any((item.to_dict() or {}).get("status") in {"awaiting_worker_confirmation", "confirmed"} for item in existing):
        raise HTTPException(status_code=409, detail="A payment already exists for this booking")
    if payload.provider != "cash" and (len(payload.payerPhone.strip()) < 10 or len(payload.payerName.strip()) < 2 or len(payload.transactionReference.strip()) < 4 or not payload.proofImage):
        raise HTTPException(status_code=422, detail="Sender name, phone number, transaction reference, and payment screenshot are required")
    payment_id = f"pay_{uuid4().hex}"
    payment_status = "awaiting_worker_confirmation"
    proof_path = ""
    if payload.provider != "cash":
        match = re.fullmatch(r"data:image/(jpeg|png|webp);base64,(.+)", payload.proofImage, re.DOTALL)
        if not match:
            raise HTTPException(status_code=422, detail="Payment proof must be a JPEG, PNG, or WebP image")
        raw = base64.b64decode(match.group(2), validate=True)
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Payment screenshot must be smaller than 5 MB")
        extension = "jpg" if match.group(1) == "jpeg" else match.group(1)
        PAYMENT_PROOF_DIR.mkdir(parents=True, exist_ok=True)
        proof_path = str(PAYMENT_PROOF_DIR / f"{payment_id}.{extension}")
        Path(proof_path).write_bytes(raw)
    data = {
        "paymentId": payment_id,
        "requestId": payload.requestId,
        "customerId": user["uid"],
        "customerName": booking.get("customerName", "Customer"),
        "workerId": booking.get("workerId", ""),
        "workerName": booking.get("workerName", ""),
        "provider": payload.provider,
        "payerPhone": payload.payerPhone.strip(),
        "payerName": payload.payerName.strip(),
        "transactionReference": payload.transactionReference.strip(),
        "proofFile": Path(proof_path).name if proof_path else "",
        "amount": float(booking.get("budget") or 0),
        "currency": "PKR",
        "status": payment_status,
        "createdAt": now_utc(),
    }
    db.collection("payments").document(payment_id).set(data)
    request_snapshot.reference.set({"paymentId": payment_id, "paymentProvider": payload.provider, "paymentStatus": payment_status}, merge=True)
    return data


@app.post("/api/payments/{payment_id}/confirm-receipt", tags=["payments"])
def confirm_payment_receipt(payment_id: str, user: dict = Depends(require_roles("worker"))):
    db = get_db()
    ref = db.collection("payments").document(payment_id)
    payment = ref.get().to_dict() or {}
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    if payment.get("workerId") != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the assigned professional can confirm this payment")
    if payment.get("status") != "awaiting_worker_confirmation":
        raise HTTPException(status_code=409, detail="This payment has already been handled")
    ref.set({"status": "confirmed", "confirmedAt": now_utc(), "confirmedBy": user["uid"]}, merge=True)
    db.collection("requests").document(payment["requestId"]).set({"paymentStatus": "confirmed"}, merge=True)
    add_system_message(payment["requestId"], "Professional confirmed payment receipt. Both parties can complete the booking.")
    return serialize(ref.get())


@app.get("/api/payments/{payment_id}/proof", tags=["payments"])
def get_payment_proof(payment_id: str, user: dict = Depends(current_user)):
    db = get_db()
    snapshot = db.collection("payments").document(payment_id).get()
    if not snapshot.exists:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment = snapshot.to_dict() or {}
    role = (db.collection("users").document(user["uid"]).get().to_dict() or {}).get("role")
    if role != "admin" and payment.get("customerId") != user["uid"] and payment.get("workerId") != user["uid"]:
        raise HTTPException(status_code=403, detail="You cannot access this payment proof")
    filename = payment.get("proofFile", "")
    path = (PAYMENT_PROOF_DIR / filename).resolve()
    if not filename or PAYMENT_PROOF_DIR.resolve() not in path.parents or not path.exists():
        raise HTTPException(status_code=404, detail="Payment proof not found")
    return FileResponse(path)


@app.post("/api/advisor", tags=["advisor"])
def advisor(payload: AdvisorRequest):
    problem = payload.problem.lower()
    fallback = {"recommendedService": "General Technician", "urgencyLevel": "Medium", "possibleCause": "The issue needs an on-site inspection.", "estimatedCost": "Rs. 1,000 - 2,500", "safetyAdvice": "Keep the affected area isolated until a professional arrives.", "confidenceScore": "80%"}
    if not settings.gemini_api_key:
        return fallback
    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(model=settings.gemini_model, contents=f"Return only JSON with recommendedService, urgencyLevel, possibleCause, estimatedCost, safetyAdvice, confidenceScore for this Pakistan home-service problem: {problem}")
        import json
        return json.loads((response.text or "").replace("```json", "").replace("```", "").strip())
    except Exception:
        return fallback
