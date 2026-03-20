# Thợ Nhà

Nền tảng trung gian dịch vụ sửa chữa nhà tại TP.HCM: khách hàng đặt lịch, nhà cung cấp nhận đơn, admin quản lý toàn bộ hệ thống.

## Công nghệ

| Layer | Stack |
|-------|-------|
| Backend | PHP (REST API), MySQLi |
| Frontend | Bootstrap 5.3.2, Font Awesome 6.5.1, Inter |
| Map | Leaflet |
| Server | XAMPP (Apache + MySQL) |

---

## Cài đặt nhanh

```bash
# 1. Copy vào XAMPP
C:\xampp\htdocs\GlobalCare\tho-nha\

# 2. Import database
phpMyAdmin → Import → database/thonha_db.sql

# 3. Tạo file .env từ template
cp .env.example .env
```

**Tài khoản mặc định:**

| Role | Email | Mật khẩu |
|------|-------|----------|
| Admin | admin.thonha@gmail.com | 123456 |

**Truy cập:**

| Trang | URL |
|-------|-----|
| Trang chủ | `http://localhost/GlobalCare/tho-nha/` |
| Admin login | `http://localhost/GlobalCare/tho-nha/pages/admin/login.html` |
| Customer login | `http://localhost/GlobalCare/tho-nha/pages/customer/login.html` |
| Provider login | `http://localhost/GlobalCare/tho-nha/pages/provider/login.html` |

---

## Cấu trúc thư mục

```
tho-nha/
├── .env                          ← DB credentials (không commit git)
├── .env.example                  ← Template
├── .htaccess                     ← Block truy cập config/, core/, .env
├── index.php                     ← Redirect → pages/public/index.html
│
├── config/
│   ├── database.php              ← Kết nối DB (đọc từ .env)
│   ├── session.php               ← session_name('THONHA_SID')
│   └── constants.php             ← APP_ROOT, UPLOAD_DIR, STATUS_*
│
├── core/
│   ├── Response.php              ← json() / success() / error()
│   ├── Auth.php                  ← requireAdmin/Customer/Provider()
│   └── Validator.php             ← phone(), email(), sanitize()
│
├── pages/
│   ├── public/
│   │   ├── index.html            ← Trang chủ
│   │   ├── service-detail.php    ← Chi tiết dịch vụ (server-render)
│   │   ├── service-detail.html   ← Chi tiết dịch vụ (client-side)
│   │   ├── blog.html
│   │   ├── blog-detail.html
│   │   └── terms.html
│   ├── admin/
│   │   ├── login.html
│   │   └── dashboard.html        ← SPA admin panel
│   ├── customer/
│   │   ├── login.html
│   │   ├── register.html
│   │   └── dashboard.html
│   └── provider/
│       ├── login.html
│       ├── register.html
│       └── dashboard.html
│
├── api/
│   ├── public/                   ← Không yêu cầu đăng nhập
│   │   ├── book.php              ← POST tạo đơn
│   │   ├── get-services.php
│   │   ├── get-home-services.php
│   │   ├── get-categories.php
│   │   └── get-orders.php        ← GET tra cứu theo SĐT
│   ├── admin/
│   │   ├── auth/
│   │   │   ├── login.php
│   │   │   ├── logout.php
│   │   │   └── check-session.php
│   │   ├── orders/
│   │   │   ├── get-all.php
│   │   │   ├── update-status.php
│   │   │   ├── get-cancel-requests.php
│   │   │   └── process-cancel.php
│   │   ├── services/
│   │   │   └── manage.php        ← CRUD dịch vụ
│   │   └── providers/
│   │       └── manage.php        ← Duyệt nhà cung cấp
│   ├── customer/
│   │   ├── auth/
│   │   │   ├── login.php
│   │   │   ├── logout.php
│   │   │   ├── register.php
│   │   │   └── check-session.php
│   │   └── orders/
│   │       ├── get.php
│   │       └── request-cancel.php
│   └── provider/
│       ├── auth/
│       │   ├── login.php
│       │   ├── logout.php
│       │   ├── register.php
│       │   └── check-session.php
│       └── orders/
│           ├── get.php
│           └── update-status.php
│
├── assets/
│   ├── css/
│   │   ├── style.css             ← Styles trang public
│   │   └── admin-style.css       ← Styles admin panel
│   ├── images/                   ← Ảnh dịch vụ, logo, hero
│   │   └── blogs/
│   └── js/
│       ├── shared/
│       │   ├── load-header.js    ← Load header/footer partial
│       │   └── auth-nav.js       ← Cập nhật nav theo session
│       ├── public/
│       │   ├── main.js
│       │   ├── booking.js
│       │   ├── booking-autofill.js
│       │   ├── service-detail.js
│       │   ├── order-tracking.js
│       │   └── map-picker.js
│       └── admin/
│           ├── shell.js          ← SPA router admin
│           └── pages/            ← HTML + JS cho từng tab admin
│               ├── dashboard.html / dashboard.js
│               ├── orders.html / orders.js
│               ├── cancel-request.html / cancel-request.js
│               ├── services.html / services.js
│               └── providers.html / providers.js
│
├── partials/
│   ├── header.html
│   ├── footer.html
│   ├── booking-modal.html
│   └── booking-modal-detail.html
│
├── data/
│   ├── services.json             ← Fallback khi API lỗi
│   └── blog-data.json
│
├── uploads/
│   └── providers/                ← Avatar, CCCD nhà cung cấp
│
├── database/
│   └── thonha_db.sql
│
└── docs/
    └── huongdan.html
```

