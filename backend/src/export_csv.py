import os
import csv
import io
import boto3

dynamodb = boto3.resource('dynamodb')
ATTENDANCE_TABLE = os.environ.get('ATTENDANCE_TABLE')

def handler(event, context):
    try:
        table = dynamodb.Table(ATTENDANCE_TABLE)
        response = table.scan()
        attendance_logs = response.get('Items', [])
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Attendance ID', 'Class ID', 'Date', 'Present count'])
        
        for log in attendance_logs:
            writer.writerow([
                log.get('attendance_id'),
                log.get('class_id'),
                log.get('date'),
                len(log.get('present_students', []))
            ])
            
        csv_content = output.getvalue()
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="attendance_report.csv"'
            },
            'body': csv_content
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': str(e)
        }
