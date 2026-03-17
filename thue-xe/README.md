# Thuê Xe — Tài liệu dự án

Nền tảng trung gian cho thuê xe: khách hàng đặt xe, nhà cung cấp nhận đơn, admin quản lý.

## Công nghệ
- **Backend:** PHP (MVC pattern), MySQL (PDO)
- **Frontend:** Bootstrap 5.3.0, Font Awesome 6.4.0, Poppins font
- **Server:** XAMPP (Apache + MySQL)

## Tài khoản mặc định
| Role | Email | Mật khẩu |
|------|-------|-----------|
| Admin | admin@carrental.com | admin123 |

## Cài đặt
1. Copy thư mục vào `C:\xampp\htdocs\GlobalCare\thue-xe\`
2. Import `database.sql` vào phpMyAdmin (tự tạo DB `car_rental`)
3. Truy cập: `http://localhost/GlobalCare/thue-xe/`

---

## Cấu trúc thư mục

```
thue-xe/
│
├── index.php                   # Router chính — đọc ?page= và readfile view tương ứng
├── index.html                  # Trang chủ standalone (GitHub Pages, không cần PHP)
├── car-detail.html             # Chi tiết xe standalone (GitHub Pages)
├── blog.html                   # Trang blog
├── blog-detail.html            # Chi tiết bài viết
├── terms.html                  # Điều khoản sử dụng
├── huong-dan.html              # Hướng dẫn sử dụng
├── database.sql                # Schema đầy đủ — import để tạo mới DB
├── database_accounts.sql       # (Đã tích hợp vào database.sql, không cần dùng)
│
├── customer-login.html         # Đăng nhập khách hàng
├── customer-register.html      # Đăng ký khách hàng
├── provider-login.html         # Đăng nhập nhà cung cấp
├── provider-register.html      # Đăng ký nhà cung cấp (status=pending, chờ admin duyệt)
│
├── admin/
│   └── index.php               # Admin SPA: login + dashboard trong 1 file PHP
│
├── config/
│   └── database.php            # Kết nối MySQL (PDO), DB: car_rental
│
├── controllers/                # Xử lý logic — nhận request, trả JSON
│   ├── booking-controller.php      # Tạo đơn đặt xe
│   ├── car-controller.php          # Lấy danh sách / chi tiết xe
│   ├── service-controller.php      # Lấy dịch vụ addon
│   ├── contact-controller.php      # Gửi liên hệ
│   ├── admin/
│   │   ├── auth-controller.php         # Đăng nhập / đăng xuất admin
│   │   ├── bookig-admin-controller.php # Quản lý đơn (CRUD)
│   │   └── car-addmin-controller.php   # Quản lý xe (CRUD)
│   ├── customer/
│   │   └── auth-controller.php         # Đăng ký / đăng nhập / logout khách hàng
│   └── provider/
│       └── auth-controller.php         # Đăng ký / đăng nhập / logout nhà cung cấp
│
├── models/                     # Tương tác database (PDO)
│   ├── base-model.php          # Base class dùng chung
│   ├── admin.php               # Model admin
│   ├── booking.php             # Model đơn đặt xe
│   ├── car.php                 # Model xe
│   └── service.php             # Model dịch vụ addon
│
├── views/
│   ├── layouts/
│   │   ├── header.html         # Header chung (inject bằng load-template.js)
│   │   └── footer.html         # Footer chung
│   ├── pages/                  # Nội dung từng trang (readfile bởi index.php)
│   │   ├── home.html           # Trang chủ
│   │   ├── car-detail.html     # Chi tiết xe + form đặt xe
│   │   ├── search.html         # Tìm kiếm / lọc xe
│   │   ├── services.html       # Dịch vụ addon
│   │   ├── booking-success.html# Xác nhận đặt xe thành công
│   │   ├── track-order.html    # Tra cứu đơn hàng
│   │   ├── contact.html        # Liên hệ
│   │   ├── about.html          # Giới thiệu
│   │   ├── guide.html          # Hướng dẫn
│   │   └── terms.html          # Điều khoản
│   └── partials/
│       └── booking-modal.html  # Modal đặt xe (dùng chung)
│
├── assets/
│   ├── css/
│   │   └── style.css           # CSS toàn bộ website (Bootstrap + custom)
│   ├── js/
│   │   ├── load-template.js    # Inject header/footer, SEO meta tags
│   │   ├── api.js              # Mọi API call — có try/catch fallback về static-data.js
│   │   ├── static-data.js      # Dữ liệu tĩnh dự phòng (11 xe, 4 dịch vụ, filterOptions)
│   │   ├── main.js             # JS khởi tạo chung
│   │   ├── utils.js            # Helper functions
│   │   ├── map-picker.js       # Chọn địa điểm trên bản đồ
│   │   └── pages/              # JS riêng cho từng trang
│   │       ├── home.js             # Logic trang chủ (xe nổi bật, dịch vụ)
│   │       ├── car-detail.js       # Load chi tiết xe, cập nhật SEO, xử lý đặt xe
│   │       ├── search.js           # Lọc / sắp xếp xe
│   │       ├── services.js         # Dịch vụ addon
│   │       ├── contact.js          # Form liên hệ
│   │       └── booking-success.js  # Trang xác nhận đặt xe
│   ├── images/
│   │   ├── logo.png
│   │   ├── about.png
│   │   ├── cars/               # Ảnh xe: camry, city, crv, cx5, mazda3, ...
│   │   ├── blogs/              # Ảnh bài viết blog (1.jpg → 30.jpg)
│   │   └── guide/              # Ảnh hướng dẫn sử dụng
│   └── data/
│       ├── static-data.json    # Dữ liệu xe/dịch vụ dạng JSON (dự phòng)
│       └── blog-data.json      # Dữ liệu bài viết blog
```

