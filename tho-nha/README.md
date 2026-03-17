# Thợ Nhà — Tài liệu dự án

Nền tảng trung gian dịch vụ sửa chữa nhà: khách hàng đặt lịch, nhà cung cấp nhận đơn, admin quản lý.

## Công nghệ
- **Backend:** PHP (API REST), MySQL (MySQLi)
- **Frontend:** Bootstrap 5.3.2, Font Awesome 6.5.1, Inter font
- **Admin panel:** SPA (fetch + eval pattern)
- **Server:** XAMPP (Apache + MySQL)

## Tài khoản mặc định
| Role | Email | Mật khẩu |
|------|-------|-----------|
| Admin | admin.thonha@gmail.com | admin123 |

## Cài đặt
1. Copy thư mục vào `C:\xampp\htdocs\GlobalCare\tho-nha\`
2. Import `database/thonha_db.sql` vào phpMyAdmin (tự tạo DB `thonha`)
3. Truy cập: `http://localhost/GlobalCare/tho-nha/`

---

## Cấu trúc thư mục

```
tho-nha/
│
├── index.html                  # Trang chủ (hero, dịch vụ, giới thiệu, liên hệ)
├── service-detail.php          # Chi tiết dịch vụ (động — lấy từ DB)
├── service-detail.html         # Chi tiết dịch vụ (static, không dùng)
├── blog.html                   # Trang blog
├── blog-detail.html            # Chi tiết bài viết
├── terms.html                  # Điều khoản sử dụng
│
├── login.html                  # Đăng nhập quản trị viên
├── admin.html                  # Admin SPA (sau khi đăng nhập)
│
├── customer-login.html         # Đăng nhập khách hàng
├── customer-register.html      # Đăng ký khách hàng
├── provider-login.html         # Đăng nhập nhà cung cấp
├── provider-register.html      # Đăng ký nhà cung cấp (status=pending, chờ admin duyệt)
│
├── header.html                 # Header công khai (inject bằng load-header.js)
├── footer.html                 # Footer công khai
│
├── database/
│   ├── thonha_db.sql           # Schema đầy đủ — import để tạo mới DB
│   └── add_accounts.sql        # (Đã tích hợp vào thonha_db.sql, không cần dùng)
│
├── api/                        # REST API — nhận request, trả JSON
│   ├── db.php                      # Kết nối MySQL (MySQLi), DB: thonha
│   ├── book.php                    # POST — tạo đơn đặt lịch mới
│   ├── get-services.php            # GET — danh sách dịch vụ
│   ├── get-home-services.php       # GET — dịch vụ nổi bật cho trang chủ
│   ├── get-categories.php          # GET — danh mục dịch vụ
│   ├── get-orders.php              # GET — tra cứu đơn theo mã / SĐT
│   ├── request-cancel-order.php    # POST — gửi yêu cầu hủy đơn
│   │
│   ├── admin/                  # API dành riêng cho admin (yêu cầu session admin)
│   │   ├── login.php               # POST — đăng nhập admin (email + password)
│   │   ├── check-login.php         # GET — kiểm tra session admin
│   │   ├── logout.php              # GET — đăng xuất admin
│   │   ├── get-all-orders.php      # GET — lấy toàn bộ đơn hàng
│   │   ├── update-order-status.php # POST — cập nhật trạng thái đơn
│   │   ├── get-cancel-requests.php # GET — danh sách yêu cầu hủy
│   │   ├── process-cancel-request.php # POST — duyệt / từ chối yêu cầu hủy
│   │   └── manage-services.php     # GET/POST — quản lý dịch vụ (CRUD)
│   │
│   ├── customer/               # API dành cho khách hàng
│   │   ├── register.php            # POST — đăng ký tài khoản
│   │   ├── login.php               # POST — đăng nhập
│   │   ├── check-login.php         # GET — kiểm tra session
│   │   └── logout.php              # GET — đăng xuất
│   │
│   └── provider/               # API dành cho nhà cung cấp
│       ├── register.php            # POST — đăng ký (status=pending, chờ duyệt)
│       ├── login.php               # POST — đăng nhập (chặn nếu pending/rejected)
│       └── logout.php              # GET — đăng xuất
│
├── css/
│   ├── style.css               # CSS toàn bộ website công khai
│   └── admin-style.css         # CSS riêng cho admin panel
│
├── js/
│   ├── load-header.js          # Inject header.html vào trang bằng fetch()
│   ├── main.js                 # JS khởi tạo chung (trang chủ)
│   ├── booking.js              # Logic form đặt lịch + modal
│   ├── service-detail.js       # JS trang chi tiết dịch vụ
│   ├── order-tracking.js       # Tra cứu đơn hàng theo mã / SĐT
│   ├── map-picker.js           # Chọn địa điểm trên bản đồ
│   ├── admin-main.js           # Điều phối admin SPA (routing, fetch+eval pages)
│   └── pages/                  # Nội dung từng tab admin (HTML + JS tách đôi)
│       ├── dashboard.html / .js        # Thống kê tổng quan
│       ├── orders.html / .js           # Danh sách & quản lý đơn hàng
│       ├── services.html / .js         # Quản lý dịch vụ
│       ├── cancel-request.html / .js   # Xử lý yêu cầu hủy
│       └── setting.html                # Cài đặt tài khoản admin
│
├── partials/
│   ├── booking-modal.html          # Modal đặt lịch (dùng ở trang chủ)
│   └── booking-modal-detail.html   # Modal đặt lịch (dùng ở trang chi tiết)
│
├── data/
│   ├── services.json           # Dữ liệu dịch vụ tĩnh (dự phòng khi DB chưa có)
│   └── blog-data.json          # Dữ liệu bài viết blog
│
├── image/
│   ├── logo.png
│   ├── 1.jpg → 10.jpg          # Ảnh dịch vụ (đuôi .jpg)
│   └── blogs/                  # Ảnh bài viết blog (1.jpg → 30.png)
│
└── docs/
    ├── huongdan.html           # Hướng dẫn sử dụng chi tiết
    └── img/                    # Ảnh minh họa trong tài liệu
```

