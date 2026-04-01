# Giao Hàng Nhanh

Trạng thái hiện tại của nhánh này đã chuyển sang hướng:

- Frontend tĩnh `HTML/CSS/JS`
- Dùng `KRUD` để lưu và đọc dữ liệu chính
- Giữ một phần `localStorage` để lưu session và làm fallback tạm thời

Không còn xem đây là hệ thống `PHP + MySQL` đầy đủ như README cũ nữa.

---

## Bảng KRUD đang dùng

| Mục đích | Tên bảng |
|---|---|
| Đơn đặt lịch giao hàng | `giaohangnhanh_dat_lich` |
| Tài khoản khách hàng | `giaohangnhanh_customers` |
| Tài khoản nhà cung cấp / shipper | `giaohangnhanh_shippers` |

Lưu ý:

- Tên bảng đang dùng dạng `_`, không dùng `-`
- Mã đơn để khách tra cứu là `ma_don_hang_noi_bo`
- `id` từ KRUD là `id` bản ghi, không dùng làm mã đơn hiển thị cho người dùng

---

## Tài khoản test

### Khách hàng

| ID | Họ tên | Email | Số điện thoại | Tài khoản | Mật khẩu | Ngày tạo |
|---|---|---|---|---|---|---|
| 1 | Test | `test@gmail.com` | `0901234567` | `0901234567` | `Aq123@cc` | tạo trong quá trình test |

### Nhà cung cấp / shipper

| ID | Họ tên | Email | Số điện thoại | CCCD | Phê duyệt | Mật khẩu |
|---|---|---|---|---|---|---|
| 1 | shipper01 | `shipper01@gmail.com` | `0901234568` | `001095000123` | Chưa phê duyệt | `Aq123@cc` |

### Admin tạm thời

| ID | Họ tên | Email | Số điện thoại | Tài khoản | Mật khẩu |
|---|---|---|---|---|---|
| 1 | Quan tri vien Giao Hang Nhanh | `admin01@giaohangnhanh.local` | `0901234569` | `admin01` | `Aq123@cc` |

Ghi chú:

- Đây là tài khoản test để kiểm tra luồng đăng ký / đăng nhập
- Nếu dữ liệu KRUD thay đổi, ID thực tế có thể khác
- Tài khoản admin ở trên đang là tài khoản JSON tạm, không đọc từ KRUD

---

## Chức năng đã nối KRUD

### 1. Đăng ký tài khoản

- File liên quan:
  - [dang-ky.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\dang-ky.html)
  - [local-auth.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\local-auth.js)
- Khách hàng đăng ký sẽ `insert` vào `giaohangnhanh_customers`
- Shipper đăng ký sẽ `insert` vào `giaohangnhanh_shippers`

### 2. Đăng nhập tài khoản

- File liên quan:
  - [dang-nhap.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\dang-nhap.html)
  - [local-auth.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\local-auth.js)
- Đăng nhập hiện đang `list` dữ liệu từ KRUD rồi đối chiếu:
  - số điện thoại
  - username
  - mật khẩu
- Sau khi đăng nhập thành công vẫn lưu `session` vào local để dashboard hiện tại chạy tiếp

### 3. Đặt lịch giao hàng

- File liên quan:
  - [dat-lich-giao-hang-nhanh.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\dat-lich-giao-hang-nhanh.html)
  - [dat-lich.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\dat-lich.js)
- Khi gửi đơn, hệ thống `insert` vào `giaohangnhanh_dat_lich`
- Mã đơn khách nhìn thấy là `ma_don_hang_noi_bo`

### 4. Test list KRUD

- File liên quan:
  - [test-krud-list.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\test-krud-list.html)
- Đang test được 3 bảng:
  - `giaohangnhanh_dat_lich`
  - `giaohangnhanh_customers`
  - `giaohangnhanh_shippers`

### 4.1. Đăng nhập admin tạm thời

- File liên quan:
  - [admin-giaohang/public/login.php](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\admin-giaohang\public\login.php)
- Tạm thời không dùng KRUD
- Đăng nhập bằng so sánh tài khoản JSON nội bộ ngay trong file login
- Sau khi đăng nhập thành công vẫn tạo PHP session để vào các trang admin cũ

### 4.2. Quản lý bảng giá admin

- File liên quan:
  - [admin-giaohang/public/admin_pricing.php](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\admin-giaohang\public\admin_pricing.php)
- Chạy theo kiểu `admin-only`
- Đọc và ghi trực tiếp file:
  - `public/data/pricing-data.json`
- Hiện đã làm được:
  - sửa giá 4 gói dịch vụ chính
  - thêm phụ phí loại hàng
  - sửa phụ phí loại hàng
  - xóa phụ phí loại hàng

### 5. Tra cứu đơn hàng

