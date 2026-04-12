import base64
import json
from typing import Any, Dict

from google.cloud import vision
from google.oauth2 import service_account

from app.config import settings


def _load_service_account_info() -> Dict[str, Any]:
    if settings.gcp_service_account_json:
        return json.loads(settings.gcp_service_account_json)

    if settings.gcp_service_account_json_b64:
        decoded = base64.b64decode(settings.gcp_service_account_json_b64).decode("utf-8")
        return json.loads(decoded)

    raise RuntimeError(
        "Missing GCP credentials. Set GCP_SERVICE_ACCOUNT_JSON or GCP_SERVICE_ACCOUNT_JSON_B64."
    )


def build_vision_client() -> vision.ImageAnnotatorClient:
    # If GOOGLE_APPLICATION_CREDENTIALS is provided in runtime, default client can be used.
    # Otherwise, build credentials from env-based service account payload.
    try:
        return vision.ImageAnnotatorClient()
    except Exception:
        service_account_info = _load_service_account_info()
        credentials = service_account.Credentials.from_service_account_info(service_account_info)
        return vision.ImageAnnotatorClient(credentials=credentials)
