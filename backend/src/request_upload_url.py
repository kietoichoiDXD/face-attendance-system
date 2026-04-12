from app.response import json_response
from services.attendance_service import AttendanceService


service = AttendanceService()


def handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        class_id = path_params.get("class_id")
        if not class_id:
            return json_response(400, {"error": "class_id is required in path"})

        payload = service.create_upload_url(class_id)
        return json_response(200, payload)
    except Exception as exc:
        return json_response(500, {"error": str(exc)})
