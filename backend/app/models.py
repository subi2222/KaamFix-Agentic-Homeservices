from datetime import datetime, timezone
from typing import Literal
from pydantic import BaseModel, Field


class UserUpdate(BaseModel):
    name: str = Field(min_length=2, max_length=128)


class WorkerUpdate(BaseModel):
    city: str | None = Field(default=None, max_length=128)
    category: str | None = Field(default=None, max_length=128)
    experience: int | None = Field(default=None, ge=0, le=50)
    pricing: float | None = Field(default=None, ge=0)
    availability: Literal["available", "busy", "offline"] | None = None
    about: str | None = Field(default=None, max_length=2000)
    phone: str | None = Field(default=None, max_length=32)
    photoURL: str | None = Field(default=None, max_length=5000)


class WorkerModeration(BaseModel):
    status: Literal["pending", "approved", "rejected", "suspended"]
    verified: bool


class RequestCreate(BaseModel):
    serviceCategory: str = Field(min_length=2, max_length=128)
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5, max_length=1000)
    budget: float = Field(ge=0)
    location: str = Field(min_length=3, max_length=500)
    date: str = Field(min_length=4, max_length=128)
    workerId: str = ""
    workerName: str = ""
    customerLocation: dict[str, float | str] | None = None
    workflowId: str | None = Field(default=None, max_length=128)
    issueId: str | None = Field(default=None, max_length=128)


class RequestStatusUpdate(BaseModel):
    status: Literal["pending", "accepted", "en_route", "arrived", "in_progress", "work_finished", "completed", "rejected", "cancelled", "disputed"]
    workerId: str | None = None
    workerName: str | None = None


class ReviewCreate(BaseModel):
    workerId: str = Field(min_length=1, max_length=128)
    rating: int = Field(ge=1, le=5)
    review: str = Field(min_length=3, max_length=2000)


class AdvisorRequest(BaseModel):
    problem: str = Field(min_length=5, max_length=3000)


class TriageRequest(BaseModel):
    description: str = Field(min_length=5, max_length=3000)
    selected_category: str | None = Field(default=None, max_length=128)
    follow_up_answers: dict[str, str] = Field(default_factory=dict)
    images: list[str] = Field(default_factory=list, max_length=3)


class DiagnosticRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    images: list[str] = Field(default_factory=list, max_length=3)


class ClarificationRequest(BaseModel):
    answers: dict[str, str] = Field(min_length=1, max_length=8)
    corrected_category: str | None = Field(default=None, max_length=128)


class EscalationDecision(BaseModel):
    action: Literal["approve", "require_specialist", "request_information", "reject", "resolve"]
    reason: str = Field(min_length=3, max_length=1000)


class PaymentCreate(BaseModel):
    requestId: str = Field(min_length=3, max_length=128)
    provider: Literal["easypaisa", "jazzcash", "bank_transfer", "cash"]
    payerPhone: str = Field(default="", max_length=20)
    payerName: str = Field(default="", max_length=128)
    transactionReference: str = Field(default="", max_length=128)
    proofImage: str = Field(default="", max_length=8_000_000)


class LocationUpdate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    address: str = Field(default="", max_length=500)
    online: bool = True


class BidCreate(BaseModel):
    price: float = Field(gt=0, le=10_000_000)
    etaMinutes: int = Field(ge=5, le=1440)
    message: str = Field(default="", max_length=500)


class DispatchRequest(BaseModel):
    category: str = Field(min_length=2, max_length=128)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    radiusKm: float = Field(default=15, ge=1, le=100)
    problem: str = Field(default="", max_length=2000)


class MessageCreate(BaseModel):
    text: str = Field(default="", max_length=2000)
    imageData: str = Field(default="", max_length=8_000_000)


class BookingTransition(BaseModel):
    action: Literal["start_journey", "mark_arrived", "start_work", "finish_work"]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
