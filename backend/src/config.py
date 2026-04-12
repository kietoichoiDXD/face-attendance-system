import os

PROJECT_ID = os.getenv("PROJECT_ID", "local-demo")
STUDENT_BUCKET = os.getenv("STUDENT_BUCKET", f"{PROJECT_ID}-face-attendance-students")
CLASS_BUCKET = os.getenv("CLASS_BUCKET", f"{PROJECT_ID}-face-attendance-classes")
SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.72"))
MAX_DETECTIONS = int(os.getenv("MAX_DETECTIONS", "50"))  # Increased for group photos
PORT = int(os.getenv("PORT", "8080"))

USE_GCP = os.getenv("USE_GCP", "true").lower() in {"1", "true", "yes"}
FIRESTORE_STUDENTS_COLLECTION = os.getenv("FIRESTORE_STUDENTS_COLLECTION", "students")
FIRESTORE_ATTENDANCE_COLLECTION = os.getenv("FIRESTORE_ATTENDANCE_COLLECTION", "attendance")
SIGNED_URL_EXPIRES_MINUTES = int(os.getenv("SIGNED_URL_EXPIRES_MINUTES", "15"))

# Multi-face detection parameters
MIN_FACE_SIZE = int(os.getenv("MIN_FACE_SIZE", "20"))  # Minimum face bbox size (px)
MAX_FACE_SIZE = int(os.getenv("MAX_FACE_SIZE", "300"))  # Maximum face bbox size (px)
FACE_OVERLAP_THRESHOLD = float(os.getenv("FACE_OVERLAP_THRESHOLD", "0.25"))  # IoU threshold for dedup
ENABLE_ADAPTIVE_THRESHOLD = os.getenv("ENABLE_ADAPTIVE_THRESHOLD", "true").lower() in {"1", "true", "yes"}

