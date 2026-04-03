from app.response import json_response
from services.attendance_service import AttendanceService
from utils.event_parser import BadRequestError, decode_data_url_image, parse_json_body


service = AttendanceService()


def handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        class_id = path_params.get("class_id")
        if not class_id:
            return json_response(400, {"error": "class_id is required in path"})

        payload = parse_json_body(event)
        image_bytes = decode_data_url_image(payload.get("image", ""))
        result = service.process_sync_payload(class_id, image_bytes)

        return json_response(
            200,
            {
                "message": "Attendance processed",
                "attendance_id": result["attendance_id"],
                "present_count": result["present_count"],
                "recognized": result["recognized"],
                "unrecognized_faces": result["unrecognized_faces"],
            },
        )
    except BadRequestError as exc:
        return json_response(400, {"error": str(exc)})
    except Exception as exc:
        return json_response(500, {"error": str(exc)})
