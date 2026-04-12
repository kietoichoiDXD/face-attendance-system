from __future__ import annotations

import argparse
import csv
import random
from pathlib import Path
from typing import Iterable


SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def iter_images(root: Path) -> Iterable[Path]:
    if not root.exists():
        return []
    return (p for p in root.rglob("*") if p.is_file() and p.suffix.lower() in IMAGE_EXTS)


def identity_from_path(path: Path, dataset_root: Path) -> str:
    rel = path.relative_to(dataset_root)
    if len(rel.parts) >= 2:
        return rel.parts[-2]
    return rel.stem


def write_csv(path: Path, rows: list[dict[str, str]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build unified demo CSV files from downloaded image datasets."
    )
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=REPO_ROOT,
        help="Repository root path.",
    )
    parser.add_argument(
        "--kaggle-root",
        type=Path,
        default=REPO_ROOT / "data" / "raw" / "kaggle_attendance",
        help="Root folder for Kaggle face datasets.",
    )
    parser.add_argument(
        "--lfw-root",
        type=Path,
        default=REPO_ROOT / "data" / "raw" / "lfw",
        help="Root folder for LFW datasets.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=REPO_ROOT / "data" / "processed" / "demo",
        help="Output directory for generated CSV files.",
    )
    parser.add_argument(
        "--max-identities-per-source",
        type=int,
        default=20,
        help="Max identities per source to include in demo.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    random.seed(42)

    students: list[dict[str, str]] = []
    faces: list[dict[str, str]] = []
    attendance: list[dict[str, str]] = []

    sources = [
        {
            "source_key": "kaggle_attendance",
            "root": args.kaggle_root,
            "class_id": "KAGGLE-DEMO-01",
            "prefix": "KG",
        },
        {
            "source_key": "lfw",
            "root": args.lfw_root,
            "class_id": "LFW-DEMO-01",
            "prefix": "LF",
        },
    ]

    seq = 1
    for source in sources:
        root: Path = source["root"]
        if not root.exists():
            continue

        buckets: dict[str, list[Path]] = {}
        for image_path in iter_images(root):
            identity = identity_from_path(image_path, root)
            buckets.setdefault(identity, []).append(image_path)

        identity_names = sorted(buckets.keys())[: max(0, args.max_identities_per_source)]
        for identity in identity_names:
            student_id = f"{source['prefix']}{seq:04d}"
            seq += 1
            class_id = source["class_id"]

            students.append(
                {
                    "student_id": student_id,
                    "name": identity.replace("_", " "),
                    "class_id": class_id,
                    "source_dataset": source["source_key"],
                    "source_identity": identity,
                    "is_active": "1",
                    "email": "",
                    "note": "auto-generated",
                }
            )

            imgs = sorted(buckets[identity])
            if not imgs:
                continue

            register_img = imgs[0]
            faces.append(
                {
                    "student_id": student_id,
                    "image_path": str(register_img.relative_to(args.repo_root)).replace("\\", "/"),
                    "split": "register",
                    "capture_type": "portrait",
                    "source_dataset": source["source_key"],
                    "quality_score": "0.90",
                }
            )

            for probe_img in imgs[1:3]:
                faces.append(
                    {
                        "student_id": student_id,
                        "image_path": str(probe_img.relative_to(args.repo_root)).replace("\\", "/"),
                        "split": "probe",
                        "capture_type": "group_crop",
                        "source_dataset": source["source_key"],
                        "quality_score": "0.80",
                    }
                )

    session_specs = [
        ("2026-04-10", "P1"),
        ("2026-04-11", "P1"),
    ]

    by_class: dict[str, list[str]] = {}
    for s in students:
        by_class.setdefault(s["class_id"], []).append(s["student_id"])

    for class_id, student_ids in by_class.items():
        for session_date, period in session_specs:
            session_id = f"{session_date}-{class_id}-{period}"
            for sid in student_ids:
                present = "1" if random.random() > 0.2 else "0"
                conf = "0.93" if present == "1" else ""
                attendance.append(
                    {
                        "session_id": session_id,
                        "class_id": class_id,
                        "session_date": session_date,
                        "student_id": sid,
                        "present": present,
                        "source_dataset": "tabular_external",
                        "confidence": conf,
                        "checkin_time": f"{session_date}T07:00:00Z" if present == "1" else "",
                        "note": "auto-generated demo row",
                    }
                )

    out_dir = args.output_dir
    write_csv(
        out_dir / "students_master.csv",
        students,
        [
            "student_id",
            "name",
            "class_id",
            "source_dataset",
            "source_identity",
            "is_active",
            "email",
            "note",
        ],
    )
    write_csv(
        out_dir / "face_images_manifest.csv",
        faces,
        [
            "student_id",
            "image_path",
            "split",
            "capture_type",
            "source_dataset",
            "quality_score",
        ],
    )
    write_csv(
        out_dir / "attendance_events.csv",
        attendance,
        [
            "session_id",
            "class_id",
            "session_date",
            "student_id",
            "present",
            "source_dataset",
            "confidence",
            "checkin_time",
            "note",
        ],
    )

    print(
        {
            "students": len(students),
            "face_rows": len(faces),
            "attendance_rows": len(attendance),
            "output_dir": str(out_dir),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