---

## Database — `thonha`

### Bảng `users`
- 3 role: `admin`, `customer`, `provider`
- 4 trạng thái: `active`, `pending`, `blocked`, `rejected`
- Provider có thêm: `company_name`, `address`, `description`, `avatar`, `cccd_front`, `cccd_back`, `rejection_reason`

### Bảng `bookings`
- Trạng thái: `new` → `confirmed` → `doing` → `done` / `cancel`
- Có `user_id` (khách đặt), `provider_id` (thợ nhận đơn)
- Có `selected_brand`, `estimated_price` cho luồng báo giá

### Bảng `cancel_requests`
- Yêu cầu hủy đơn từ khách hàng
- Trạng thái xử lý: `pending`, `approved`, `rejected`

### Bảng `service_categories` + `services`
- Phân cấp danh mục — dịch vụ
- Hỗ trợ `brand_prices` và `pricing_json` cho báo giá linh hoạt

---

## API endpoints

### Public (`api/public/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `book.php` | Tạo đơn đặt lịch |
| GET | `get-services.php` | Danh sách dịch vụ |
| GET | `get-home-services.php` | Dịch vụ nổi bật trang chủ |
| GET | `get-categories.php` | Danh mục dịch vụ |
| GET | `get-orders.php?phone=...` | Tra cứu đơn hàng |

### Customer (`api/customer/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `auth/register.php` | Đăng ký tài khoản |
| POST | `auth/login.php` | Đăng nhập |
| GET | `auth/logout.php` | Đăng xuất |
| GET | `auth/check-session.php` | Kiểm tra phiên |
| GET | `orders/get.php` | Lịch sử đơn hàng |
| POST | `orders/request-cancel.php` | Yêu cầu hủy đơn |

### Provider (`api/provider/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `auth/register.php` | Đăng ký (status: pending) |
| POST | `auth/login.php` | Đăng nhập |
| GET | `auth/logout.php` | Đăng xuất |
| GET | `auth/check-session.php` | Kiểm tra phiên |
| GET | `orders/get.php` | Đơn hàng được giao |
| POST | `orders/update-status.php` | Cập nhật trạng thái đơn |

### Admin (`api/admin/`)
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `auth/login.php` | Đăng nhập admin |
| GET | `auth/logout.php` | Đăng xuất |
| GET | `auth/check-session.php` | Kiểm tra phiên |
| GET | `orders/get-all.php` | Tất cả đơn hàng |
| POST | `orders/update-status.php` | Cập nhật trạng thái |
| GET | `orders/get-cancel-requests.php` | Yêu cầu hủy |
| POST | `orders/process-cancel.php` | Duyệt/từ chối hủy |
| GET/POST | `services/manage.php` | CRUD dịch vụ |
| GET/POST | `providers/manage.php` | Duyệt nhà cung cấp |

---

## Luồng nghiệp vụ

```
[Khách] Đặt lịch từ trang chủ / service-detail
    → api/public/book.php → bookings (status: new)

[Provider] Đăng ký
    → api/provider/auth/register.php (status: pending)
    → Admin duyệt → status: active → Provider đăng nhập được

[Admin] Quản lý đơn
    → Xác nhận → doing → Giao provider → done

[Khách] Yêu cầu hủy đơn
    → api/customer/orders/request-cancel.php → cancel_requests
    → Admin duyệt → booking status: cancel
```

---

## Lưu ý kỹ thuật

- Session được tách riêng qua `session_name('THONHA_SID')` trong `config/session.php`
- `pages/admin/dashboard.html` là SPA: tải tab từ `assets/js/admin/pages/*` bằng `fetch()`
- `assets/js/public/booking.js` có fallback đọc `data/services.json` nếu API lỗi
- `api/public/book.php` có nhánh fallback insert khi DB thiếu cột mới (migration an toàn)
- Provider bắt buộc qua xét duyệt admin trước khi đăng nhập được
- `config/database.php` đọc credentials từ `.env`, fallback về defaults nếu không có file
