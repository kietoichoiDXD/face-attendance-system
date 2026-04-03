from app.response import json_response
from services.attendance_service import AttendanceService


service = AttendanceService()


def handler(event, context):
    try:
        path_params = event.get("pathParameters") or {}
        attendance_id = path_params.get("attendance_id")
        if not attendance_id:
            return json_response(400, {"error": "attendance_id is required in path"})

        record = service.get_attendance_result(attendance_id)
        if not record:
            return json_response(404, {"error": "Attendance record not found"})

        return json_response(200, record)
    except Exception as exc:
        return json_response(500, {"error": str(exc)})
