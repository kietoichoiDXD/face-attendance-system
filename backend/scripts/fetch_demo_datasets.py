from __future__ import annotations

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
REPO_ROOT = BACKEND_DIR.parent
DATA_RAW_DIR = REPO_ROOT / "data" / "raw"

KAGGLE_TARGETS = [
    {
        "slug": "huzaifa10/face-recognition-attendance-system-using-svm",
        "target": DATA_RAW_DIR / "kaggle_attendance" / "face-recognition-attendance-system-using-svm",
    },
    {
        "slug": "ziya07/face-based-attendance-dataset",
        "target": DATA_RAW_DIR / "kaggle_attendance" / "face-based-attendance-dataset",
    },
    {
        "slug": "biswajitborgohain07/major-project-face-recognition-attendance-system",
        "target": DATA_RAW_DIR / "kaggle_attendance" / "major-project-face-recognition-attendance-system",
    },
    {
        "slug": "atulanandjha/lfwpeople",
        "target": DATA_RAW_DIR / "lfw" / "lfwpeople",
    },
]

HF_TABULAR_DATASETS = [
    "electricsheepafrica/student-attendance-patterns-africa",
    "electricsheepafrica/nigerian_education_student_attendance",
]


def _run_command(command: list[str], cwd: Path) -> tuple[int, str]:
    try:
        proc = subprocess.run(
            command,
            cwd=str(cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            check=False,
        )
        return proc.returncode, proc.stdout
    except FileNotFoundError:
        return 127, "Kaggle CLI not found. Install it with: pip install kaggle"


def download_kaggle_dataset(slug: str, target_dir: Path) -> bool:
    target_dir.mkdir(parents=True, exist_ok=True)
    code, output = _run_command(
        [
            sys.executable,
            "-m",
            "kaggle.cli",
            "datasets",
            "download",
            "-d",
            slug,
            "-p",
            str(target_dir),
            "--unzip",
        ],
        cwd=REPO_ROOT,
    )

    print(f"[KAGGLE] {slug}")
    print(output.strip())
    return code == 0


def fetch_hf_first_rows(dataset_id: str, limit: int = 100) -> list[dict[str, object]]:
    url = (
        "https://datasets-server.huggingface.co/first-rows"
        f"?dataset={dataset_id}&config=default&split=train"
    )
    req = Request(url, headers={"User-Agent": "face-attendance-demo-loader/1.0"})

    with urlopen(req, timeout=30) as response:  # noqa: S310 - trusted endpoint with fixed URL
        payload = json.loads(response.read().decode("utf-8"))

    rows = []
    for row in payload.get("rows", [])[:limit]:
        value = row.get("row", {})
        if isinstance(value, dict):
            rows.append(value)
    return rows


def save_rows_to_csv(rows: list[dict[str, object]], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if not rows:
        out_path.write_text("", encoding="utf-8")
        return

    headers: list[str] = []
    header_set: set[str] = set()
    for row in rows:
        for key in row.keys():
            if key not in header_set:
                headers.append(key)
                header_set.add(key)

    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def fetch_hf_tabular_preview(dataset_id: str) -> bool:
    out_name = dataset_id.replace("/", "__") + "__first_rows.csv"
    out_path = DATA_RAW_DIR / "tabular_attendance" / out_name

    try:
        rows = fetch_hf_first_rows(dataset_id)
        save_rows_to_csv(rows, out_path)
        print(f"[HF] Saved preview for {dataset_id} -> {out_path}")
        return True
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"[HF][FAIL] {dataset_id}: {exc}")
        return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download/call demo datasets for face attendance project (Kaggle + Hugging Face)."
    )
    parser.add_argument(
        "--skip-kaggle",
        action="store_true",
        help="Skip Kaggle dataset downloads.",
    )
    parser.add_argument(
        "--skip-hf",
        action="store_true",
        help="Skip Hugging Face dataset API preview calls.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    DATA_RAW_DIR.mkdir(parents=True, exist_ok=True)

    kaggle_ok = 0
    kaggle_fail = 0
    hf_ok = 0
    hf_fail = 0

    if not args.skip_kaggle:
        print("=== Kaggle dataset download ===")
        for item in KAGGLE_TARGETS:
            ok = download_kaggle_dataset(item["slug"], item["target"])
            if ok:
                kaggle_ok += 1
            else:
                kaggle_fail += 1

    if not args.skip_hf:
        print("=== Hugging Face tabular preview ===")
        for dataset_id in HF_TABULAR_DATASETS:
            ok = fetch_hf_tabular_preview(dataset_id)
            if ok:
                hf_ok += 1
            else:
                hf_fail += 1

    print("=== Summary ===")
    print(
        {
            "kaggle_ok": kaggle_ok,
            "kaggle_fail": kaggle_fail,
            "hf_ok": hf_ok,
            "hf_fail": hf_fail,
            "raw_data_dir": str(DATA_RAW_DIR),
        }
    )

    # Never fail hard: this script is used in demo setup where some sources may be unavailable.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
