from __future__ import annotations

import argparse
import csv
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List


# Allow running this script directly from backend/scripts.
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
SRC_DIR = BACKEND_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from repositories.attendance_repository import AttendanceRepository
from services.student_registration_service import StudentRegistrationService


TRUTHY = {"1", "true", "yes", "y"}


def _to_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in TRUTHY


def _load_csv_rows(path: Path) -> List[Dict[str, str]]:
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {path}")

    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _pick_register_image_by_student(
    face_rows: List[Dict[str, str]],
) -> Dict[str, Dict[str, str]]:
    by_student: Dict[str, Dict[str, str]] = {}
    for row in face_rows:
        student_id = (row.get("student_id") or "").strip()
        split = (row.get("split") or "").strip().lower()
        if not student_id or split != "register":
            continue

        # Keep first register image seen for each student.
        if student_id not in by_student:
            by_student[student_id] = row

    return by_student


def import_students_and_faces(
    students_csv: Path,
    faces_csv: Path,
    repo_root: Path,
) -> Dict[str, int]:
    students_rows = _load_csv_rows(students_csv)
    face_rows = _load_csv_rows(faces_csv)
    register_images = _pick_register_image_by_student(face_rows)

    service = StudentRegistrationService()

    stats = {
        "students_total": len(students_rows),
        "registered_ok": 0,
        "skipped_inactive": 0,
        "skipped_no_register_image": 0,
        "skipped_missing_file": 0,
        "failed": 0,
    }

    for row in students_rows:
        student_id = (row.get("student_id") or "").strip()
        name = (row.get("name") or "").strip()
        class_id = (row.get("class_id") or "").strip()
        is_active = _to_bool(row.get("is_active"), default=True)

        if not student_id or not name or not class_id:
            stats["failed"] += 1
            print(f"[STUDENT][FAIL] Missing required columns for row: {row}")
            continue

        if not is_active:
            stats["skipped_inactive"] += 1
            continue

        manifest = register_images.get(student_id)
        if not manifest:
            stats["skipped_no_register_image"] += 1
            print(f"[STUDENT][SKIP] No register image for {student_id}")
            continue

        image_path_text = (manifest.get("image_path") or "").strip()
        if not image_path_text:
            stats["failed"] += 1
            print(f"[STUDENT][FAIL] Empty image_path for {student_id}")
            continue

        image_path = Path(image_path_text)
        if not image_path.is_absolute():
            image_path = (repo_root / image_path).resolve()

        if not image_path.exists():
            stats["skipped_missing_file"] += 1
            print(f"[STUDENT][SKIP] Image file not found: {image_path}")
            continue

        try:
            image_bytes = image_path.read_bytes()
            service.register_student(student_id, name, class_id, image_bytes)
            stats["registered_ok"] += 1
            print(f"[STUDENT][OK] Registered {student_id} ({name})")
        except Exception as exc:  # noqa: BLE001 - continue batch import
            stats["failed"] += 1
            print(f"[STUDENT][FAIL] {student_id}: {exc}")

    return stats


