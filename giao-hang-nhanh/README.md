# Giao Hàng Nhanh — Hệ thống quản lý vận chuyển

Nền tảng logistics và giao nhận hàng hóa xây dựng với kiến trúc **Frontend tĩnh (HTML/CSS/JS thuần)** kết hợp **Backend PHP + MySQL**. Hệ thống phục vụ ba nhóm người dùng: khách hàng, shipper và quản trị viên.

---

## Cấu trúc Thư mục

```
giao-hang-nhanh/
├── index.html                        # Trang chủ (Landing page)
├── README.md
├── config/
│   ├── db.php                        # Kết nối CSDL (dùng chung)
│   └── settings_helper.php           # Helper đọc cấu hình từ DB
├── includes/
│   ├── header.html                   # Header dùng chung (load qua shared-layout.js)
│   ├── footer.html                   # Footer dùng chung (load qua shared-layout.js)
│   ├── header_admin.php              # Header dành cho Admin
│   ├── header_user.php               # Header dành cho Customer
│   └── header_shipper.php            # Header dành cho Shipper
├── admin-giaohang/
│   ├── api/
│   │   ├── save_order.php           # API lưu đơn hàng (từ admin)
│   │   ├── stats.php                # API thống kê dashboard admin
│   │   ├── orders.php               # API danh sách đơn hàng admin
│   │   ├── users.php                # API quản lý người dùng admin
│   │   ├── settings.php             # API cài đặt hệ thống
│   │   ├── shipper_detail.php       # API chi tiết hiệu suất shipper
│   │   └── contacts.php             # API hòm thư liên hệ
│   ├── config/db.php                # DB config riêng cho admin module
│   └── database/giaohang.sql        # Schema CSDL
└── public/
    ├── assets/
    │   ├── css/
    │   │   ├── styles.css            # Entry point CSS (dùng @import)
    │   │   ├── admin.css             # Entry point CSS cho Admin
    │   │   ├── shipper.css           # CSS riêng Shipper
    │   │   ├── guide.css             # CSS trang hướng dẫn
    │   │   ├── pages/dat-lich.css    # CSS trang đặt lịch
    │   │   ├── base/                 # reset, typography, global
    │   │   ├── components/           # buttons, forms, modal, cards, ui-kit
    │   │   ├── layout/               # header, footer, navigation
    │   │   └── pages/               # landing, auth, dashboard
    │   ├── js/
    │   │   ├── main.js               # Bootstrap loader — load dynamic modules
    │   │   ├── main-core.js          # Core utilities (tính phí, toast, field error)
    │   │   ├── shared-layout.js      # Inject header/footer, quản lý nav active
    │   │   ├── shared-modals.js      # Modal hệ thống (booking, notifications)
    │   │   ├── pricing-data.js       # Dữ liệu & logic tính cước (nội địa + quốc tế)
    │   │   ├── dat-lich.js           # Logic trang đặt lịch (bản đồ Leaflet)
    │   │   ├── service-catalog.js    # Danh mục dịch vụ
    │   │   ├── admin-stats.js        # Biểu đồ thống kê (Chart.js)
    │   │   └── modules/
    │   │       ├── main-navigation.js   # Điều hướng và mobile menu
    │   │       ├── main-landing.js      # Logic form tính cước trang chủ
    │   │       ├── main-order.js        # Xử lý submit đơn hàng
    │   │       └── main-tracking.js     # Tra cứu & hủy đơn hàng
    │   ├── data/
    │   │   └── pricing-data.json     # Dữ liệu giá JSON tĩnh
    │   ├── images/
    │   └── partials/
    │       └── shared-modals.html    # HTML modal dùng chung
    ├── dat-lich-giao-hang-nhanh.html # Trang đặt lịch (Leaflet map)
    ├── tra-don-hang.html             # Trang tra cứu đơn hàng
    ├── tra-cuu-gia.html              # Trang tra cứu & tính cước phí
    ├── bai-viet.html                 # Danh sách bài viết
    ├── bai-viet-chi-tiet.html        # Chi tiết bài viết
    ├── huong-dan-dat-hang.html       # Hướng dẫn đặt hàng
    ├── chinh-sach-van-chuyen.html    # Chính sách vận chuyển
    ├── chinh-sach-bao-mat.html       # Chính sách bảo mật
    ├── dieu-khoan-su-dung.html       # Điều khoản sử dụng
    ├── login.html / register.html    # Đăng nhập / Đăng ký
    ├── dashboard.php                 # Dashboard khách hàng
    ├── order.php / order_detail.php  # Tạo & chi tiết đơn hàng
    ├── order_history.php             # Lịch sử đơn hàng
    ├── tracking.php                  # Tra cứu đơn (server-side)
    ├── dat-lich-ajax.php            # API xử lý đặt lịch giao hàng
    ├── shipper_dashboard.php         # Dashboard Shipper
    ├── shipper_order_detail.php      # Chi tiết đơn của Shipper
    ├── print_invoice.php             # In hóa đơn
    └── webhook_payment.php           # Webhook thanh toán ngân hàng
```

