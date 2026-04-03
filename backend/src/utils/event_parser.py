import base64
import json
from typing import Any, Dict


class BadRequestError(Exception):
    pass


def parse_json_body(event: Dict[str, Any]) -> Dict[str, Any]:
    body = event.get("body")
    if not body:
        return {}
    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise BadRequestError("Invalid JSON body") from exc


def decode_data_url_image(image_payload: str) -> bytes:
    if not image_payload:
        raise BadRequestError("Image payload is required")

    encoded = image_payload
    if image_payload.startswith("data:image") and "," in image_payload:
        encoded = image_payload.split(",", 1)[1]

    try:
        return base64.b64decode(encoded)
    except ValueError as exc:
        raise BadRequestError("Image payload is not valid base64") from exc
