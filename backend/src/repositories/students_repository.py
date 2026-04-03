from typing import Any, Dict, List

from app.clients import dynamodb
from app.config import settings


class StudentsRepository:
    def __init__(self) -> None:
        self.table = dynamodb.Table(settings.students_table)

    def put_student(self, item: Dict[str, Any]) -> None:
        self.table.put_item(Item=item)

    def get_all_students(self) -> List[Dict[str, Any]]:
        response = self.table.scan()
        return response.get("Items", [])
