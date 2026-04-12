import json
from typing import Any, Dict


DEFAULT_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "*",
}


def json_response(status_code: int, body: Dict[str, Any], headers: Dict[str, str] | None = None) -> Dict[str, Any]:
    response_headers = dict(DEFAULT_HEADERS)
    if headers:
        response_headers.update(headers)
    return {
        "statusCode": status_code,
        "headers": response_headers,
        "body": json.dumps(body),
    }
