from datetime import datetime, timezone
from typing import Dict, List, Optional

from config import (
    FIRESTORE_ATTENDANCE_COLLECTION,
    FIRESTORE_STUDENTS_COLLECTION,
    USE_GCP,
)

_firestore_client = None
_students_mem: Dict[str, Dict] = {}
_attendance_mem: Dict[str, Dict] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_firestore_client():
    global _firestore_client
    if not USE_GCP:
        return None
    if _firestore_client is not None:
        return _firestore_client

    try:
        from google.cloud import firestore

        _firestore_client = firestore.Client()
        return _firestore_client
    except Exception:
        return None


def _normalize_doc(payload: Dict) -> Dict:
    doc = dict(payload)
    if "embedding" in doc and isinstance(doc["embedding"], list):
        # Firestore accepts arrays of floats directly.
        doc["embedding"] = [float(x) for x in doc["embedding"]]
    return doc


def upsert_student(student: Dict) -> Dict:
    student = _normalize_doc(student)
    db = _safe_firestore_client()
    if db is None:
        _students_mem[student["student_id"]] = student
        return student

    db.collection(FIRESTORE_STUDENTS_COLLECTION).document(student["student_id"]).set(student)
    return student


def get_students_by_class(class_id: str) -> List[Dict]:
    db = _safe_firestore_client()
    if db is None:
        return [s for s in _students_mem.values() if s.get("class_id") == class_id]

    query = (
        db.collection(FIRESTORE_STUDENTS_COLLECTION)
        .where("class_id", "==", class_id)
        .stream()
    )
    return [doc.to_dict() for doc in query]


def get_student(student_id: str) -> Optional[Dict]:
    db = _safe_firestore_client()
    if db is None:
        return _students_mem.get(student_id)

    doc = db.collection(FIRESTORE_STUDENTS_COLLECTION).document(student_id).get()
    return doc.to_dict() if doc.exists else None


def create_attendance(record: Dict) -> Dict:
    record = _normalize_doc(record)
    db = _safe_firestore_client()
    if db is None:
        _attendance_mem[record["attendance_id"]] = record
        return record

    db.collection(FIRESTORE_ATTENDANCE_COLLECTION).document(record["attendance_id"]).set(record)
    return record


def update_attendance(attendance_id: str, patch: Dict) -> Optional[Dict]:
    db = _safe_firestore_client()
    if db is None:
        if attendance_id not in _attendance_mem:
            return None
        _attendance_mem[attendance_id].update(_normalize_doc(patch))
        return _attendance_mem[attendance_id]

    ref = db.collection(FIRESTORE_ATTENDANCE_COLLECTION).document(attendance_id)
    snapshot = ref.get()
    if not snapshot.exists:
        return None
    ref.update(_normalize_doc(patch))
    return ref.get().to_dict()


def get_attendance(attendance_id: str) -> Optional[Dict]:
    db = _safe_firestore_client()
    if db is None:
        return _attendance_mem.get(attendance_id)

    doc = db.collection(FIRESTORE_ATTENDANCE_COLLECTION).document(attendance_id).get()
    return doc.to_dict() if doc.exists else None


def get_attendance_by_class(class_id: str) -> List[Dict]:
    db = _safe_firestore_client()
    if db is None:
        records = [a for a in _attendance_mem.values() if a.get("class_id") == class_id]
        records.sort(key=lambda item: item.get("created_at", ""), reverse=True)
        return records

    query = (
        db.collection(FIRESTORE_ATTENDANCE_COLLECTION)
        .where("class_id", "==", class_id)
        .stream()
    )
    records = [doc.to_dict() for doc in query]
    records.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return records
