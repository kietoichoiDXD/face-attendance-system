from __future__ import annotations

import uuid
from typing import Any, Dict

from app.clients import ensure_bucket, storage_client
from app.config import settings
from app.gcp_vision import build_vision_client
from repositories.students_repository import StudentsRepository
from utils.face_embedding import build_face_embedding
from utils.image_tools import crop_face


class StudentRegistrationService:
    def __init__(self, repository: StudentsRepository | None = None) -> None:
        self.repository = repository or StudentsRepository()

    def register_student(self, student_id: str, name: str, class_id: str, image_bytes: bytes) -> Dict[str, Any]:
        ensure_bucket(settings.student_faces_bucket)
        file_key = f"students/{class_id}/{student_id}-{uuid.uuid4().hex}.jpg"

        blob = storage_client.bucket(settings.student_faces_bucket).blob(file_key)
        blob.upload_from_string(image_bytes, content_type="image/jpeg")

        from google.cloud import vision

        vision_client = build_vision_client()
        response = vision_client.face_detection(image=vision.Image(content=image_bytes))
        if response.error.message:
            raise RuntimeError(f"Google Vision error: {response.error.message}")

        if not response.face_annotations:
            raise ValueError("No face detected in student image")

        vertices = [{"x": v.x, "y": v.y} for v in response.face_annotations[0].bounding_poly.vertices]
        face_crop = crop_face(image_bytes, {"vertices": vertices})
        embedding = build_face_embedding(face_crop)

        student_item = {
            "student_id": student_id,
            "name": name,
            "class_id": class_id,
            "face_id": student_id,
            "face_image_gcs_key": file_key,
            "embedding": embedding,
        }
        self.repository.put_student(student_item)
        return student_item
