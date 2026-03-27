import os
import json
import boto3

dynamodb = boto3.resource('dynamodb')
ATTENDANCE_TABLE = os.environ.get('ATTENDANCE_TABLE')
STUDENTS_TABLE = os.environ.get('STUDENTS_TABLE')
CLASSES_TABLE = os.environ.get('CLASSES_TABLE')

def handler(event, context):
    try:
        # Fetching all attendance records to calculate rate
        table = dynamodb.Table(ATTENDANCE_TABLE)
        response = table.scan()
        attendance_logs = response.get('Items', [])
        
        # Calculate mock or rudimentary statistics for the dashboard
        total_sessions = len(attendance_logs)
        total_present = sum(len(log.get('present_students', [])) for log in attendance_logs)
        
        # Format response expected by Recharts on frontend
        chart_data = []
        for log in attendance_logs:
            chart_data.append({
                "date": log['date'][:10],
                "present": len(log.get('present_students', [])),
                "class_id": log.get('class_id')
            })
            
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({
                'total_sessions': total_sessions,
                'total_present_all_time': total_present,
                'chart_data': chart_data
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
