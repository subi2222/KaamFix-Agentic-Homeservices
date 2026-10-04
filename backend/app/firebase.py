import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import auth, credentials, firestore

from .config import get_settings


@lru_cache
def initialize_firebase() -> firebase_admin.App:
    settings = get_settings()
    if firebase_admin._apps:
        return firebase_admin.get_app()

    if settings.firebase_service_account_json:
        credential = credentials.Certificate(json.loads(settings.firebase_service_account_json))
    elif settings.google_application_credentials:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = settings.google_application_credentials
        credential = credentials.ApplicationDefault()
    else:
        credential = credentials.ApplicationDefault()

    return firebase_admin.initialize_app(credential, {"projectId": settings.firebase_project_id})


def get_db():
    initialize_firebase()
    return firestore.client()


def verify_token(token: str) -> dict:
    initialize_firebase()
    # Allow only the small observed local clock drift. All signature, issuer,
    # audience, expiry and revocation checks remain enabled.
    return auth.verify_id_token(token, check_revoked=True, clock_skew_seconds=10)
