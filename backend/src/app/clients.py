import logging

import boto3

from app.config import settings

LOGGER = logging.getLogger(__name__)

s3_client = boto3.client("s3", region_name=settings.aws_region)
rekognition_client = boto3.client("rekognition", region_name=settings.aws_region)
dynamodb = boto3.resource("dynamodb", region_name=settings.aws_region)


def ensure_rekognition_collection() -> None:
    try:
        rekognition_client.create_collection(CollectionId=settings.rekognition_collection_id)
        LOGGER.info("Created collection %s", settings.rekognition_collection_id)
    except rekognition_client.exceptions.ResourceAlreadyExistsException:
        LOGGER.info("Collection %s already exists", settings.rekognition_collection_id)
