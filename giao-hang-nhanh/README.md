# Giao Hàng Nhanh — Hệ thống quản lý vận chuyển

Nền tảng logistics và giao nhận hàng hóa xây dựng với kiến trúc **Frontend tĩnh (HTML/CSS/JS thuần)** kết hợp **Backend PHP + MySQL**. Hệ thống phục vụ ba nhóm người dùng: khách hàng, shipper và quản trị viên.

---

## Cấu trúc Thư mục

```
giao-hang-nhanh/
├── index.html                        # Trang chủ (Landing page)
├── dang-nhap.html                    # Trang đăng nhập khách hàng
├── dang-ky.html                      # Trang đăng ký khách hàng
├── tra-cuu-gia.html                  # Trang tra cứu bảng giá
├── tra-don-hang.html                 # Trang tra cứu đơn hàng
├── dat-lich-giao-hang-nhanh.html     # Trang đặt lịch giao hàng (trang bọc)
├── cam-nang.html                     # Danh sách cẩm nang
├── cam-nang-chi-tiet.html            # Chi tiết cẩm nang
├── huong-dan-dat-hang.html           # Hướng dẫn đặt hàng
├── chinh-sach-van-chuyen.html        # Chính sách vận chuyển
├── chinh-sach-bao-mat.html           # Chính sách bảo mật
├── dieu-khoan-su-dung.html           # Điều khoản sử dụng
├── README.md
├── config/
│   ├── db.php                        # Kết nối CSDL (dùng chung)
│   └── settings_helper.php           # Helper đọc cấu hình từ DB
├── includes/
│   ├── header.html                   # Header dùng chung (load qua shared-layout.js)
│   ├── footer.html                   # Footer dùng chung (load qua shared-layout.js)
│   ├── header_admin.php              # Header dành cho Admin
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
│   ├── public/                      # Giao diện standalone cho admin
│   └── database/giaohang.sql        # Schema CSDL
├── khach-hang-giaohang/
│   └── api/
│       ├── customer_portal.php      # API JSON cho portal khách hàng
│       ├── cancel_order_ajax.php    # API hủy đơn khách hàng
│       └── get_notifications_ajax.php # API thông báo khách hàng
├── nha-cung-cap-giaohang/
│   └── api/                         # Backend nha cung cap (se tach them theo tung buoc)
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
    │   │   └── pages/                # landing, auth, dashboard
    │   ├── js/
    │   │   ├── main.js               # Bootstrap loader — load dynamic modules
    │   │   ├── main-core.js          # Core utilities (tính phí, toast, field error)
    │   │   ├── shared-layout.js      # Inject header/footer, quản lý nav active
    │   │   ├── pricing-data.js       # Dữ liệu & logic tính cước (nội địa + quốc tế)
    │   │   ├── dat-lich.js           # Logic trang đặt lịch (bản đồ Leaflet)
    │   │   ├── service-catalog.js    # Danh mục dịch vụ
    │   │   ├── admin-stats.js        # Biểu đồ thống kê (Chart.js)
    │   │   └── modules/
    │   │       ├── main-navigation.js   # Điều hướng và mobile menu
    │   │       ├── main-forms.js        # Mount partial form đặt lịch vào host
    │   │       ├── main-landing.js      # Logic form tính cước trang chủ
    │   │       └── main-tracking.js     # Tra cứu & hủy đơn hàng
    │   ├── partials/
    │   │   └── bieu-mau/
    │   │       └── form-dat-lich-giao-hang.html # Partial form đặt lịch giao hàng
    │   └── images/
    ├── data/
    │   ├── pricing-data.json        # Dữ liệu bảng giá
    │   ├── form-dat-hang.json       # Cấu hình form đặt đơn
    │   └── du-lieu-bai-viet.json    # Dữ liệu bài viết
    ├── khach-hang/
    │   ├── dashboard.html           # Dashboard khách hàng (HTML + JS + API)
    │   ├── lich-su-don-hang.html    # Lịch sử đơn hàng khách
    │   ├── chi-tiet-don-hang.html   # Chi tiết đơn hàng khách theo 3 tab
    │   └── ho-so.html               # Hồ sơ khách hàng
    ├── nha-cung-cap/
    │   ├── dashboard.html           # Dashboard nhà cung cấp
    │   ├── don-hang.html            # Danh sách đơn của nhà cung cấp
    │   ├── chi-tiet-don-hang.html   # Chi tiết đơn của nhà cung cấp theo 3 tab
    │   └── ho-so.html               # Hồ sơ nhà cung cấp
    ├── cancel_order.php             # Xử lý hủy đơn
    ├── dat-lich-ajax.php            # API xử lý đặt lịch giao hàng
    ├── forgot_password_ajax.php     # API quên mật khẩu
    ├── inquiry_ajax.php             # API liên hệ
    ├── landing_data_ajax.php        # API dữ liệu landing
    ├── login.php                    # Xử lý đăng nhập server-side
    ├── login_ajax.php               # API đăng nhập
    ├── logout.php                   # Đăng xuất
    ├── notifications.php            # Trang thông báo
    ├── register.php                 # Xử lý đăng ký server-side
    ├── register_ajax.php            # API đăng ký
    ├── tracking.php                 # Tra cứu đơn (server-side)
    ├── tracking_ajax.php            # API tra cứu đơn
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
- Dashboard: `public/khach-hang/dashboard.html`
- Quản lý đơn: `public/khach-hang/lich-su-don-hang.html`, `public/khach-hang/chi-tiet-don-hang.html`
- Cập nhật hồ sơ tại `public/khach-hang/ho-so.html`
- Màn chi tiết đơn hiển thị theo 3 tab: thông tin đặt dịch vụ, thông tin nhà cung cấp, thông tin khách hàng

### 🚴 Shipper
- Dashboard riêng: `public/nha-cung-cap/dashboard.html`
- Quản lý đơn: `public/nha-cung-cap/don-hang.html`, `public/nha-cung-cap/chi-tiet-don-hang.html`
- Cập nhật hồ sơ: `public/nha-cung-cap/ho-so.html`
- Chi tiết đơn hiển thị theo 3 tab: thông tin đặt dịch vụ, thông tin khách hàng, thông tin của chính nhà cung cấp
- Upload ảnh/video báo cáo công việc trực tiếp từ giao diện website

### 🔧 Admin
- Thống kê tổng quan: `admin-giaohang/api/stats.php`
- Quản lý người dùng, đơn hàng, cài đặt hệ thống qua `admin-giaohang/api/*`
- Phê duyệt shipper mới

---

## Cơ chế kỹ thuật quan trọng

### JS Module System
`main.js` là **bootstrap loader** — tự động load tuần tự các module:
```
main-core.js → main-navigation.js → main-tracking.js → main-landing.js
```
Mỗi module có guard `if (window.__flag) return;` để tránh load lại.

### Dynamic Header/Footer
`shared-layout.js` dùng `XMLHttpRequest` đồng bộ để inject `includes/header.html` và `includes/footer.html` vào `#site-header` và `#site-footer`. Links được resolve tự động qua `data-layout-link` attribute tuỳ theo vị trí (root hay `/public/`).

### Form đặt lịch theo pattern biểu mẫu
`dat-lich-giao-hang-nhanh.html` hiện là **trang bọc**. Form thật được tách ra partial [form-dat-lich-giao-hang.html](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\partials\bieu-mau\form-dat-lich-giao-hang.html) và được mount bởi [main-forms.js](e:\Thực tập Keri\Task\GlobalCare\giao-hang-nhanh\public\assets\js\modules\main-forms.js).

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
| `inquiry_ajax.php` | Gửi thắc mắc liên hệ |
| `landing_data_ajax.php` | Dữ liệu động cho landing page |
| `forgot_password_ajax.php` | Đặt lại mật khẩu |
| `webhook_payment.php` | Webhook nhận thông báo thanh toán tự động |

