from app.response import json_response
from services.student_registration_service import StudentRegistrationService
from utils.event_parser import BadRequestError, decode_data_url_image, parse_json_body


service = StudentRegistrationService()


def handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        student_id = path_params.get("student_id")
        if not student_id:
            return json_response(400, {"error": "student_id is required in path"})

        payload = parse_json_body(event)
        image_bytes = decode_data_url_image(payload.get("image", ""))
        name = payload.get("name") or f"Student {student_id}"
        class_id = payload.get("class_id") or "general"

        student = service.register_student(student_id, name, class_id, image_bytes)
        return json_response(
            200,
            {
                "message": "Student registered successfully",
                "student_id": student["student_id"],
                "face_id": student["face_id"],
            },
        )
    except BadRequestError as exc:
        return json_response(400, {"error": str(exc)})
    except ValueError as exc:
        return json_response(400, {"error": str(exc)})
    except Exception as exc:
        return json_response(500, {"error": str(exc)})
