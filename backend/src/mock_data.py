from datetime import datetime, timezone
from typing import Dict, List, Optional

students: Dict[str, Dict] = {}
attendance: Dict[str, Dict] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def upsert_student(student: Dict) -> Dict:
    students[student["student_id"]] = student
    return student


def get_students_by_class(class_id: str) -> List[Dict]:
    return [s for s in students.values() if s.get("class_id") == class_id]


def get_student(student_id: str) -> Optional[Dict]:
    return students.get(student_id)


def create_attendance(record: Dict) -> Dict:
    attendance[record["attendance_id"]] = record
    return record


def update_attendance(attendance_id: str, patch: Dict) -> Optional[Dict]:
    if attendance_id not in attendance:
        return None
    attendance[attendance_id].update(patch)
    return attendance[attendance_id]


def get_attendance(attendance_id: str) -> Optional[Dict]:
    return attendance.get(attendance_id)


def get_attendance_by_class(class_id: str) -> List[Dict]:
    records = [a for a in attendance.values() if a.get("class_id") == class_id]
    records.sort(key=lambda item: item.get("created_at", ""), reverse=True)
    return records
