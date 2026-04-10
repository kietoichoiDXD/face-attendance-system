# Schema dữ liệu hợp nhất cho 3 nguồn dataset

Tài liệu này chuẩn hóa dữ liệu khi kết hợp 3 nhóm dataset:

1. Kaggle face-attendance (ảnh khuôn mặt phục vụ điểm danh)
2. LFW (bổ sung độ đa dạng khuôn mặt để kiểm thử)
3. Attendance dạng bảng (Hugging Face/Kaggle tabular cho analytics)

Mục tiêu: đưa toàn bộ dữ liệu về cùng chuẩn để dùng lại pipeline backend hiện tại (Firestore `students`, Firestore `attendance`, và analytics API).

## 1) Chuẩn dữ liệu gốc cần có

### 1.1 Bảng sinh viên hợp nhất: `students_master.csv`

Bắt buộc cột:

- `student_id`: ID duy nhất toàn hệ thống (ví dụ `SE001`)
- `name`: tên hiển thị
- `class_id`: mã lớp (ví dụ `CNTT-K44-A`)
- `source_dataset`: `kaggle_attendance` | `lfw` | `manual`
- `source_identity`: nhãn gốc từ dataset (tên thư mục, person_name, hoặc ID nguồn)
- `is_active`: `1` hoặc `0`

Khuyến nghị cột:

- `email`
- `note`

Mapping với backend hiện tại:

- Firestore `students` dùng trực tiếp các field: `student_id`, `name`, `class_id`
- `face_image_gcs_key`, `face_id`, `embedding` sẽ được sinh ra sau khi gọi API đăng ký khuôn mặt

### 1.2 Bảng ánh xạ ảnh khuôn mặt: `face_images_manifest.csv`

Bắt buộc cột:

- `student_id`: liên kết về `students_master.csv`
- `image_path`: đường dẫn file ảnh local hoặc URL tạm
- `split`: `register` | `probe` | `validation`
- `capture_type`: `portrait` | `group_crop`
- `source_dataset`: `kaggle_attendance` | `lfw`
- `quality_score`: số thực 0-1 (có thể để trống)

Quy ước dùng:

- `register`: ảnh dùng để đăng ký vào hệ thống (gọi API `POST /students/{student_id}/face`)
- `probe`: ảnh dùng để kiểm thử nhận diện
- `validation`: ảnh để đánh giá chất lượng hoặc benchmark

### 1.3 Bảng sự kiện điểm danh tổng hợp: `attendance_events.csv`

Bắt buộc cột:

- `session_id`: định danh buổi học (ví dụ `2026-04-10-CNTT-K44-A-P1`)
- `class_id`
- `session_date`: định dạng `YYYY-MM-DD`
- `student_id`
- `present`: `1` hoặc `0`
- `source_dataset`: `cloud_pipeline` | `tabular_external`

Khuyến nghị cột:

- `confidence`: xác suất nhận diện (nếu có)
- `checkin_time`: thời gian điểm danh
- `note`

Mapping với backend:

- Dữ liệu này có thể tổng hợp vào records của Firestore `attendance` để phục vụ dashboard/export.

## 2) Quy tắc hợp nhất 3 nguồn

1. Tạo ID chuẩn nội bộ
- Không dùng trực tiếp tên người từ dataset làm key chính.
- Luôn tạo `student_id` chuẩn nội bộ và lưu tên nguồn vào `source_identity`.

2. Chuẩn hóa lớp học
- Mọi mẫu đều phải có `class_id`.
- Với LFW (không có lớp), gán lớp giả lập như `LFW-DEMO-01`.

3. Tránh rò rỉ dữ liệu thật
- Nếu dataset có dữ liệu nhạy cảm, ẩn danh trước khi demo.

4. Không trộn mục đích dữ liệu
- Dữ liệu ảnh dùng cho recognition.
- Dữ liệu attendance dạng bảng dùng cho analytics.

## 3) Cấu trúc thư mục khuyến nghị

```text
data/
  raw/
    kaggle_attendance/
    lfw/
    tabular_attendance/
  processed/
    students_master.csv
    face_images_manifest.csv
    attendance_events.csv
```

## 4) Quy trình nạp dữ liệu gợi ý

