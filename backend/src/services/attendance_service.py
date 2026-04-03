from __future__ import annotations

import io
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.clients import rekognition_client, s3_client
from app.config import settings
from app.gcp_vision import build_vision_client
from repositories.attendance_repository import AttendanceRepository
from repositories.students_repository import StudentsRepository
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
        attendance_id = str(uuid.uuid4())
        object_key = f"classes/{class_id}/attendance/{attendance_id}.jpg"

        upload_url = s3_client.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": settings.class_uploads_bucket,
                "Key": object_key,
                "ContentType": "image/jpeg",
            },
            ExpiresIn=900,
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
        attendance_id = str(uuid.uuid4())
        object_key = f"classes/{class_id}/attendance/{attendance_id}.jpg"

        s3_client.put_object(
            Bucket=settings.class_uploads_bucket,
            Key=object_key,
            Body=image_bytes,
            ContentType="image/jpeg",
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
        response = s3_client.get_object(Bucket=settings.class_uploads_bucket, Key=object_key)
        return response["Body"].read()

    def _run_face_matching(self, image_bytes: bytes, class_id: str) -> Dict[str, Any]:
        detected_faces = self._detect_faces_google_vision(image_bytes)
        students = [s for s in self.students_repo.get_all_students() if s.get("class_id") == class_id]
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

        for student in students:
            source_key = student.get("face_image_s3_key")
            if not source_key:
                continue

            compare = rekognition_client.compare_faces(
                SourceImage={"S3Object": {"Bucket": settings.student_faces_bucket, "Name": source_key}},
                TargetImage={"Bytes": target_face},
                SimilarityThreshold=88,
            )
            matches = compare.get("FaceMatches", [])
            if not matches:
                continue

            similarity = matches[0]["Similarity"]
            if not best or similarity > best["confidence"]:
                best = {"student": student, "confidence": similarity}

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