---

## Luồng hoạt động theo vai trò

### 👤 Khách vãng lai (Guest)
- Xem giới thiệu dịch vụ tại `index.html`
- Tra cứu cước phí tại `tra-cuu-gia.html`
- Tra cứu đơn hàng tại `tra-don-hang.html`
- Đặt lịch thử tại `dat-lich-giao-hang-nhanh.html`

### 🛒 Khách hàng (Customer)
- Đăng nhập → tạo đơn tại `dat-lich-giao-hang-nhanh.html`
- Quản lý đơn: `order_history.php`, `order_detail.php`
- Hủy đơn, in hóa đơn, cập nhật hồ sơ

### 🚴 Shipper
- Dashboard riêng: `shipper_dashboard.php`
- Nhận & cập nhật trạng thái đơn: `shipper_order_detail.php`
- Upload POD (hình ảnh bằng chứng giao hàng)

### 🔧 Admin
- Thống kê tổng quan: `admin-giaohang/api/stats.php`
- Quản lý người dùng, đơn hàng, cài đặt hệ thống qua `admin-giaohang/api/*`
- Phê duyệt shipper mới

---

## Cơ chế kỹ thuật quan trọng

### JS Module System
`main.js` là **bootstrap loader** — tự động load tuần tự các module:
```
main-core.js → main-navigation.js → main-order.js → main-tracking.js → main-landing.js
```
Mỗi module có guard `if (window.__flag) return;` để tránh load lại.

### Dynamic Header/Footer
`shared-layout.js` dùng `XMLHttpRequest` đồng bộ để inject `includes/header.html` và `includes/footer.html` vào `#site-header` và `#site-footer`. Links được resolve tự động qua `data-layout-link` attribute tuỳ theo vị trí (root hay `/public/`).

### CSS Architecture
Entry points: `styles.css` (trang public) và `admin.css` (trang admin). Cả hai dùng `@import` để gộp các module CSS con.

### Logic Tính Cước
Module `pricing-data.js` xuất các hàm:
- `calculateDomesticQuote(payload)` — tính cước nội địa theo km thực tế
- `calculateInternationalQuote(payload)` — tính cước quốc tế theo zone
- `buildDomesticPricingExplanation(payload, result)` — sinh giải thích chi tiết từng bước

Phí = Phí cơ bản + Phí cân nặng + Phụ phí loại hàng + Phí COD + Phí Bảo hiểm.

---

## API Endpoints (AJAX)

| Endpoint | Mô tả |
|---|---|
| `login_ajax.php` | Đăng nhập, tạo session |
| `register_ajax.php` | Đăng ký tài khoản |
| `tracking_ajax.php` | Tra cứu hành trình đơn hàng |
| `cancel_order_ajax.php` | Hủy đơn (chỉ trạng thái pending) |
| `inquiry_ajax.php` | Gửi thắc mắc liên hệ |
| `get_notifications_ajax.php` | Lấy danh sách thông báo |
| `landing_data_ajax.php` | Dữ liệu động cho landing page |
| `forgot_password_ajax.php` | Đặt lại mật khẩu |
| `webhook_payment.php` | Webhook nhận thông báo thanh toán tự động |