1. Chuẩn hóa metadata
- Tạo `students_master.csv` từ ảnh đăng ký.
- Tạo `face_images_manifest.csv` map ảnh với từng `student_id`.

2. Đăng ký khuôn mặt
- Duyệt các dòng `split=register`.
- Gọi API đăng ký khuôn mặt cho từng `student_id`.

3. Chạy điểm danh thử
- Upload ảnh lớp hoặc ảnh crop (probe).
- Lấy kết quả từ API và ghi vào `attendance_events.csv`.

4. Bổ sung dữ liệu analytics
- Import attendance tabular vào cùng schema `attendance_events.csv`.
- Dùng chung để vẽ biểu đồ, tính tỉ lệ chuyên cần.

## 5) Data contract tối thiểu

Để hệ thống chạy ổn, mỗi sinh viên cần tối thiểu:

- 1 dòng trong `students_master.csv`
- 1 ảnh `register` trong `face_images_manifest.csv`

Mỗi buổi học cần tối thiểu:

- `class_id`
- `session_date`
- danh sách `student_id` với trạng thái `present`

## 6) Lưu ý chất lượng dữ liệu

- Ảnh `register` nên là ảnh rõ mặt, 1 người, ánh sáng đủ.
- Ảnh `probe` nên đa dạng góc nhìn để kiểm thử thực tế.
- Theo dõi tỉ lệ false positive/false negative theo từng lớp.

## 7) File mẫu đi kèm

- `data/templates/students_master.sample.csv`
- `data/templates/face_images_manifest.sample.csv`
- `data/templates/attendance_events.sample.csv`

Bạn có thể copy các file mẫu này, đổi đuôi thành dữ liệu thật, rồi dùng trong script import.

## 8) Script import tự động (đã có sẵn)

File script:

- `backend/scripts/import_unified_csv.py`

Chạy full 2 bước (đăng ký khuôn mặt + import attendance):

```powershell
cd backend
python scripts/import_unified_csv.py
```

Chỉ đăng ký khuôn mặt (bỏ qua attendance):

```powershell
cd backend
python scripts/import_unified_csv.py --skip-attendance-import
```

Chỉ import attendance từ CSV (bỏ qua đăng ký khuôn mặt):

```powershell
cd backend
python scripts/import_unified_csv.py --skip-student-registration
```

Trỏ đến file CSV riêng của bạn:

```powershell
cd backend
python scripts/import_unified_csv.py \
  --students-csv "D:/your-data/students_master.csv" \
  --faces-csv "D:/your-data/face_images_manifest.csv" \
  --attendance-csv "D:/your-data/attendance_events.csv"
```

Lưu ý môi trường:

- Cần cấu hình AWS credentials và các biến môi trường backend như khi chạy Lambda/service local.
- `image_path` trong `face_images_manifest.csv` có thể là đường dẫn tương đối tính từ repo root.

## 9) Tải/call dataset và chạy demo end-to-end

Từ thư mục `backend`:

1) Gọi dataset tabular từ Hugging Face (không cần credential):

```powershell
python scripts/fetch_demo_datasets.py --skip-kaggle
```

2) Tải dataset ảnh face từ Kaggle (cần Kaggle CLI + API key):

```powershell
pip install kaggle
python scripts/fetch_demo_datasets.py --skip-hf
```

3) Dựng bộ CSV hợp nhất từ ảnh đã tải:

```powershell
python scripts/build_demo_csv_from_images.py
```

4) Chạy import vào backend data flow:

```powershell
python scripts/import_unified_csv.py \
  --students-csv ../data/processed/demo/students_master.csv \
  --faces-csv ../data/processed/demo/face_images_manifest.csv \
  --attendance-csv ../data/processed/demo/attendance_events.csv
```

5) Hoặc chạy một lệnh orchestration:

```powershell
python scripts/run_demo_pipeline.py --skip-kaggle --skip-student-registration
```

Ghi chú:

- `fetch_demo_datasets.py` sẽ không dừng toàn bộ pipeline khi một nguồn dataset tạm thời không tải được.
- Nếu chưa có Kaggle credential, bạn vẫn có thể demo phần analytics bằng dữ liệu Hugging Face + attendance import.
