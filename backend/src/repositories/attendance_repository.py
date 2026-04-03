from datetime import datetime, timezone
from typing import Any, Dict, List

from app.clients import dynamodb
from app.config import settings


class AttendanceRepository:
    def __init__(self) -> None:
        self.table = dynamodb.Table(settings.attendance_table)

    def put_record(self, record: Dict[str, Any]) -> None:
        self.table.put_item(Item=record)

    def get_record(self, attendance_id: str) -> Dict[str, Any] | None:
        response = self.table.get_item(Key={"attendance_id": attendance_id})
        return response.get("Item")

    def list_records(self) -> List[Dict[str, Any]]:
        response = self.table.scan()
        return response.get("Items", [])

    def update_processing_result(self, attendance_id: str, payload: Dict[str, Any]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        self.table.update_item(
            Key={"attendance_id": attendance_id},
            UpdateExpression=(
                "SET #s = :status, processed_at = :processed_at, "
                "recognized = :recognized, unrecognized_faces = :unrecognized, "
                "present_count = :present_count"
            ),
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":status": payload["status"],
                ":processed_at": now,
                ":recognized": payload.get("recognized", []),
                ":unrecognized": payload.get("unrecognized_faces", []),
                ":present_count": payload.get("present_count", 0),
            },
        )
