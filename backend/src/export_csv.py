import csv
import io
from services.attendance_service import AttendanceService


service = AttendanceService()

def handler(event, context):
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Attendance ID', 'Class ID', 'Status', 'Created At', 'Processed At', 'Present count'])

        for row in service.export_rows():
            writer.writerow(row)

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
    except Exception as exc:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': str(exc)
        }
