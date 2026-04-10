import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    gcp_project_id: str
    gcp_region: str
    students_collection: str
    attendance_collection: str
    classes_collection: str
    student_faces_bucket: str
    class_uploads_bucket: str
    vision_provider: str
    gcp_service_account_json: str
    gcp_service_account_json_b64: str
    match_similarity_threshold: float


settings = Settings(
    gcp_project_id=os.environ.get("GCP_PROJECT_ID", "bdien-muonmay"),
    gcp_region=os.environ.get("GCP_REGION", "us-central1"),
    students_collection=os.environ.get("STUDENTS_COLLECTION", "students"),
    attendance_collection=os.environ.get("ATTENDANCE_COLLECTION", "attendance"),
    classes_collection=os.environ.get("CLASSES_COLLECTION", "classes"),
    student_faces_bucket=os.environ.get("STUDENT_FACES_BUCKET", "bdien-muonmay-face-attendance-students"),
    class_uploads_bucket=os.environ.get("CLASS_UPLOADS_BUCKET", "bdien-muonmay-face-attendance-classes"),
    vision_provider=os.environ.get("VISION_PROVIDER", "google"),
    gcp_service_account_json=os.environ.get("GCP_SERVICE_ACCOUNT_JSON", ""),
    gcp_service_account_json_b64=os.environ.get("GCP_SERVICE_ACCOUNT_JSON_B64", ""),
    match_similarity_threshold=float(os.environ.get("MATCH_SIMILARITY_THRESHOLD", "0.88")),
)