---

## Database — `thonha`

### Bảng `users`
| Cột | Kiểu | Mô tả |
|-----|------|-------|
| id | INT | PK |
| full_name | VARCHAR(100) | Họ tên |
| email | VARCHAR(100) | UNIQUE — dùng để đăng nhập |
| phone | VARCHAR(20) | Số điện thoại |
| password | VARCHAR(255) | Bcrypt hash |
| role | ENUM | `admin` / `customer` / `provider` |
| status | ENUM | `active` / `blocked` / `pending` / `rejected` |
| company_name | VARCHAR(255) | Tên cửa hàng / đội thợ (chỉ provider) |
| address | TEXT | Địa chỉ hoạt động (chỉ provider) |
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
| order_code | VARCHAR(30) | Mã đơn dạng TN + 6 số (UNIQUE) |
| customer_name | VARCHAR(100) | Tên khách (điền khi đặt) |
| phone | VARCHAR(20) | SĐT khách |
| service_name | VARCHAR(255) | Tên dịch vụ |
| address | TEXT | Địa chỉ thi công |
| note | TEXT | Ghi chú thêm |
| status | ENUM | `new` / `confirmed` / `doing` / `done` / `cancel` |

### Bảng `cancel_requests`
Lưu yêu cầu hủy đơn từ khách hàng.

| Cột | Kiểu | Mô tả |
|-----|------|-------|
| booking_id | INT | FK → bookings (CASCADE DELETE) |
| cancel_reason | TEXT | Lý do hủy |
| cancel_status | ENUM | `pending` / `approved` / `rejected` |

---

## Luồng dữ liệu

```
Khách hàng
  └─ customer-login.html / customer-register.html
       └─ api/customer/login.php, register.php → users (role=customer)
  └─ index.html → booking-modal.html → api/book.php → bookings

Nhà cung cấp
  └─ provider-login.html / provider-register.html
       └─ api/provider/login.php, register.php → users (role=provider, status=pending)

Admin
  └─ login.html → api/admin/login.php → users (role=admin)
  └─ admin.html → admin-main.js (fetch + eval pages)
       └─ api/admin/get-all-orders.php → bookings
       └─ api/admin/update-order-status.php → bookings
       └─ api/admin/process-cancel-request.php → cancel_requests
       └─ api/admin/manage-services.php → services
```

## Lưu ý kỹ thuật
- Admin panel là **SPA**: `admin.html` tải HTML từng tab qua `fetch()` rồi `eval()` JS tương ứng — xem `js/admin-main.js`
- Session keys thống nhất cho mọi role: `user_id`, `user_name`, `user_email`, `user_role`
- Admin session giữ thêm `admin_id`, `admin_username` để tương thích panel hiện tại
- File tab cài đặt tên là `setting.html` (không có 's') — lưu ý khi gọi từ `admin-main.js`
- Ảnh dịch vụ: `image/1.jpg` → `image/10.jpg` (đuôi `.jpg`, không phải `.png`)
- Provider đăng ký → `status = 'pending'` → admin duyệt → `status = 'active'` → mới đăng nhập được
