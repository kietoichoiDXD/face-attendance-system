import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    students_table: str
    attendance_table: str
    classes_table: str
    student_faces_bucket: str
    class_uploads_bucket: str
    rekognition_collection_id: str
    aws_region: str
    vision_provider: str
    gcp_project_id: str
    gcp_service_account_json: str
    gcp_service_account_json_b64: str


settings = Settings(
    students_table=os.environ.get("STUDENTS_TABLE", "students-dev"),
    attendance_table=os.environ.get("ATTENDANCE_TABLE", "attendance-dev"),
    classes_table=os.environ.get("CLASSES_TABLE", "classes-dev"),
    student_faces_bucket=os.environ.get("STUDENT_FACES_BUCKET", "face-attendance-students-dev"),
    class_uploads_bucket=os.environ.get("CLASS_UPLOADS_BUCKET", "face-attendance-classes-dev"),
    rekognition_collection_id=os.environ.get("REKOGNITION_COLLECTION_ID", "face-attendance-collection"),
    aws_region=os.environ.get("AWS_REGION", "us-east-1"),
    vision_provider=os.environ.get("VISION_PROVIDER", "google"),
    gcp_project_id=os.environ.get("GCP_PROJECT_ID", ""),
    gcp_service_account_json=os.environ.get("GCP_SERVICE_ACCOUNT_JSON", ""),
    gcp_service_account_json_b64=os.environ.get("GCP_SERVICE_ACCOUNT_JSON_B64", ""),
)
