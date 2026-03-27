import os
import json
import base64
import boto3
import uuid

s3 = boto3.client('s3')
rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')

STUDENTS_TABLE = os.environ.get('STUDENTS_TABLE')
STUDENT_FACES_BUCKET = os.environ.get('STUDENT_FACES_BUCKET')
COLLECTION_ID = os.environ.get('REKOGNITION_COLLECTION_ID')

# Initialize Rekognition collection if it doesn't exist
try:
    rekognition.create_collection(CollectionId=COLLECTION_ID)
except rekognition.exceptions.ResourceAlreadyExistsException:
    pass

def handler(event, context):
    try:
        student_id = event['pathParameters']['student_id']
        body = json.loads(event['body'])
        
        # Determine names and classes
        name = body.get('name', f'Student {student_id}')
        class_id = body.get('class_id', 'general')
        
        # Handle base64 image
        image_data = body.get('image')
        if not image_data:
            return {'statusCode': 400, 'body': 'Image required.'}
            
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
            
        img_bytes = base64.b64decode(image_data)
        file_key = f"{student_id}.jpg"
        
        # Upload to S3
        s3.put_object(
            Bucket=STUDENT_FACES_BUCKET,
            Key=file_key,
            Body=img_bytes,
            ContentType='image/jpeg'
        )
        
        # Index Face
        response = rekognition.index_faces(
            CollectionId=COLLECTION_ID,
            Image={'S3Object': {'Bucket': STUDENT_FACES_BUCKET, 'Name': file_key}},
            ExternalImageId=student_id,
            MaxFaces=1,
            QualityFilter="AUTO",
            DetectionAttributes=['ALL']
        )
        
        if not response['FaceRecords']:
            return {'statusCode': 400, 'body': 'No face detected in the image.'}
            
        face_id = response['FaceRecords'][0]['Face']['FaceId']
        
        # Save to DynamoDB
        table = dynamodb.Table(STUDENTS_TABLE)
        table.put_item(
            Item={
                'student_id': student_id,
                'name': name,
                'class_id': class_id,
                'face_id': face_id,
                's3_key': file_key
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'message': 'Student registered successfully', 'face_id': face_id})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
