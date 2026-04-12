import urllib.parse

from services.attendance_service import AttendanceService


service = AttendanceService()


def handler(event, context):
    processed_ids = []

    records = event.get("Records", []) if isinstance(event, dict) else []
    if records:
        for record in records:
            s3_info = record.get("s3", {})
            object_info = s3_info.get("object", {})
            object_key = urllib.parse.unquote_plus(object_info.get("key", ""))

            attendance_id = service.process_uploaded_attendance(object_key)
            if attendance_id:
                processed_ids.append(attendance_id)
    else:
        # Cloud Storage event shape for GCP serverless runtimes.
        object_key = ""
        if isinstance(event, dict):
            object_key = event.get("name", "") or (event.get("data", {}) or {}).get("name", "")
        object_key = urllib.parse.unquote_plus(object_key)

        attendance_id = service.process_uploaded_attendance(object_key)
        if attendance_id:
            processed_ids.append(attendance_id)

    return {
        "statusCode": 200,
        "processed": processed_ids,
        "processed_count": len(processed_ids),
    }
