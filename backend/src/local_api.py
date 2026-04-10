from __future__ import annotations

import io
import json
from typing import Any, Dict

from flask import Flask, Response, request
from flask_cors import CORS

import analytics
import export_csv
import get_attendance
import process_attendance
import register_student
import request_upload_url
from app.response import json_response
from app.clients import storage_client
from app.config import settings
from repositories.students_repository import StudentsRepository


app = Flask(__name__)
CORS(app)
students_repo = StudentsRepository()


def _build_lambda_event(path_params: Dict[str, str] | None = None, body_obj: Dict[str, Any] | None = None) -> Dict[str, Any]:
    body = json.dumps(body_obj) if body_obj is not None else None
    return {
        "pathParameters": path_params or {},
        "body": body,
        "isBase64Encoded": False,
    }


def _from_lambda_result(result: Dict[str, Any]) -> Response:
    status_code = result.get("statusCode", 200)
    body = result.get("body", "")
    headers = result.get("headers", {}) or {}

    if isinstance(body, (dict, list)):
        payload = json.dumps(body, ensure_ascii=False)
        return Response(payload, status=status_code, headers=headers, mimetype="application/json")

    if isinstance(body, str):
        content_type = headers.get("Content-Type", "application/json")
        return Response(body, status=status_code, headers=headers, mimetype=content_type)

    return Response(json.dumps(body), status=status_code, headers=headers, mimetype="application/json")


@app.get("/health")
def health() -> Response:
    return Response(json.dumps({"ok": True}), status=200, mimetype="application/json")


@app.get("/analytics")
def route_analytics() -> Response:
    result = analytics.handler({}, None)
    return _from_lambda_result(result)


@app.post("/students/<student_id>/face")
def route_register_student(student_id: str) -> Response:
    payload = request.get_json(silent=True) or {}
    event = _build_lambda_event(path_params={"student_id": student_id}, body_obj=payload)
    result = register_student.handler(event, None)
    return _from_lambda_result(result)


@app.post("/classes/<class_id>/attendance")
def route_process_attendance(class_id: str) -> Response:
    payload = request.get_json(silent=True) or {}
    event = _build_lambda_event(path_params={"class_id": class_id}, body_obj=payload)
    result = process_attendance.handler(event, None)
    return _from_lambda_result(result)


@app.post("/classes/<class_id>/attendance/upload-url")
def route_upload_url(class_id: str) -> Response:
    # Keep endpoint for compatibility; frontend has fallback to sync processing if this fails.
    event = _build_lambda_event(path_params={"class_id": class_id}, body_obj={})
    try:
        result = request_upload_url.handler(event, None)
    except Exception as exc:  # noqa: BLE001
        result = json_response(500, {"error": str(exc)})
    return _from_lambda_result(result)


@app.get("/attendance/<attendance_id>")
def route_get_attendance(attendance_id: str) -> Response:
    event = _build_lambda_event(path_params={"attendance_id": attendance_id}, body_obj={})
    result = get_attendance.handler(event, None)
    return _from_lambda_result(result)


@app.get("/classes")
def route_list_classes() -> Response:
    students = students_repo.get_all_students()
    by_class: dict[str, int] = {}
    for student in students:
        class_id = str(student.get("class_id") or "unknown")
        by_class[class_id] = by_class.get(class_id, 0) + 1

    payload = {
        "classes": [
            {"class_id": class_id, "student_count": count}
            for class_id, count in sorted(by_class.items())
        ]
    }
    return Response(json.dumps(payload, ensure_ascii=False), status=200, mimetype="application/json")


@app.get("/classes/<class_id>/students")
def route_students_by_class(class_id: str) -> Response:
    students = students_repo.get_students_by_class(class_id)
    for student in students:
        student.pop("embedding", None)
    payload = {"class_id": class_id, "students": students}
    return Response(json.dumps(payload, ensure_ascii=False), status=200, mimetype="application/json")


@app.get("/students/<student_id>")
def route_student_detail(student_id: str) -> Response:
    student = students_repo.get_student(student_id)
    if not student:
        return Response(json.dumps({"error": "Student not found"}), status=404, mimetype="application/json")
    student.pop("embedding", None)
    return Response(json.dumps(student, ensure_ascii=False), status=200, mimetype="application/json")


@app.get("/students/<student_id>/image")
def route_student_image(student_id: str) -> Response:
    student = students_repo.get_student(student_id)
    if not student:
        return Response("Student not found", status=404)

    image_key = student.get("face_image_gcs_key")
    if not image_key:
        return Response("Student image not found", status=404)

    blob = storage_client.bucket(settings.student_faces_bucket).blob(str(image_key))
    if not blob.exists():
        return Response("Student image not found", status=404)

    image_bytes = blob.download_as_bytes()
    return Response(image_bytes, status=200, mimetype="image/jpeg")


@app.get("/attendance/export")
def route_export_csv() -> Response:
    result = export_csv.handler({}, None)
    return _from_lambda_result(result)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
