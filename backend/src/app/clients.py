import logging

from google.api_core.exceptions import Conflict
from google.cloud import firestore
from google.cloud import storage

from app.config import settings

LOGGER = logging.getLogger(__name__)

storage_client = storage.Client(project=settings.gcp_project_id)
firestore_client = firestore.Client(project=settings.gcp_project_id)


def ensure_bucket(bucket_name: str) -> storage.Bucket:
    bucket = storage_client.bucket(bucket_name)
    try:
        storage_client.get_bucket(bucket_name)
        return bucket
    except Exception:
        pass

    try:
        created = storage_client.create_bucket(bucket_name, location=settings.gcp_region)
        LOGGER.info("Created GCS bucket %s", bucket_name)
        return created
    except Conflict:
        LOGGER.info("Bucket %s already exists", bucket_name)
        return bucket
