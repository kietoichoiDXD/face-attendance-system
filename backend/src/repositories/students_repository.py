from typing import Any, Dict, List

from app.clients import firestore_client
from app.config import settings


class StudentsRepository:
    def __init__(self) -> None:
        self.collection = firestore_client.collection(settings.students_collection)

    def put_student(self, item: Dict[str, Any]) -> None:
        student_id = str(item["student_id"])
        self.collection.document(student_id).set(item)

    def get_all_students(self) -> List[Dict[str, Any]]:
        return [doc.to_dict() for doc in self.collection.stream()]

    def get_students_by_class(self, class_id: str) -> List[Dict[str, Any]]:
        query = self.collection.where("class_id", "==", class_id)
        return [doc.to_dict() for doc in query.stream()]

    def get_student(self, student_id: str) -> Dict[str, Any] | None:
        doc = self.collection.document(student_id).get()
        if not doc.exists:
            return None
        return doc.to_dict()