- File liên quan:
  - [tra-don-hang.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\tra-don-hang.html)
  - [main-tracking.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\modules\main-tracking.js)
- Đã tra cứu theo mã `ma_don_hang_noi_bo`
- Đã ưu tiên đọc từ KRUD, sau đó mới fallback local/mock
- Đã hiển thị:
  - đơn đặt
  - thanh toán
  - thông tin khách hàng
  - thông tin nhà cung cấp
  - lịch sử xử lý

### 6. Danh sách đơn hàng admin

- File liên quan:
  - [admin-giaohang/public/orders_manage.php](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\admin-giaohang\public\orders_manage.php)
- Chạy theo kiểu `admin-only`
- Đã đọc trực tiếp từ bảng KRUD:
  - `giaohangnhanh_dat_lich`
- Hiện đã có:
  - hiển thị danh sách đơn hàng
  - tìm kiếm theo mã đơn / tên / số điện thoại
  - lọc theo `từ ngày`
  - lọc theo `đến ngày`
  - lọc theo trạng thái
  - phân trang
  - mở chi tiết đơn qua `ma_don_hang_noi_bo`

---

## Chức năng đang tạm vô hiệu hóa

### 1. Kiểm tra shipper đã được duyệt mới cho đăng nhập

- Trong [local-auth.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\local-auth.js) đang bật:
  - `allowPendingShipperLogin = true`
- Nghĩa là:
  - shipper `is_approved = 0` vẫn đăng nhập được
- Đây là trạng thái tạm để test

### 2. Hiển thị mật khẩu plaintext trong trang test

- Không bật
- [test-krud-list.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\test-krud-list.html) chỉ hiển thị `Mat khau (an)`

---

## Chức năng chưa hoạt động hoàn chỉnh

### 1. Hủy đơn hàng theo KRUD

- Hiện tại trong [main-tracking.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\modules\main-tracking.js)
- Luồng hủy đơn vẫn đang cập nhật local/mock
- Chưa gọi `crud('update', 'giaohangnhanh_dat_lich', ...)`

### 2. Dashboard khách hàng đọc dữ liệu thật từ KRUD

- [dashboard.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\khach-hang\dashboard.html) chỉ là shell
- [customer-portal.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\customer-portal.js) vẫn còn nhiều logic local/mock
- Chưa chuyển hết sang `giaohangnhanh_dat_lich`

### 3. Portal nhà cung cấp / shipper đọc và cập nhật KRUD

- [shipper-portal.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\shipper-portal.js) vẫn chủ yếu dùng local/mock
- Chưa có luồng KRUD chuẩn cho:
  - nhận đơn
  - cập nhật tiến độ
  - cập nhật trạng thái đơn
  - ghi chú shipper

### 4. Admin mới theo KRUD

- Chưa có trang admin mới chính thức
- Luồng admin hiện tại đang đăng nhập bằng JSON tạm, chưa nối `giaohangnhanh_admins`
- Màn admin hiện tại vẫn là cụm PHP cũ chạy bằng session localhost

### 5. Dọn sạch fallback mock cũ

- Một số luồng trong portal/tracking vẫn còn fallback local/mock để không vỡ giao diện
- Cần dọn tiếp nếu muốn chạy `KRUD-only`

---

## Các file quan trọng cần biết

### Auth

- [dang-ky.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\dang-ky.html)
- [dang-nhap.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\dang-nhap.html)
- [local-auth.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\local-auth.js)
- [admin-giaohang/public/login.php](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\admin-giaohang\public\login.php)

### Đơn hàng

- [dat-lich-giao-hang-nhanh.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\dat-lich-giao-hang-nhanh.html)
- [dat-lich.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\dat-lich.js)
- [tra-don-hang.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\tra-don-hang.html)
- [main-tracking.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\modules\main-tracking.js)

### Portal

- [dashboard.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\khach-hang\dashboard.html)
- [customer-portal.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\customer-portal.js)
- [dashboard.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\nha-cung-cap\dashboard.html)
- [shipper-portal.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\shipper-portal.js)

### Admin

- [admin-giaohang/public/login.php](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\admin-giaohang\public\login.php)
- [admin-giaohang/public/orders_manage.php](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\admin-giaohang\public\orders_manage.php)
- [admin-giaohang/public/admin_pricing.php](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\admin-giaohang\public\admin_pricing.php)

### Test dữ liệu

- [test-krud-list.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\test-krud-list.html)

---

## Gợi ý thứ tự làm tiếp

1. Chuyển dashboard khách hàng sang đọc `giaohangnhanh_dat_lich`
2. Chuyển lịch sử đơn hàng khách hàng sang KRUD
3. Nối hủy đơn sang `update` KRUD
4. Chuyển portal nhà cung cấp sang KRUD
5. Nếu cần, làm tiếp màn admin đọc trực tiếp KRUD thay cho cụm PHP tạm thời
