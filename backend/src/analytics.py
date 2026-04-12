from app.response import json_response
from services.attendance_service import AttendanceService


service = AttendanceService()


def handler(event, context):
    try:
        summary = service.get_analytics_summary()
        return json_response(200, summary)
    except Exception as exc:
        return json_response(500, {"error": str(exc)})
