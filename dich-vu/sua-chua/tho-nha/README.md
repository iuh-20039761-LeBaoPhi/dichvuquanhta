# Thợ Nhà

Nền tảng trung gian dịch vụ sửa chữa nhà tại TP.HCM: khách hàng đặt lịch online, nhà cung cấp nhận & xử lý đơn, admin quản lý toàn bộ hệ thống.

---

## Mục lục

- [Cài đặt](#cài-đặt)
- [Tài khoản & URL truy cập](#tài-khoản--url-truy-cập)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Luồng hoạt động](#luồng-hoạt-động)
  - [Đặt lịch (Public)](#1-đặt-lịch-public)
  - [Admin Panel (SPA)](#2-admin-panel-spa)
  - [Nhà cung cấp](#3-nhà-cung-cấp)
- [Kiến trúc kỹ thuật](#kiến-trúc-kỹ-thuật)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

---

## Cài đặt

```
1. Đặt thư mục vào:
   C:\xampp\htdocs\GlobalCare\tho-nha\

2. Import database:
   phpMyAdmin → Import → database/thonha_db_new.sql
   (Database name: thonha)

3. Tạo file .env:
   cp .env.example .env
   → Điền DB_HOST, DB_USER, DB_PASS, DB_NAME nếu khác default

4. Khởi động XAMPP: Apache + MySQL
```

**File `.env` mặc định (XAMPP local):**
```
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=thonha
```

---

## Tài khoản & URL truy cập

| Role | Email mặc định | Mật khẩu | URL đăng nhập |
|------|----------------|----------|---------------|
| Admin | admin.thonha@gmail.com | 123456 | `/pages/admin/dang-nhap.html` |
| Customer | _(tự đăng ký)_ | — | `/pages/customer/dang-nhap.html` |
| Provider | _(tự đăng ký, cần admin duyệt)_ | — | `/pages/provider/dang-nhap.html` |

| Trang | URL đầy đủ |
|-------|-----------|
| Trang chủ | `http://localhost/GlobalCare/tho-nha/` |
| Đặt lịch standalone | `http://localhost/GlobalCare/tho-nha/partials/dat-lich.html` |
| Admin dashboard | `http://localhost/GlobalCare/tho-nha/pages/admin/quan-tri.html` |
| Chi tiết dịch vụ | `http://localhost/GlobalCare/tho-nha/pages/public/service-detail.php?id=1` |

---

## Cấu trúc thư mục

```
tho-nha/
│
├── .env                          ← DB credentials (KHÔNG commit git)
├── .env.example                  ← Template .env
├── .htaccess                     ← Chặn truy cập config/, database/, .env
├── index.html                    ← Trang chủ (static HTML)
│
├── config/
│   ├── database.php              ← Kết nối MySQL (đọc .env → fallback default)
│   ├── session.php               ← session_name('THONHA_SID'), auto session_start
│   └── constants.php             ← APP_ROOT, UPLOAD_DIR, hằng STATUS_*
│
├── api/
│   ├── public/                   ← Không yêu cầu đăng nhập
│   │   ├── book.php              ← POST: tạo đơn đặt lịch
│   │   ├── get-categories.php    ← GET: danh sách danh mục
│   │   ├── get-services.php      ← GET: dịch vụ theo category_id
│   │   ├── get-home-services.php ← GET: dịch vụ nổi bật trang chủ
│   │   ├── get-orders.php        ← GET: tra cứu đơn (theo SĐT)
│   │   └── check-session.php     ← GET: kiểm tra session khách hàng
│   │
│   ├── admin/
│   │   ├── auth/
│   │   │   ├── login.php         ← POST: đăng nhập → session admin_id
│   │   │   ├── logout.php        ← GET: xóa session
│   │   │   └── check-session.php ← GET: xác thực admin_id trong session
│   │   ├── orders/
│   │   │   ├── get-all.php           ← GET: toàn bộ đơn hàng
│   │   │   ├── update-status.php     ← POST: đổi trạng thái đơn
│   │   │   ├── get-cancel-requests.php ← GET: danh sách yêu cầu hủy
│   │   │   └── process-cancel.php    ← POST: duyệt/từ chối hủy đơn
│   │   ├── services/
│   │   │   └── manage.php        ← GET/POST: CRUD danh mục & dịch vụ
│   │   └── providers/
│   │       └── manage.php        ← GET/POST: duyệt/quản lý nhà cung cấp
│   │
│   ├── customer/
│   │   ├── auth/
│   │   │   ├── register.php      ← POST: đăng ký tài khoản khách hàng
│   │   │   ├── login.php
│   │   │   ├── logout.php
│   │   │   └── check-session.php
│   │   └── orders/
│   │       ├── get.php           ← GET: lịch sử đơn của khách
│   │       └── request-cancel.php ← POST: gửi yêu cầu hủy đơn
│   │
│   └── provider/
│       ├── auth/
│       │   ├── register.php      ← POST: đăng ký → status pending (chờ admin duyệt)
│       │   ├── login.php
│       │   ├── logout.php
│       │   └── check-session.php
│       └── orders/
│           ├── get.php           ← GET: đơn được giao cho provider
│           └── update-status.php ← POST: provider cập nhật trạng thái đơn
│
├── pages/
│   ├── public/
│   │   ├── trang-chu.html        ← Redirect → index.html
│   │   ├── dich-vu.html          ← Danh sách dịch vụ
│   │   ├── chi-tiet-dich-vu.html ← Chi tiết dịch vụ (client-side, dùng JS)
│   │   ├── service-detail.php    ← Chi tiết dịch vụ (server-side, PHP)
│   │   ├── cam-nang.html         ← Blog / cẩm nang
│   │   ├── chi-tiet-cam-nang.html ← Bài viết chi tiết
│   │   └── dieu-khoan.html       ← Điều khoản sử dụng
│   ├── admin/
│   │   ├── dang-nhap.html        ← Trang đăng nhập admin
│   │   └── quan-tri.html         ← Admin SPA dashboard (load shell.js)
│   ├── customer/
│   │   ├── dang-nhap.html
│   │   ├── dang-ky.html
│   │   └── trang-ca-nhan.html
│   └── provider/
│       ├── dang-nhap.html
│       ├── dang-ky.html
│       └── trang-ca-nhan.html
│
├── partials/
│   ├── dau-trang.html            ← Header / navbar (inject bởi load-header.js)
│   ├── chan-trang.html           ← Footer (inject bởi load-header.js)
│   ├── dat-lich.html             ← Trang đặt lịch standalone (có header/footer)
│   └── dat-lich-chi-tiet.html   ← Form đặt lịch dạng modal (lazy-load bởi booking-detail.js)
│
├── assets/
│   ├── css/
│   │   ├── style.css             ← Giao diện trang public (màu teal #11998e / green #38ef7d)
│   │   └── admin-style.css       ← Giao diện admin (dark sidebar + topbar sáng)
│   ├── images/                   ← Ảnh dịch vụ, logo, hero banner
│   └── js/
│       ├── public/
│       │   ├── main.js           ← Khởi tạo chung (smooth scroll, nav active)
│       │   ├── booking-detail.js ← Engine đặt lịch (modal mode + standalone mode)
│       │   ├── booking-panel.js  ← UI helper cho form đặt lịch
│       │   ├── service-detail.js ← Logic trang chi tiết dịch vụ
│       │   ├── map-picker.js     ← Chọn địa chỉ bằng bản đồ Leaflet
│       │   └── order-tracking.js ← Tra cứu đơn hàng
│       └── admin/
│           ├── shell.js          ← SPA router: load HTML + JS từng trang admin
│           └── pages/            ← Nội dung từng tab admin
│               ├── tong-quan.html / dashboard.js
│               ├── don-hang.html / orders.js
│               ├── yeu-cau-huy.html / cancel-request.js
│               ├── dich-vu.html / services.js
│               └── nha-cung-cap.html / providers.js
│
├── data/
│   ├── services.json             ← Dữ liệu dịch vụ tĩnh (fallback khi API lỗi)
│   └── blog-data.json            ← Bài viết blog tĩnh
│
├── uploads/
│   └── providers/                ← Avatar, ảnh CCCD nhà cung cấp
│
└── database/
    └── thonha_db_new.sql         ← Schema đầy đủ + dữ liệu mẫu
```

---

## Database

**Tên database:** `thonha`

### Các bảng chính

#### `nguoidung` — Người dùng (admin + khách hàng + nhà cung cấp)
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | INT PK | Auto increment |
| hoten | VARCHAR | Tên đầy đủ |
| email | VARCHAR UNIQUE | Dùng để đăng nhập |
| sodienthoai | VARCHAR | — |
| matkhau | VARCHAR | bcrypt hash |
| vaitro | ENUM | `admin` / `customer` / `provider` |
| trangthai | ENUM | `active` / `pending` / `blocked` / `rejected` |
| tencongty, diachi, mota | VARCHAR | Chỉ provider |
| avatar, cccdmatruoc, cccdmatsau | VARCHAR | Đường dẫn file upload |
| lydotuchoi | TEXT | Lý do admin từ chối provider |

> Provider đăng ký → `trangthai = pending` → Admin duyệt → `active` → mới đăng nhập được.

#### `datlich` — Đơn đặt lịch
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | INT PK | — |
| idkhachhang | INT FK | → nguoidung (NULL nếu khách vãng lai) |
| idnhacungcap | INT FK | → nguoidung (NULL cho đến khi admin giao) |
| madondatlich | VARCHAR UNIQUE | Mã đơn (VD: TN-20260323-XXXX) |
| tenkhachhang, sodienthoai | VARCHAR | Thông tin khách |
| tendichvu | VARCHAR | Tên dịch vụ đã chọn |
| diachi | VARCHAR | Địa chỉ thi công |
| ghichu | TEXT | Ghi chú thêm |
| trangthai | ENUM | Xem luồng trạng thái bên dưới |
| thuonghieuchon | VARCHAR | Thương hiệu thiết bị (nếu có) |
| giauoctinh | DECIMAL | Giá ước tính (tính tự động) |

**Luồng trạng thái đơn hàng:**
```
new (Chờ xác nhận)
  → confirmed (Đã xác nhận)
    → doing (Đang thực hiện)
      → done (Hoàn thành)

Ở bất kỳ bước nào → cancel (Đã hủy)
```

#### `yeucauhuy` — Yêu cầu hủy đơn
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | INT PK | — |
| iddatlich | INT FK | → datlich |
| lydohuy | TEXT | Lý do của khách |
| trangthai | ENUM | `pending` / `approved` / `rejected` |

#### `danhmuc` — Danh mục dịch vụ
8 danh mục mặc định: Sửa Máy Lạnh, Sửa Máy Giặt, Nhà Vệ Sinh, Điện Nước, Sửa Tủ Lạnh, Sửa Tivi, Sửa Bếp Từ, Cải Tạo Nhà.

#### `dichvu` — Dịch vụ
| Cột | Ghi chú |
|-----|---------|
| iddanhmuc | FK → danhmuc |
| gia, tiencong, chiphivatlieu | Giá cơ bản, công thợ, vật liệu |
| giatheothuonghieu | JSON array: giá theo từng hãng thiết bị |
| jsongia | JSON: travelFee, surveyFee, priceRange, brandPrices |

---

## API Endpoints

> Tất cả API trả về JSON: `{ "status": "success"|"error", "message": "...", "data": ... }`
> Mỗi API file tự `require` config/database.php và config/session.php.

### Public (`api/public/`) — Không cần đăng nhập

| Method | File | Body / Params | Trả về |
|--------|------|---------------|--------|
| POST | `book.php` | name, phone, service_id, address, note, selected_brand?, estimated_price? | `{ order_code, booking_id }` |
| GET | `get-categories.php` | — | `[{ id, ten }]` |
| GET | `get-services.php` | `?category_id=1` | Mảng dịch vụ kèm giá, JSON pricing |
| GET | `get-home-services.php` | — | Dịch vụ nổi bật (6 items) |
| GET | `get-orders.php` | `?phone=0xxx` | Đơn hàng theo SĐT |
| GET | `check-session.php` | — | `{ status: "logged_in"|"not_logged_in" }` |

### Admin (`api/admin/`)

| Method | File | Ghi chú |
|--------|------|---------|
| POST | `auth/login.php` | email, password → set `$_SESSION['admin_id']` |
| GET | `auth/check-session.php` | Trả `username` nếu đã đăng nhập |
| GET | `auth/logout.php` | Xóa session |
| GET | `orders/get-all.php` | Toàn bộ đơn + thông tin khách + provider |
| POST | `orders/update-status.php` | `{ id, status }` |
| GET | `orders/get-cancel-requests.php` | Danh sách yêu cầu hủy |
| POST | `orders/process-cancel.php` | `{ id, action: "approve"|"reject" }` |
| GET/POST | `services/manage.php` | `?action=get_all|add|edit|delete` |
| GET/POST | `providers/manage.php` | `?action=counts|get_all|approve|block` |

### Customer (`api/customer/`)

| Method | File | Ghi chú |
|--------|------|---------|
| POST | `auth/register.php` | full_name, email, phone, password |
| POST | `auth/login.php` | email, password → set `$_SESSION['user_id']` |
| GET | `orders/get.php` | Đơn hàng của khách (cần session) |
| POST | `orders/request-cancel.php` | `{ booking_id, reason }` |

### Provider (`api/provider/`)

| Method | File | Ghi chú |
|--------|------|---------|
| POST | `auth/register.php` | Tạo tài khoản → `trangthai = pending` |
| POST | `auth/login.php` | Chỉ login được khi `trangthai = active` |
| GET | `orders/get.php` | Đơn được giao cho provider |
| POST | `orders/update-status.php` | Provider cập nhật `doing` → `done` |

---

## Luồng hoạt động

### 1. Đặt lịch (Public)

Có **2 điểm vào** khác nhau, nhưng đều dùng chung `booking-detail.js`:

#### 1a. Modal Mode (từ trang chi tiết dịch vụ)

```
Người dùng mở service-detail.php?id=X
    ↓
PHP truy vấn DB → render HTML dịch vụ
    ↓
Load booking-detail.js
    ↓
Click "Đặt Lịch" (.booking-btn hoặc nút nav)
    ↓
booking-detail.js lazy-load partials/dat-lich-chi-tiet.html (chỉ lần đầu)
    ↓
Modal mở ra, điền sẵn thông tin dịch vụ
    ↓
Người dùng nhập địa chỉ
  → map-picker.js (Leaflet) hoặc gõ tay
  → Nominatim geocoding → OSRM tính km → tính phí di chuyển
    ↓
Submit form → POST api/public/book.php
    ↓
Response: { order_code: "TN-20260323-XXXX" }
    ↓
Hiển thị thông báo thành công + mã đơn
```

#### 1b. Standalone Mode (trang đặt lịch riêng)

```
Người dùng vào partials/dat-lich.html
  (có thể kèm ?service=Tên+dịch+vụ)
    ↓
body.dat-lich-standalone → booking-detail.js phát hiện chế độ standalone
    ↓
Load dropdown #mainService (danh mục) → chọn → load #subService (dịch vụ cụ thể)
  → Dữ liệu từ api/public/get-categories.php + api/public/get-services.php
    ↓
Nếu có ?service= → tự pre-fill dropdown
    ↓
Submit form → POST api/public/book.php (cùng endpoint)
```

---

### 2. Admin Panel (SPA)

```
Truy cập pages/admin/quan-tri.html
    ↓
shell.js chạy:
  1. fetch api/admin/auth/check-session.php
     → Không có session → redirect dang-nhap.html
     → Có session → hiển thị username (#adminUsername)
  2. setupNavigation() → gắn click cho sidebar links
  3. loadPage('dashboard') → load tab mặc định
    ↓
Cơ chế loadPage(page):
  Promise.all([
    fetch('pages/tong-quan.html'),  ← HTML của tab
    fetch('pages/dashboard.js')     ← JS của tab
  ]).then(([html, script]) => {
    document.getElementById('pageContent').innerHTML = html;
    eval(script);           ← Chạy JS trong scope global
    initDashboard();        ← Gọi hàm init của tab
  })
```

**Các tab admin và file tương ứng:**

| Tab | HTML | JS | Hàm khởi tạo |
|-----|------|----|--------------|
| Tổng quan | `pages/tong-quan.html` | `pages/dashboard.js` | `initDashboard()` |
| Đơn hàng | `pages/don-hang.html` | `pages/orders.js` | `initOrders()` |
| Yêu cầu hủy | `pages/yeu-cau-huy.html` | `pages/cancel-request.js` | `initCancelRequests()` |
| Dịch vụ | `pages/dich-vu.html` | `pages/services.js` | `initServices()` |
| Nhà cung cấp | `pages/nha-cung-cap.html` | `pages/providers.js` | `initProviders()` |

> **Lưu ý quan trọng:** Vì dùng `eval()`, các hàm như `formatCurrency()`, `getStatusBadge()`, `formatDate()` được định nghĩa trong `shell.js` và dùng chung cho tất cả tab. `orders.js` tự định nghĩa lại các hàm này để override nếu cần format khác.

**Global state (shell.js):**
```javascript
let allOrders = [];         // Cache đơn hàng
let cancelRequests = [];    // Cache yêu cầu hủy
let allCategories = [];     // Cache danh mục dịch vụ
let currentPage = '';       // Tab đang active
```

---

### 3. Nhà cung cấp

```
Provider đăng ký (pages/provider/dang-ky.html)
  → POST api/provider/auth/register.php
  → Tạo tài khoản với trangthai = 'pending'
    ↓
Admin vào tab Nhà Cung Cấp → xem danh sách pending
  → Duyệt → trangthai = 'active'
  → Từ chối → trangthai = 'rejected' + lý do
    ↓
Provider đăng nhập được (pages/provider/dang-nhap.html)
  → Xem đơn được giao (api/provider/orders/get.php)
  → Cập nhật trạng thái đơn (doing → done)
```

---

## Kiến trúc kỹ thuật

### Xác thực (Authentication)

- **Session-based** — PHP `$_SESSION`
- **Session name:** `THONHA_SID` (tách riêng với các project khác trong XAMPP)
- **3 session key riêng biệt:**
  - Admin: `$_SESSION['admin_id']`
  - Customer: `$_SESSION['user_id']` + `$_SESSION['user_role'] = 'customer'`
  - Provider: `$_SESSION['user_id']` + `$_SESSION['user_role'] = 'provider'`
- **Password:** bcrypt (`password_hash` / `password_verify`)

### Kết nối Database

`config/database.php` đọc theo thứ tự ưu tiên:
1. File `.env` trong thư mục gốc project
2. Biến môi trường hệ thống (`$_ENV` / `getenv()`)
3. Fallback: `localhost / root / (no password) / thonha`

### Bảo mật (.htaccess)

```apache
Options -Indexes          ← Tắt directory listing
RewriteRule ^config/ - [F,L]    ← Block truy cập config/
RewriteRule ^database/ - [F,L]  ← Block truy cập database/
RewriteRule ^\.env - [F,L]      ← Block truy cập .env
```

### Tính giá (booking-detail.js)

```
Giá cuối = Giá dịch vụ (theo thương hiệu nếu chọn)
         + Phí di chuyển (tính theo km, có min/max)
         + Phí khảo sát (nếu bắt buộc và chưa miễn)

Phí di chuyển:
  1. Nominatim (OpenStreetMap) → geocode địa chỉ → lat/lng
  2. OSRM (project-osrm.org) → tính km đường bộ từ trụ sở → địa chỉ
  3. km × pricePerKm, giới hạn trong [minFee, maxFee]
```

### Header/Footer injection

Tất cả trang public dùng `load-header.js` (hoặc include trực tiếp) để inject:
- `partials/dau-trang.html` → header + navbar
- `partials/chan-trang.html` → footer

Đường dẫn tương đối khác nhau tùy vị trí file:
- Từ `pages/public/` → `../../partials/`
- Từ `partials/` → `./`
- Từ `index.html` (root) → `./partials/`

---

## Xử lý lỗi thường gặp

### Lỗi kết nối database

**Triệu chứng:** API trả về `{"status":"error","message":"Không thể kết nối database"}`

**Kiểm tra theo thứ tự:**
1. MySQL đang chạy trong XAMPP chưa?
2. File `.env` có tồn tại không? Có đúng `DB_NAME=thonha` không?
3. Database `thonha` đã được import chưa? (phpMyAdmin → kiểm tra)
4. Mở `config/database.php` → xem credentials fallback

---

### Admin không đăng nhập được

**Triệu chứng:** Nhập đúng email/mật khẩu vẫn báo lỗi

**Kiểm tra:**
1. Bảng `nguoidung` có record với `vaitro = 'admin'` và `trangthai = 'active'` không?
2. Chạy SQL: `SELECT email, vaitro, trangthai FROM nguoidung WHERE vaitro='admin';`
3. Nếu bảng rỗng: import lại `database/thonha_db_new.sql`
4. Mật khẩu mặc định: **123456** (hash bcrypt, không sửa trực tiếp trong DB)

---

### Admin panel hiện trang trắng sau đăng nhập

**Triệu chứng:** Vào `quan-tri.html`, trang trắng hoặc redirect về login

**Kiểm tra:**
1. Mở DevTools → Network → xem request `check-session.php` trả gì
2. Nếu trả `{"status":"not_logged_in"}` → session bị mất:
   - Kiểm tra `session_name('THONHA_SID')` có trong mọi API file không (qua `require config/session.php`)
3. Nếu request 404 → sai đường dẫn:
   - `shell.js` fetch `../../api/admin/auth/check-session.php` từ `pages/admin/` → đúng là `api/admin/auth/check-session.php`

---

### Tab admin không load được

**Triệu chứng:** Click tab, nội dung không hiện hoặc lỗi JS

**Cơ chế hoạt động:** `shell.js` fetch 2 file rồi `eval()` JS

**Kiểm tra:**
1. DevTools → Network → xem `pages/tong-quan.html` và `pages/dashboard.js` có được fetch không
2. Tên file phải khớp chính xác:

| Tab | HTML phải có | JS phải có |
|-----|-------------|-----------|
| Dashboard | `pages/tong-quan.html` | `pages/dashboard.js` |
| Orders | `pages/don-hang.html` | `pages/orders.js` |
| Cancel | `pages/yeu-cau-huy.html` | `pages/cancel-request.js` |
| Services | `pages/dich-vu.html` | `pages/services.js` |
| Providers | `pages/nha-cung-cap.html` | `pages/providers.js` |

3. Nếu JS lỗi sau `eval()` → xem Console tab → lỗi thường là undefined function → kiểm tra `shell.js` có define đủ utility functions không

---

### Form đặt lịch không mở được modal

**Triệu chứng:** Click "Đặt Lịch" không có gì xảy ra

**Kiểm tra:**
1. `booking-detail.js` đã được load chưa? (xem `<script src="...booking-detail.js">` trong trang)
2. DevTools Console có lỗi fetch `partials/dat-lich-chi-tiet.html` không?
3. Đường dẫn partial phải là `../../partials/dat-lich-chi-tiet.html` từ `pages/public/`
4. Kiểm tra button có class `.booking-btn` hoặc attribute `data-bs-target="#bookingModal"` đúng không

---

### Đặt lịch thành công nhưng không thấy đơn trong admin

**Kiểm tra:**
1. POST `api/public/book.php` trả về gì? (DevTools → Network)
2. `{"status":"success"}` nhưng không có đơn → kiểm tra bảng `datlich` trong phpMyAdmin
3. Nếu bảng rỗng → `book.php` bị lỗi SQL âm thầm → bật `error_reporting` tạm thời hoặc check PHP error log

---

### Provider đăng ký xong không đăng nhập được

**Nguyên nhân đúng thiết kế:** Provider phải được admin duyệt trước.

**Quy trình:**
1. Admin vào tab "Nhà Cung Cấp"
2. Tìm provider vừa đăng ký (trangthai = pending)
3. Nhấn "Duyệt" → trangthai = active
4. Provider mới đăng nhập được

---

### Phí di chuyển không tính được / hiện 0đ

**Nguyên nhân:** Nominatim hoặc OSRM không phản hồi (cần internet)

**Kiểm tra:**
1. Mở DevTools → Network → tìm request đến `nominatim.openstreetmap.org`
2. Nếu bị block/timeout → địa chỉ không geocode được → phí di chuyển = 0
3. Địa chỉ phải đủ chi tiết (số nhà, đường, quận, TP) để Nominatim tìm được

---

### CSS/JS không load (404)

**Nguyên nhân thường gặp:** Sai `<base href>` hoặc đường dẫn tương đối

**Kiểm tra:**
- Trang trong `pages/public/` → đường dẫn assets: `../../assets/`
- Trang trong `partials/` → đường dẫn assets: `../assets/`
- Trang root `index.html` → đường dẫn assets: `assets/`

---

## Stack & Dependencies

| Thành phần | Version | CDN / Local |
|-----------|---------|------------|
| Bootstrap | 5.3.2 | CDN |
| Font Awesome | 6.5.1 | CDN |
| Google Fonts (Inter) | — | CDN |
| Leaflet (bản đồ) | 1.9.x | CDN |
| PHP | 7.4+ / 8.x | XAMPP |
| MySQL | 5.7+ / 8.x | XAMPP |
| Nominatim | — | openstreetmap.org (API public) |
| OSRM | — | project-osrm.org (API public) |
