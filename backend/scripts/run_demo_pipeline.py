from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent


def _run_step(command: list[str]) -> int:
    print("[RUN]", " ".join(command))
    proc = subprocess.run(command, cwd=str(BACKEND_DIR), check=False)
    print("[EXIT]", proc.returncode)
    return proc.returncode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run end-to-end demo pipeline for face attendance project."
    )
    parser.add_argument("--skip-kaggle", action="store_true")
    parser.add_argument("--skip-hf", action="store_true")
    parser.add_argument("--skip-build-csv", action="store_true")
    parser.add_argument("--skip-import", action="store_true")
    parser.add_argument(
        "--skip-student-registration",
        action="store_true",
        help="Pass through to import_unified_csv.py",
    )
    parser.add_argument(
        "--skip-attendance-import",
        action="store_true",
        help="Pass through to import_unified_csv.py",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.skip_kaggle or not args.skip_hf:
        cmd = [sys.executable, "scripts/fetch_demo_datasets.py"]
        if args.skip_kaggle:
            cmd.append("--skip-kaggle")
        if args.skip_hf:
            cmd.append("--skip-hf")
        _run_step(cmd)

    if not args.skip_build_csv:
        _run_step([sys.executable, "scripts/build_demo_csv_from_images.py"])

    if not args.skip_import:
        cmd = [
            sys.executable,
            "scripts/import_unified_csv.py",
            "--students-csv",
            str((BACKEND_DIR.parent / "data" / "processed" / "demo" / "students_master.csv")),
            "--faces-csv",
            str((BACKEND_DIR.parent / "data" / "processed" / "demo" / "face_images_manifest.csv")),
            "--attendance-csv",
            str((BACKEND_DIR.parent / "data" / "processed" / "demo" / "attendance_events.csv")),
        ]
        if args.skip_student_registration:
            cmd.append("--skip-student-registration")
        if args.skip_attendance_import:
            cmd.append("--skip-attendance-import")
        _run_step(cmd)

    print("Demo pipeline finished.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