---

## Database — `car_rental`

### Bảng `users`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT | PK |
| full_name | VARCHAR(255) | Họ tên |
| email | VARCHAR(255) | UNIQUE — dùng để đăng nhập |
| phone | VARCHAR(20) | Số điện thoại |
| password | VARCHAR(255) | Bcrypt hash |
| role | ENUM | `admin` / `customer` / `provider` |
| status | ENUM | `active` / `blocked` / `pending` / `rejected` |
| company_name | VARCHAR(255) | Tên công ty (chỉ provider) |
| license_number | VARCHAR(100) | Số GPKD / GPXE (chỉ provider) |
| address | TEXT | Địa chỉ (chỉ provider) |
| description | TEXT | Mô tả dịch vụ (chỉ provider) |

**Logic status theo role:**
- `admin / customer`: `active` = hoạt động, `blocked` = bị khóa
- `provider`: `pending` = chờ duyệt, `active` = đã duyệt, `rejected` = từ chối, `blocked` = bị khóa

### Bảng `bookings`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT | PK |
| user_id | INT | FK → users (khách hàng) |
| provider_id | INT | FK → users (nhà cung cấp nhận đơn) |
| car_id | INT | ID xe (khớp với static-data.js) |
| car_name | VARCHAR | Tên xe |
| customer_name / email / phone / address | — | Thông tin liên hệ |
| pickup_date / return_date | DATE | Ngày nhận / trả xe |
| total_days / total_price | INT / DECIMAL | Số ngày, tổng tiền |
| addon_services | TEXT | JSON array tên dịch vụ addon |
| addon_total | DECIMAL | Tổng tiền addon |
| status | ENUM | `pending` / `confirmed` / `completed` / `cancelled` |

### Bảng `contacts`
Lưu tin nhắn liên hệ từ form website.

---

## Luồng dữ liệu

```
Khách hàng
  └─ customer-login.html / customer-register.html
       └─ controllers/customer/auth-controller.php → users (role=customer)

Nhà cung cấp
  └─ provider-login.html / provider-register.html
       └─ controllers/provider/auth-controller.php → users (role=provider, status=pending)

Admin
  └─ admin/index.php (form login)
       └─ controllers/admin/auth-controller.php → users (role=admin)
       └─ controllers/admin/bookig-admin-controller.php → bookings
       └─ controllers/admin/car-addmin-controller.php → (quản lý xe)

Đặt xe
  └─ views/pages/car-detail.html + assets/js/pages/car-detail.js
       └─ controllers/booking-controller.php → bookings
```

## Lưu ý kỹ thuật
- `index.php` dùng `readfile()` để serve các file HTML trong `views/pages/` — không phải PHP template
- Header/footer được inject bởi `load-template.js` qua `fetch()` → meta tags nằm trong `<body>`
- SEO meta tags được inject bởi `injectBaseSEO()` từ object `window.PAGE_SEO` trong mỗi page HTML
- Mọi API call trong `api.js` đều có `try/catch` → fallback về `static-data.js` nếu server lỗi
- Provider đăng ký → `status = 'pending'` → admin duyệt → `status = 'active'` → mới đăng nhập được
