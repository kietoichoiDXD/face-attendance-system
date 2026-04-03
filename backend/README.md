# Backend Boilerplate - Face Attendance (Serverless + Cloud AI)

Backend theo hướng production-ready cho ứng dụng điểm danh nhận diện khuôn mặt.

## Kiến trúc

- API Gateway + Lambda:
  - `POST /students/{student_id}/face`: đăng ký khuôn mặt sinh viên.
  - `POST /classes/{class_id}/attendance/upload-url`: lấy presigned URL để upload ảnh lớp.
  - `GET /attendance/{attendance_id}`: lấy kết quả xử lý điểm danh.
  - `GET /analytics`: thống kê dashboard.
  - `GET /attendance/export`: export CSV.
- S3 Event Trigger:
  - Upload ảnh lớp vào bucket `class-uploads` sẽ kích hoạt Lambda `processUploadedAttendance`.
- Cloud AI:
  - Dùng Google Cloud Vision để detect tất cả khuôn mặt trong ảnh lớp.
  - Dùng AWS Rekognition `CompareFaces` để map từng khuôn mặt với sinh viên đã đăng ký.
- Data store:
  - DynamoDB tables: `students`, `attendance`, `classes`.

## Cấu trúc mã nguồn

- `src/app`: config, clients, response helper.
- `src/services`: business logic cho registration và attendance.
- `src/repositories`: truy cập DynamoDB.
- `src/utils`: parser event và xử lý ảnh.
- `src/*.py`: lambda handlers.

## Luồng điểm danh bất đồng bộ khuyến nghị

1. Frontend gọi `POST /classes/{class_id}/attendance/upload-url`.
2. Frontend upload file JPEG trực tiếp lên URL đã ký (presigned URL).
3. S3 phát event `ObjectCreated` -> Lambda `processUploadedAttendance` chạy tự động.
4. Lambda gọi Google Vision để detect faces và so khớp với thư viện khuôn mặt đã đăng ký.
5. Kết quả lưu vào DynamoDB, frontend poll `GET /attendance/{attendance_id}`.

## Yêu cầu triển khai

1. AWS CLI + Serverless Framework.
2. Cài plugin python requirements:
   - `npm i -D serverless-python-requirements`
3. Cấu hình Google Cloud credentials cho Lambda runtime:
   - Khai báo biến môi trường GCP:
     - `GCP_PROJECT_ID=bdien-muonmay`
     - `GCP_SERVICE_ACCOUNT_JSON` hoặc `GCP_SERVICE_ACCOUNT_JSON_B64`
   - Backend hỗ trợ 2 cách auth:
     - Tự động dùng `GOOGLE_APPLICATION_CREDENTIALS` nếu có.
     - Hoặc parse service account JSON từ env var.
   - Service account cần quyền tối thiểu:
     - `roles/visionai.user` hoặc `roles/ml.developer`.
4. Deploy:
   - `serverless deploy`

## Kết nối GCP project và VM mặc định

Yêu cầu đề bài có tích hợp cloud AI (Google Cloud là một lựa chọn hợp lệ), vì vậy cần kết nối GCP để gọi Vision API.

### 1) Bật Vision API trong project bdien-muonmay

- https://console.cloud.google.com/apis/library/vision.googleapis.com?project=bdien-muonmay

### 2) Tạo service account cho Lambda

- Vào IAM > Service Accounts trong project `bdien-muonmay`.
- Tạo key JSON.
- Đặt vào env trước khi deploy:

```powershell
$env:GCP_PROJECT_ID="bdien-muonmay"
$env:GCP_SERVICE_ACCOUNT_JSON=(Get-Content .\gcp-sa.json -Raw)
```

Nếu cần base64:

```powershell
$raw = Get-Content .\gcp-sa.json -Raw
$bytes = [System.Text.Encoding]::UTF8.GetBytes($raw)
$env:GCP_SERVICE_ACCOUNT_JSON_B64 = [Convert]::ToBase64String($bytes)
```

### 3) Kết nối Compute Engine instance minhlakiet-20251229-065339

Link instance:
https://console.cloud.google.com/compute/instancesDetail/zones/us-central1-c/instances/minhlakiet-20251229-065339?hl=vi&project=bdien-muonmay

Từ máy local, kết nối bằng gcloud:

```powershell
gcloud auth login
gcloud config set project bdien-muonmay
gcloud compute ssh minhlakiet-20251229-065339 --zone us-central1-c --tunnel-through-iap
```

Nếu chỉ cần terminal nhanh, mở instance trên console rồi bấm nút SSH.

### 4) Dùng script mặc định cho instance mới

File script: `scripts/gcp-vm.ps1`

Ví dụ chạy trong thư mục `backend`:

```powershell
./scripts/gcp-vm.ps1 -Action describe
./scripts/gcp-vm.ps1 -Action troubleshoot
./scripts/gcp-vm.ps1 -Action ssh-batch
./scripts/gcp-vm.ps1 -Action ssh
```

Các giá trị mặc định đã bind sẵn:

- project: `bdien-muonmay`
- instance: `minhlakiet-20251229-065339`
- zone: `us-central1-c`

## Ghi chú

- Hệ thống không train model AI nội bộ.
- Vision chỉ dùng dịch vụ cloud managed.
- Endpoint `POST /classes/{class_id}/attendance` vẫn giữ để tương thích frontend cũ (xử lý sync).
