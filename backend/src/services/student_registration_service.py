from __future__ import annotations

import uuid
from typing import Any, Dict

from app.clients import ensure_rekognition_collection, rekognition_client, s3_client
from app.config import settings
from repositories.students_repository import StudentsRepository


class StudentRegistrationService:
    def __init__(self, repository: StudentsRepository | None = None) -> None:
        self.repository = repository or StudentsRepository()

    def register_student(self, student_id: str, name: str, class_id: str, image_bytes: bytes) -> Dict[str, Any]:
        ensure_rekognition_collection()
        file_key = f"students/{class_id}/{student_id}-{uuid.uuid4().hex}.jpg"

        s3_client.put_object(
            Bucket=settings.student_faces_bucket,
            Key=file_key,
            Body=image_bytes,
            ContentType="image/jpeg",
        )

        indexed = rekognition_client.index_faces(
            CollectionId=settings.rekognition_collection_id,
            Image={"S3Object": {"Bucket": settings.student_faces_bucket, "Name": file_key}},
            ExternalImageId=student_id,
            MaxFaces=1,
            QualityFilter="AUTO",
            DetectionAttributes=["DEFAULT"],
        )

        face_records = indexed.get("FaceRecords", [])
        if not face_records:
            raise ValueError("No face detected in student image")

        face_id = face_records[0]["Face"]["FaceId"]

        student_item = {
            "student_id": student_id,
            "name": name,
            "class_id": class_id,
            "face_id": face_id,
            "face_image_s3_key": file_key,
        }
        self.repository.put_student(student_item)
        return student_item
