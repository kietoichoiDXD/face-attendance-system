from __future__ import annotations

import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.clients import ensure_bucket, storage_client
from app.config import settings
from app.gcp_vision import build_vision_client
from repositories.attendance_repository import AttendanceRepository
from repositories.students_repository import StudentsRepository
from utils.face_embedding import build_face_embedding, cosine_similarity
from utils.image_tools import crop_face, image_size, poly_to_ratio_box

LOGGER = logging.getLogger(__name__)


class AttendanceService:
    def __init__(
        self,
        attendance_repo: AttendanceRepository | None = None,
        students_repo: StudentsRepository | None = None,
    ) -> None:
        self.attendance_repo = attendance_repo or AttendanceRepository()
        self.students_repo = students_repo or StudentsRepository()

    def create_upload_url(self, class_id: str) -> Dict[str, str]:
        ensure_bucket(settings.class_uploads_bucket)
        attendance_id = str(uuid.uuid4())
        object_key = f"classes/{class_id}/attendance/{attendance_id}.jpg"

        blob = storage_client.bucket(settings.class_uploads_bucket).blob(object_key)
        upload_url = blob.generate_signed_url(
            version="v4",
            expiration=900,
            method="PUT",
            content_type="image/jpeg",
        )

        self.attendance_repo.put_record(
            {
                "attendance_id": attendance_id,
                "class_id": class_id,
                "status": "UPLOADING",
                "image_key": object_key,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "present_count": 0,
                "recognized": [],
                "unrecognized_faces": [],
            }
        )

        return {
            "attendance_id": attendance_id,
            "upload_url": upload_url,
            "image_key": object_key,
        }

    def process_uploaded_attendance(self, object_key: str) -> Optional[str]:
        if not object_key.startswith("classes/") or not object_key.endswith(".jpg"):
            LOGGER.info("Skipping object without attendance naming convention: %s", object_key)
            return None

        attendance_id = object_key.rsplit("/", 1)[-1].replace(".jpg", "")
        existing = self.attendance_repo.get_record(attendance_id)
        if not existing:
            LOGGER.warning("No attendance record found for %s", attendance_id)
            return None

        image_bytes = self._read_s3_object(object_key)
        process_result = self._run_face_matching(image_bytes, existing.get("class_id", ""))

        self.attendance_repo.update_processing_result(
            attendance_id,
            {
                "status": "COMPLETED",
                "recognized": process_result["recognized"],
                "unrecognized_faces": process_result["unrecognized_faces"],
                "present_count": process_result["present_count"],
            },
        )

        return attendance_id

    def process_sync_payload(self, class_id: str, image_bytes: bytes) -> Dict[str, Any]:
        ensure_bucket(settings.class_uploads_bucket)
        attendance_id = str(uuid.uuid4())
        object_key = f"classes/{class_id}/attendance/{attendance_id}.jpg"

        storage_client.bucket(settings.class_uploads_bucket).blob(object_key).upload_from_string(
            image_bytes,
            content_type="image/jpeg",
        )

        result = self._run_face_matching(image_bytes, class_id)

        self.attendance_repo.put_record(
            {
                "attendance_id": attendance_id,
                "class_id": class_id,
                "status": "COMPLETED",
                "image_key": object_key,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "processed_at": datetime.now(timezone.utc).isoformat(),
                "present_count": result["present_count"],
                "recognized": result["recognized"],
                "unrecognized_faces": result["unrecognized_faces"],
            }
        )
        return {"attendance_id": attendance_id, **result}

    def _read_s3_object(self, object_key: str) -> bytes:
        return storage_client.bucket(settings.class_uploads_bucket).blob(object_key).download_as_bytes()

    def _run_face_matching(self, image_bytes: bytes, class_id: str) -> Dict[str, Any]:
        detected_faces = self._detect_faces_google_vision(image_bytes)
        students = self.students_repo.get_students_by_class(class_id)
        width, height = image_size(image_bytes)

        recognized: List[Dict[str, Any]] = []
        unrecognized_faces: List[Dict[str, Any]] = []

        for face in detected_faces:
            cropped_face_bytes = crop_face(image_bytes, face["bounding_poly"])
            match = self._find_best_match(cropped_face_bytes, students)
            ratio_box = poly_to_ratio_box(face["bounding_poly"], width, height)

            if match:
                recognized.append(
                    {
                        "student_id": match["student"]["student_id"],
                        "name": match["student"].get("name"),
                        "confidence": round(match["confidence"], 2),
                        "bounding_box": ratio_box,
                    }
                )
            else:
                unrecognized_faces.append({"bounding_box": ratio_box})

        return {
            "present_count": len(recognized),
            "recognized": recognized,
            "unrecognized_faces": unrecognized_faces,
        }

    def _find_best_match(self, target_face: bytes, students: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        best: Optional[Dict[str, Any]] = None
        target_embedding = build_face_embedding(target_face)

        for student in students:
            source_embedding = student.get("embedding")
            if not source_embedding:
                continue

            similarity = cosine_similarity(target_embedding, source_embedding)
            if similarity < settings.match_similarity_threshold:
                continue

            if not best or similarity > best["confidence"]:
                best = {"student": student, "confidence": similarity * 100.0}

        return best

    def _detect_faces_google_vision(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        from google.cloud import vision

        if settings.vision_provider != "google":
            raise RuntimeError("Unsupported vision provider. Set VISION_PROVIDER=google.")

        client = build_vision_client()
        image = vision.Image(content=image_bytes)
        response = client.face_detection(image=image)

        if response.error.message:
            raise RuntimeError(f"Google Vision error: {response.error.message}")

        faces = []
        for ann in response.face_annotations:
            vertices = [{"x": v.x, "y": v.y} for v in ann.bounding_poly.vertices]
            faces.append({"bounding_poly": {"vertices": vertices}})

        return faces

    def get_attendance_result(self, attendance_id: str) -> Dict[str, Any] | None:
        return self.attendance_repo.get_record(attendance_id)

    def get_analytics_summary(self) -> Dict[str, Any]:
        logs = self.attendance_repo.list_records()
        completed = [log for log in logs if log.get("status") == "COMPLETED"]
        chart_data = [
            {
                "date": (log.get("processed_at") or log.get("created_at", ""))[:10],
                "present": log.get("present_count", 0),
                "class_id": log.get("class_id"),
            }
            for log in completed
        ]

        students = self.students_repo.get_all_students()
        total_present = sum(log.get("present_count", 0) for log in completed)
        possible_slots = max(1, len(completed) * max(1, len(students)))
        attendance_rate = round((total_present / possible_slots) * 100, 2)

        return {
            "total_students": len(students),
            "total_classes": len({s.get("class_id") for s in students if s.get("class_id")}),
            "attendance_rate": attendance_rate,
            "recent_attendance": chart_data[-15:],
        }

    def export_rows(self) -> List[List[Any]]:
        logs = self.attendance_repo.list_records()
        rows: List[List[Any]] = []
        for log in logs:
            rows.append(
                [
                    log.get("attendance_id"),
                    log.get("class_id"),
                    log.get("status"),
                    log.get("created_at"),
                    log.get("processed_at", ""),
                    log.get("present_count", 0),
                ]
            )
        return rows
