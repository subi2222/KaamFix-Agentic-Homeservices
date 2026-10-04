import base64
import json
import logging
import re
from datetime import datetime, timezone
from typing import Callable
from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth
from google.auth.exceptions import DefaultCredentialsError

from .firebase import get_db, verify_token
from .config import get_settings

logger = logging.getLogger("kaamfix.auth")


def _safe_error_reason(exc: Exception) -> str:
    """Keep the useful SDK reason while redacting anything shaped like a JWT."""
    reason = re.sub(r"[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}", "[REDACTED_JWT]", str(exc))
    return reason[:500]


def _safe_claims(token: str) -> dict:
    """Decode only non-sensitive timing/project claims for diagnostics; never trusts them."""
    try:
        payload = token.split(".")[1]
        payload += "=" * (-len(payload) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload))
        return {key: claims.get(key) for key in ("aud", "iss", "iat", "exp")}
    except Exception:
        return {"jwt_shape": "unreadable"}


def _verification_error(exc: Exception, token: str) -> HTTPException:
    settings = get_settings()
    context = {"errorType": type(exc).__name__, "reason": _safe_error_reason(exc),
               "project": settings.firebase_project_id,
               "emulator": bool(__import__("os").getenv("FIREBASE_AUTH_EMULATOR_HOST")),
               "serverUtc": datetime.now(timezone.utc).isoformat(), **_safe_claims(token)}
    logger.warning("Firebase ID token verification failed: %s", context)
    if isinstance(exc, firebase_auth.ExpiredIdTokenError):
        return HTTPException(status_code=401, detail="Firebase ID token expired")
    if isinstance(exc, firebase_auth.RevokedIdTokenError):
        return HTTPException(status_code=401, detail="Firebase ID token revoked; sign in again")
    if isinstance(exc, firebase_auth.UserDisabledError):
        return HTTPException(status_code=401, detail="Firebase user account is disabled")
    if isinstance(exc, firebase_auth.InvalidIdTokenError):
        return HTTPException(status_code=401, detail="Invalid Firebase ID token")
    if isinstance(exc, (firebase_auth.CertificateFetchError, firebase_auth.ConfigurationNotFoundError,
                        firebase_auth.UnexpectedResponseError, DefaultCredentialsError)):
        return HTTPException(status_code=503, detail="Firebase Admin verification service is not configured or reachable")
    return HTTPException(status_code=503, detail="Firebase Admin token verification failed")


async def current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Firebase bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing Firebase bearer token")
    try:
        decoded = verify_token(token)
        decoded["uid"] = decoded.get("uid") or decoded.get("sub")
        return decoded
    except Exception as exc:
        raise _verification_error(exc, token) from exc


def require_roles(*roles: str) -> Callable:
    async def dependency(user: dict = Depends(current_user)) -> dict:
        profile = get_db().collection("users").document(user["uid"]).get()
        role = profile.to_dict().get("role") if profile.exists else None
        if role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        user["role"] = role
        return user
    return dependency
