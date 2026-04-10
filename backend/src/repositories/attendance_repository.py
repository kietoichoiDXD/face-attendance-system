from datetime import datetime, timezone
from typing import Any, Dict, List

from app.clients import firestore_client
from app.config import settings


class AttendanceRepository:
    def __init__(self) -> None:
        self.collection = firestore_client.collection(settings.attendance_collection)

    def put_record(self, record: Dict[str, Any]) -> None:
        attendance_id = str(record["attendance_id"])
        self.collection.document(attendance_id).set(record)

    def get_record(self, attendance_id: str) -> Dict[str, Any] | None:
        doc = self.collection.document(attendance_id).get()
        if not doc.exists:
            return None
        return doc.to_dict()

    def list_records(self) -> List[Dict[str, Any]]:
        return [doc.to_dict() for doc in self.collection.stream()]

    def update_processing_result(self, attendance_id: str, payload: Dict[str, Any]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.collection.document(attendance_id).set(
            {
                "status": payload["status"],
                "processed_at": now,
                "recognized": payload.get("recognized", []),
                "unrecognized_faces": payload.get("unrecognized_faces", []),
                "present_count": payload.get("present_count", 0),
            },
            merge=True,
        )
