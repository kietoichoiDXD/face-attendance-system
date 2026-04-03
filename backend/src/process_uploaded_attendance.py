import urllib.parse

from services.attendance_service import AttendanceService


service = AttendanceService()


def handler(event, context):
    records = event.get("Records", [])
    processed_ids = []

    for record in records:
        s3_info = record.get("s3", {})
        object_info = s3_info.get("object", {})
        object_key = urllib.parse.unquote_plus(object_info.get("key", ""))

        attendance_id = service.process_uploaded_attendance(object_key)
        if attendance_id:
            processed_ids.append(attendance_id)

    return {
        "statusCode": 200,
        "processed": processed_ids,
        "processed_count": len(processed_ids),
    }
