# FastGo - Hệ thống quản lý vận chuyển

FastGo là dự án web logistics dùng PHP + MySQL, gồm landing page, đặt đơn, tra cứu vận đơn, dashboard cho khách hàng/shipper/admin và các công cụ quản trị.

## Tổng quan nhanh

- Frontend chính: `index.html` (landing + tính cước + mở modal đặt đơn).
- Backend xử lý: các trang/endpoint trong `public/*.php`.
- Dữ liệu giá và danh sách địa điểm: `public/assets/js/pricing-data.js`.
- Modal đặt đơn dùng chung: `public/assets/partials/shared-modals.html`.

## Cập nhật mới (đã áp dụng)

- Luồng đặt đơn:
  - Người dùng có thể mở form đặt đơn ngay cả khi chưa đăng nhập.
  - Chỉ khi bấm `Đặt lịch`/`Gửi yêu cầu`, hệ thống mới yêu cầu đăng nhập.
  - Sau đăng nhập có `redirect` quay lại trang trước (hỗ trợ mở lại modal đặt đơn).
- Form giao hàng:
  - Hỗ trợ nội địa và quốc tế (`intl_economy`, `intl_express`).
  - Tên gói quốc tế hiển thị: `Tiêu chuẩn quốc tế` và `Chuyển phát nhanh quốc tế`.
  - Đơn quốc tế bắt buộc chọn quốc gia nhận; COD tự ẩn và đưa về `0`.
- Form chuyển dọn:
  - Luồng thống nhất là `khảo sát trước - chốt đơn sau`.
  - Nút/confirm/thông báo thành công được đổi sang ngữ cảnh `Gửi yêu cầu khảo sát`.
  - Backend lưu thông tin khảo sát ban đầu vào `note` và đánh dấu `request_stage = survey_pending`.
- Phí vận chuyển dự kiến:
  - Cập nhật liên tục khi thay đổi thông số (dịch vụ, địa chỉ, cân nặng, kích thước, COD, quốc gia/tỉnh nhận quốc tế...).
- Đồng bộ danh sách địa điểm:
  - Danh sách tỉnh/thành, quận/huyện, quốc gia/tỉnh nhận được chuẩn hóa theo cùng nguồn `QUOTE_SHIPPING_DATA` để tránh trùng/lệch tên.
- Tracking:
  - Endpoint tra cứu trả JSON ổn định hơn khi lỗi (`tracking_ajax.php`).

## Tính năng theo vai trò

### 1) Guest

- Xem dịch vụ, FAQ, testimonial ở landing page.
- Tính cước nội địa/quốc tế (Quick Quote).
- Tra cứu hành trình vận đơn theo mã đơn.
- Mở modal đặt hàng/chuyển dọn từ trang chủ.

### 2) Customer

- Tạo đơn giao hàng trực tuyến.
- Theo dõi lịch sử đơn, xem chi tiết đơn, in phiếu gửi.
- Theo dõi timeline trạng thái đơn.
- Nhận thông báo và quản lý hồ sơ cá nhân.

### 3) Shipper

- Dashboard nhận đơn được phân công.
- Cập nhật trạng thái vận chuyển theo quy trình.
- Upload ảnh POD khi hoàn tất đơn.
- Quản lý hồ sơ shipper.

### 4) Admin

- Dashboard thống kê doanh thu/đơn hàng.
- Quản lý đơn hàng, người dùng, dịch vụ, FAQ, testimonial.
- Duyệt shipper mới, khóa/mở khóa tài khoản.
- Cấu hình thông tin hệ thống.

## Luồng đặt đơn hiện tại

### Giao hàng (`create-order-form`)

1. Mở modal từ `index.html` bằng `openBookingModal()`.
2. Nhập thông tin gửi/nhận, hàng hóa, thanh toán, hóa đơn.
3. Phí dự kiến tự tính realtime.
4. Bấm `Đặt lịch`:
   - Nếu chưa đăng nhập: hiển thị nút Đăng nhập/Đăng ký ngay trong thông báo của form.
   - Nếu đã đăng nhập: gửi dữ liệu sang `public/order.php`.

### Chuyển dọn (`create-order-form-moving`)

1. Chọn loại chuyển dọn (nhà/văn phòng/kho bãi).
2. Nhập thông tin khảo sát ban đầu (điểm đi/đến, số tầng, thang máy, khung giờ...).
3. Bấm `Gửi yêu cầu`, hệ thống ghi nhận `yêu cầu khảo sát` (chưa phải đơn chính thức).
4. Nhân viên liên hệ khảo sát thực tế, chốt phương án và xác nhận đơn chính thức sau khảo sát.

## Logic tính cước

- Có 2 lớp dữ liệu/công thức:
  - `SHIPPING_DATA`: cấu hình cơ bản.
  - `QUOTE_SHIPPING_DATA`: dữ liệu chi tiết nội địa/quốc tế + danh sách địa điểm.
- Nội địa:
  - Xác định vùng tuyến.
  - Tính theo gói dịch vụ + khối lượng tính cước (thực cân/thể tích) + phụ phí hàng hóa/COD/bảo hiểm.
- Quốc tế:
  - Xác định zone theo quốc gia nhận.
  - Tính cước theo service quốc tế + phụ phí nhiên liệu/an ninh/hải quan/bảo hiểm.

## Cấu trúc thư mục chính

```text
Web shipper/
├── index.html
├── README.md
├── config/
│   ├── db.php
│   └── settings_helper.php
├── database/
│   └── shipper_db.sql
├── includes/
│   ├── header.php / footer.php
│   └── header.html / footer.html
└── public/
    ├── assets/
    │   ├── css/
    │   ├── js/
    │   ├── images/
    │   └── partials/shared-modals.html
    ├── login.php / register.php / login_ajax.php / register_ajax.php
    ├── order.php / tracking_ajax.php / inquiry_ajax.php
    ├── dashboard.php / shipper_dashboard.php / admin_stats.php
    └── ...các trang quản trị và nghiệp vụ khác
```

## Hướng dẫn cài đặt local

1. Copy source vào `htdocs` (XAMPP) hoặc `www` (WAMP/Laragon).
2. Tạo DB `shipper_db`.
3. Import `database/shipper_db.sql`.
4. Cập nhật kết nối DB tại `config/db.php`.
5. Đảm bảo thư mục upload có quyền ghi nếu cần lưu ảnh POD.
6. Truy cập dự án qua localhost (ví dụ: `http://localhost/Web%20shipper/`).

## Endpoint AJAX thường dùng

- `public/login_ajax.php`: đăng nhập qua AJAX.
- `public/register_ajax.php`: đăng ký qua AJAX.
- `public/tracking_ajax.php`: tra cứu vận đơn.
- `public/inquiry_ajax.php`: gửi liên hệ.
- `public/landing_data_ajax.php`: dữ liệu động cho landing.
- `public/order.php`: tạo đơn giao hàng và ghi nhận yêu cầu khảo sát chuyển dọn.

## Ghi chú

- `login.php` và các file PHP backend vẫn cần giữ để xử lý xác thực/đơn hàng.
- `index.html` là điểm vào chính cho landing và booking modal.