def import_attendance_events(attendance_csv: Path, students_csv: Path) -> Dict[str, int]:
    attendance_rows = _load_csv_rows(attendance_csv)
    students_rows = _load_csv_rows(students_csv)
    student_name_by_id = {
        (r.get("student_id") or "").strip(): (r.get("name") or "").strip() for r in students_rows
    }

    grouped: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for row in attendance_rows:
        session_id = (row.get("session_id") or "").strip()
        if not session_id:
            continue
        grouped[session_id].append(row)

    attendance_repo = AttendanceRepository()

    stats = {
        "attendance_rows_total": len(attendance_rows),
        "sessions_total": len(grouped),
        "sessions_imported": 0,
        "sessions_failed": 0,
    }

    now_iso = datetime.now(timezone.utc).isoformat()

    for session_id, rows in grouped.items():
        class_id = (rows[0].get("class_id") or "").strip() or "unknown"
        session_date = (rows[0].get("session_date") or "").strip()

        recognized: List[Dict[str, Any]] = []
        for row in rows:
            student_id = (row.get("student_id") or "").strip()
            present = _to_bool(row.get("present"), default=False)
            if not student_id or not present:
                continue

            confidence_raw = (row.get("confidence") or "").strip()
            confidence = None
            if confidence_raw:
                try:
                    confidence = round(float(confidence_raw) * 100, 2) if float(confidence_raw) <= 1 else round(float(confidence_raw), 2)
                except ValueError:
                    confidence = None

            recognized.append(
                {
                    "student_id": student_id,
                    "name": student_name_by_id.get(student_id) or f"Student {student_id}",
                    "confidence": float(confidence if confidence is not None else 90.0),
                    "bounding_box": {
                        "left": 0.0,
                        "top": 0.0,
                        "width": 1.0,
                        "height": 1.0,
                    },
                }
            )

        created_at = now_iso
        if session_date:
            try:
                created_at = datetime.fromisoformat(session_date).replace(tzinfo=timezone.utc).isoformat()
            except ValueError:
                created_at = now_iso

        record = {
            "attendance_id": session_id,
            "class_id": class_id,
            "status": "COMPLETED",
            "image_key": f"synthetic/{class_id}/{session_id}.jpg",
            "created_at": created_at,
            "processed_at": now_iso,
            "present_count": len(recognized),
            "recognized": recognized,
            "unrecognized_faces": [],
        }

        try:
            attendance_repo.put_record(record)
            stats["sessions_imported"] += 1
            print(f"[ATTENDANCE][OK] Imported session {session_id} with {len(recognized)} present")
        except Exception as exc:  # noqa: BLE001 - continue batch import
            stats["sessions_failed"] += 1
            print(f"[ATTENDANCE][FAIL] {session_id}: {exc}")

    return stats


def parse_args() -> argparse.Namespace:
    repo_root_default = BACKEND_DIR.parent

    parser = argparse.ArgumentParser(
        description=(
            "Import unified CSV templates into backend data flow: "
            "register student faces and/or seed attendance records."
        )
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=repo_root_default,
        help="Repository root path (default: parent of backend folder).",
    )
    parser.add_argument(
        "--students-csv",
        type=Path,
        default=repo_root_default / "data" / "templates" / "students_master.sample.csv",
        help="Path to students_master CSV.",
    )
    parser.add_argument(
        "--faces-csv",
        type=Path,
        default=repo_root_default / "data" / "templates" / "face_images_manifest.sample.csv",
        help="Path to face_images_manifest CSV.",
    )
    parser.add_argument(
        "--attendance-csv",
        type=Path,
        default=repo_root_default / "data" / "templates" / "attendance_events.sample.csv",
        help="Path to attendance_events CSV.",
    )
    parser.add_argument(
        "--skip-student-registration",
        action="store_true",
        help="Skip student registration (face indexing).",
    )
    parser.add_argument(
        "--skip-attendance-import",
        action="store_true",
        help="Skip attendance record import.",
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    print("=== Unified CSV Import ===")
    print(f"repo_root       : {args.repo_root}")
    print(f"students_csv    : {args.students_csv}")
    print(f"faces_csv       : {args.faces_csv}")
    print(f"attendance_csv  : {args.attendance_csv}")
    print("--------------------------")

    if args.skip_student_registration and args.skip_attendance_import:
        print("Nothing to do: both import stages are skipped.")
        return 0

    if not args.skip_student_registration:
        student_stats = import_students_and_faces(
            students_csv=args.students_csv,
            faces_csv=args.faces_csv,
            repo_root=args.repo_root,
        )
        print("Student import stats:", student_stats)

    if not args.skip_attendance_import:
        attendance_stats = import_attendance_events(
            attendance_csv=args.attendance_csv,
            students_csv=args.students_csv,
        )
        print("Attendance import stats:", attendance_stats)

    print("=== Done ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
