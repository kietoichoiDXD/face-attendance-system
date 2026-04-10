# Bản đồ dataset của hệ thống điểm danh khuôn mặt

## Mục tiêu
Tài liệu này mô tả dataset nào đang được dùng trong sản phẩm, dùng để làm gì, và nhóm người dùng nào hưởng lợi trực tiếp.

## Tổng quan nhanh
Hệ thống không tự huấn luyện (train) mô hình AI nội bộ. Ứng dụng dùng dịch vụ AI managed trên cloud (Google Vision) để phát hiện khuôn mặt và so khớp embedding đã đăng ký.

## Mapping dataset -> công dụng -> người dùng

| Dataset | Nơi lưu trữ | Dùng để làm gì | Dùng cho ai |
|---|---|---|---|
| Hồ sơ sinh viên (`students`) | Firestore collection `students` | Lưu thông tin định danh sinh viên (mã SV, tên, lớp), liên kết đến ảnh khuôn mặt đã đăng ký và embedding | Quản trị viên, giảng viên, backend service |
| Ảnh khuôn mặt sinh viên (reference face images) | GCS bucket `student-faces` | Làm dữ liệu tham chiếu khi so sánh khuôn mặt trong ảnh điểm danh | Dịch vụ nhận diện (Google Vision + matching service), backend service |
| Vector đặc trưng khuôn mặt (face embedding) | Firestore `students.embedding` | Lưu vector embedding đã trích xuất từ ảnh đăng ký để hỗ trợ nhận diện nhanh | Dịch vụ matching nội bộ, backend service |
| Ảnh lớp học upload (attendance photos) | GCS bucket `class-uploads` | Ảnh chụp tập thể lớp để hệ thống phát hiện khuôn mặt và đối sánh | Giảng viên (upload), serverless function xử lý điểm danh |
| Kết quả điểm danh (`attendance`) | Firestore collection `attendance` | Lưu trạng thái xử lý, danh sách sinh viên nhận diện được, số lượng có mặt, khung bao khuôn mặt | Giảng viên, dashboard analytics, chức năng export CSV |
| Dữ liệu tổng hợp/analytics | Tính từ bảng `attendance` + `students` | Tính tổng SV, tỉ lệ điểm danh, dữ liệu biểu đồ theo ngày/lớp | Giảng viên, quản trị, dashboard frontend |
| Dữ liệu xuất báo cáo CSV | Sinh động từ records `attendance` | Xuất báo cáo điểm danh để nộp/đối soát | Giảng viên, phòng đào tạo |

## Luồng dữ liệu theo nghiệp vụ

1. Đăng ký sinh viên
- Người dùng nhập thông tin sinh viên + ảnh chân dung.
- Ảnh lưu vào GCS (`student-faces`), embedding khuôn mặt được tính và lưu trong Firestore.
- Metadata sinh viên lưu vào collection `students`.

2. Điểm danh bằng ảnh lớp
- Giảng viên upload ảnh lớp vào GCS (`class-uploads`) qua signed URL.
- Cloud Storage trigger function xử lý điểm danh.
- Lambda gọi Google Vision để detect khuôn mặt trong ảnh lớp.
- Từng khuôn mặt được crop và so sánh cosine similarity với embedding sinh viên đã đăng ký.
- Kết quả ghi vào collection `attendance`.

3. Xem dashboard và xuất báo cáo
- Frontend gọi API analytics để lấy số liệu từ `attendance` và `students`.
- Người dùng có thể export CSV từ dữ liệu điểm danh đã lưu.

## Gợi ý phân quyền truy cập dataset

- Giảng viên:
  - Được upload ảnh lớp và xem kết quả điểm danh của lớp phụ trách.
- Quản trị viên/phòng đào tạo:
  - Quản lý hồ sơ sinh viên, cấu hình lớp, xem báo cáo tổng hợp.
- Dịch vụ backend/Lambda:
  - Có quyền đọc/ghi vào S3, DynamoDB và gọi dịch vụ AI cloud.
- Người học (sinh viên):
  - Chỉ nên có quyền xem thông tin điểm danh cá nhân (nếu hệ thống có cổng sinh viên).

## Lưu ý bảo mật và tuân thủ dữ liệu sinh trắc

- Mã hóa dữ liệu ở trạng thái lưu trữ (GCS, Firestore).
- Hạn chế truy cập ảnh gốc khuôn mặt theo nguyên tắc least privilege.
- Gắn vòng đời dữ liệu (retention policy) cho ảnh lớp để giảm rủi ro lộ dữ liệu.
- Ghi log truy cập và thao tác với dữ liệu khuôn mặt.
- Thông báo minh bạch cho sinh viên về mục đích xử lý dữ liệu sinh trắc học.
