# Thuê Xe

Nền tảng trung gian cho thuê xe toàn quốc: khách hàng đặt xe online, nhà cung cấp nhận & xử lý đơn, admin quản lý toàn bộ hệ thống.

---

## Mục lục

- [Cài đặt](#cài-đặt)
- [Tài khoản & URL truy cập](#tài-khoản--url-truy-cập)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Luồng hoạt động](#luồng-hoạt-động)
  - [Đặt xe](#1-đặt-xe)
  - [Admin Panel](#2-admin-panel)
  - [Nhà cung cấp](#3-nhà-cung-cấp)
- [Kiến trúc kỹ thuật](#kiến-trúc-kỹ-thuật)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)

---

## Cài đặt

```
1. Đặt thư mục vào:
   C:\xampp\htdocs\GlobalCare\thue-xe\

2. Import database:
   phpMyAdmin → Import → database_new.sql
   (Tự tạo database tên: car_rental)

3. Khởi động XAMPP: Apache + MySQL

4. Truy cập: http://localhost/GlobalCare/thue-xe/
```

> Không cần file `.env` — credentials DB được hardcode trong `config/database.php`:
> `localhost / root / (no password) / car_rental`

---

## Tài khoản & URL truy cập

| Role | Email mặc định | Mật khẩu | URL đăng nhập |
|------|----------------|----------|---------------|
| Admin | admin.thuexe@gmail.com | admin123 | `/admin/index.php` |
| Customer | _(tự đăng ký)_ | — | `/views/pages/customer/dang-nhap.html` |
| Provider | _(tự đăng ký, cần admin duyệt)_ | — | `/views/pages/provider/dang-nhap.html` |

| Trang | URL |
|-------|-----|
| Trang chủ | `http://localhost/GlobalCare/thue-xe/` |
| Danh sách dịch vụ | `http://localhost/GlobalCare/thue-xe/views/pages/public/dich-vu.html` |
| Chi tiết xe | `http://localhost/GlobalCare/thue-xe/views/pages/public/chi-tiet-xe.html?id=1` |
| Admin dashboard | `http://localhost/GlobalCare/thue-xe/admin/index.php` |
| Tra cứu đơn | `http://localhost/GlobalCare/thue-xe/views/pages/public/tra-cuu-don.html` |

> **GitHub Pages:** `index.html` (root) và `car_detail.html` (root) là 2 file standalone, hoạt động không cần PHP/DB — dùng fallback `assets/data/static-data.json`.

---

## Cấu trúc thư mục

```
thue-xe/
│
├── index.html                    ← Trang chủ standalone (GitHub Pages, không cần PHP)
├── index.php                     ← PHP Router: ?page=X → readfile view tương ứng
├── car_detail.html               ← Chi tiết xe standalone (GitHub Pages)
├── database_new.sql              ← Schema đầy đủ v3 + procedure migration
│
├── config/
│   └── database.php              ← Kết nối MySQL (PDO), DB: car_rental
│
├── controllers/                  ← Xử lý request, trả về JSON
│   ├── booking-controller.php    ← POST: tạo đơn đặt xe (tính giá server-side)
│   ├── car-controller.php        ← GET: danh sách / chi tiết / filter xe
│   ├── service-controller.php    ← GET: danh sách dịch vụ addon
│   ├── contact-controller.php    ← POST: gửi form liên hệ
│   ├── check-session.php         ← GET: kiểm tra session + role hiện tại
│   ├── session.php               ← Quản lý session chung
│   ├── admin/
│   │   ├── auth-controller.php           ← Đăng nhập / đăng xuất admin
│   │   ├── bookig-admin-controller.php   ← CRUD đơn đặt xe (admin)
│   │   ├── car-addmin-controller.php     ← CRUD xe (admin)
│   │   └── providers-controller.php      ← Duyệt / quản lý nhà cung cấp
│   ├── customer/
│   │   ├── auth-controller.php           ← Đăng ký / đăng nhập / logout khách hàng
│   │   └── bookings-controller.php       ← Xem đơn của khách hàng
│   └── provider/
│       ├── auth-controller.php           ← Đăng ký / đăng nhập / logout nhà cung cấp
│       └── bookings-controller.php       ← Xem và cập nhật đơn (provider)
│
├── models/                       ← Tương tác database (PDO)
│   ├── base-model.php            ← Abstract class: columnMap (DB name → code name)
│   ├── admin.php
│   ├── booking.php               ← 29 column mappings (datxe → booking object)
│   ├── car.php                   ← 19 column mappings (xe → car object)
│   └── service.php
│
├── views/
│   ├── pages/
│   │   ├── public/               ← 12 trang public (xem bảng bên dưới)
│   │   ├── customer/
│   │   │   ├── dang-nhap.html
│   │   │   ├── dang-ky.html
│   │   │   └── bang-dieu-khien.html
│   │   └── provider/
│   │       ├── dang-nhap.html
│   │       ├── dang-ky.html
│   │       └── bang-dieu-khien.html
│   └── partials/
│       ├── header.html           ← Navbar + auth dropdown (inject bởi load-template.js)
│       ├── footer.html           ← Footer + floating call button (inline CSS + styles)
│       └── dat-lich-modal.html   ← Form đặt xe dạng modal (53KB, lazy-load)
│
├── admin/
│   └── index.php                 ← Admin SPA (login + dashboard trong 1 file PHP)
│
├── assets/
│   ├── css/
│   │   └── style.css             ← CSS toàn bộ website (Bootstrap 5.3.0 + custom)
│   ├── js/
│   │   ├── load-template.js      ← Inject header/footer, kiểm tra session, inject SEO meta
│   │   ├── api.js                ← Mọi API call — try/catch → fallback static-data.json
│   │   ├── static-data.js        ← Load Promise: fetch assets/data/static-data.json
│   │   ├── booking-panel.js      ← Tạo Bootstrap Modal, lazy-load dat-lich-modal.html
│   │   ├── main.js               ← Smooth scroll, back-to-top button
│   │   ├── utils.js              ← Helper functions dùng chung
│   │   ├── map-picker.js         ← Chọn địa điểm trên bản đồ Leaflet
│   │   └── pages/                ← JS riêng cho từng trang
│   │       ├── home.js           ← Xe nổi bật, dịch vụ, filter options
│   │       ├── car-detail.js     ← Chi tiết xe, cập nhật SEO động, form đặt xe
│   │       ├── services.js       ← Danh sách xe + dịch vụ addon
│   │       ├── search.js         ← Lọc / sắp xếp xe
│   │       ├── contact.js        ← Form liên hệ
│   │       └── booking-success.js ← Trang xác nhận đặt xe thành công
│   ├── images/
│   │   ├── cars/                 ← Ảnh xe (camry, city, crv, cx5, mazda3, ranger, vf5, vf8, xl7, ...)
│   │   ├── cam-nang/             ← Ảnh bài viết cẩm nang (1.jpg → 31.jpg)
│   │   └── guide/                ← Ảnh hướng dẫn hệ thống
│   └── data/
│       ├── static-data.json      ← 12 loại xe + 35 xe riêng lẻ + 6 dịch vụ (fallback)
│       ├── cam-nang-data.json    ← Dữ liệu bài viết cẩm nang
│       └── blog-data.json        ← Dữ liệu blog
│
└── uploads/
    └── providers/                ← Avatar, ảnh CCCD nhà cung cấp
```

**Các trang public (`views/pages/public/`):**

| File | Mô tả | JS tương ứng |
|------|-------|-------------|
| _(index.html root)_ | Trang chủ | `pages/home.js` |
| `dich-vu.html` | Dịch vụ & danh sách xe | `pages/services.js` |
| `chi-tiet-xe.html` | Chi tiết xe + đặt lịch | `pages/car-detail.js` |
| `tim-kiem.html` | Tìm kiếm / lọc xe | `pages/search.js` |
| `cam-nang.html` | Danh sách cẩm nang | _(inline)_ |
| `chi-tiet-cam-nang.html` | Bài viết cẩm nang (?id=) | _(inline)_ |
| `gioi-thieu.html` | Giới thiệu công ty + hướng dẫn thuê xe + liên hệ | `pages/contact.js` |
| `huong-dan-he-thong.html` | Hướng dẫn dùng hệ thống | _(inline)_ |
| `dat-lich-thanh-cong.html` | Xác nhận đặt xe | `pages/booking-success.js` |
| `tra-cuu-don.html` | Tra cứu đơn hàng | _(inline)_ |
| `dieu-khoan.html` | Điều khoản sử dụng | _(inline)_ |

---

## Database

**Tên database:** `car_rental`
**Schema file:** `database_new.sql` (v3, tên bảng/cột tiếng Việt không dấu)

### Các bảng chính

#### `nguoidung` — Người dùng
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | INT PK | Auto increment |
| hoten | VARCHAR | Họ tên đầy đủ |
| email | VARCHAR UNIQUE | Dùng để đăng nhập |
| sodienthoai | VARCHAR | — |
| matkhau | VARCHAR | bcrypt hash |
| vaitro | ENUM | `admin` / `customer` / `provider` |
| trangthai | ENUM | `active` / `blocked` / `pending` / `rejected` |
| tencongty, sogiayphep, diachi, mota | VARCHAR/TEXT | Chỉ provider |
| avatar, cccdmatruoc, cccdmatsau | VARCHAR | Đường dẫn file upload |
| lydotuchoi | TEXT | Lý do admin từ chối provider |

> Provider đăng ký → `trangthai = pending` → Admin duyệt → `active` → mới đăng nhập được.

#### `xe` — Xe cho thuê
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | INT PK | — |
| ten | VARCHAR | Tên xe (VD: Toyota Camry 2022) |
| thuonghieu | VARCHAR | Hãng xe (Toyota, Honda, ...) |
| model, namsanxuat | VARCHAR | — |
| loaixe | VARCHAR | Sedan, SUV, Pickup, MPV, ... |
| socho | INT | 5 hoặc 7 chỗ |
| hopso | ENUM | `so_tu_dong` / `so_san` |
| nhienlieu | ENUM | `xang` / `dau` / `dien` / `hybrid` |
| giathue | DECIMAL | Giá thuê/ngày (VNĐ) |
| tilephicuoituan | DECIMAL | Hệ số phụ phí cuối tuần (mặc định 0.10 = 10%) |
| tiledatcoc | DECIMAL | Tỉ lệ đặt cọc (mặc định 0.30 = 30%) |
| anhchinh | VARCHAR | Đường dẫn ảnh chính |
| tienich | TEXT | JSON array tiện ích (điều hòa, GPS, camera...) |
| trangthai | ENUM | `available` / `rented` / `maintenance` |
| idnhacungcap | INT FK | → nguoidung (provider sở hữu xe) |

**12 xe mẫu:** Camry, CR-V, Tucson, Ranger, Xpander, VF8, City, CX-5, Mazda3, Vios, VF5, XL7
**Giá thuê:** 700.000đ – 1.800.000đ/ngày

#### `hinhanhxe` — Ảnh xe
| Cột | Ghi chú |
|-----|---------|
| idxe | FK → xe |
| loai | `front` / `back` / `left` / `right` / `interior` |
| tep | Tên file ảnh |

#### `datxe` — Đơn đặt xe
| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | INT PK | — |
| idkhachhang | INT FK | → nguoidung (NULL nếu chưa đăng nhập) |
| idnhacungcap | INT FK | → nguoidung (provider nhận đơn) |
| idxe | INT FK | → xe |
| tenxe | VARCHAR | Snapshot tên xe tại thời điểm đặt |
| tenkhachhang, emailkhachhang, dienthoaikhachhang | VARCHAR | Thông tin liên hệ |
| ngaynhan, gionhan, ngaytra, gioratra | DATE/TIME | Lịch nhận/trả xe |
| diachinhan | VARCHAR | Địa điểm nhận xe |
| songay | INT | Tổng số ngày |
| tongtien | DECIMAL | Giá thuê xe (không gồm addon) |
| dichvuthem | TEXT | JSON array tên dịch vụ addon đã chọn |
| tiendichvuthem | DECIMAL | Tổng tiền addon |
| tamtinh | DECIMAL | Tạm tính (xe + addon) |
| tiengiamgia | DECIMAL | Số tiền giảm giá |
| tienvat | DECIMAL | Thuế VAT 10% |
| tiendatcoc | DECIMAL | Tiền đặt cọc (30% tổng) |
| phuphi | DECIMAL | Phụ phí phát sinh |
| phicuoituan | DECIMAL | Phí cuối tuần (10% nếu có) |
| tongcuoi | DECIMAL | Tổng tiền cuối cùng |
| trangthai | ENUM | `pending` / `confirmed` / `completed` / `cancelled` |

**Luồng trạng thái đơn:**
```
pending (Chờ xác nhận)
  → confirmed (Đã xác nhận)
    → completed (Hoàn thành)

Ở bất kỳ bước nào → cancelled (Đã hủy)
```

#### `dichvu` — Dịch vụ addon
| Dịch vụ | Giá | Đơn vị |
|---------|-----|--------|
| Giao xe tận nơi | 100.000đ | chuyến |
| Bảo hiểm mở rộng | 150.000đ | ngày |
| Xe có tài xế | 300.000đ | ngày |
| GPS định vị | 50.000đ | chuyến |
| Ghế trẻ em | 100.000đ | chuyến |
| WiFi di động | 80.000đ | chuyến |

#### `lienhe` — Tin nhắn liên hệ
Lưu form liên hệ từ trang `gioi-thieu.html`: ten, sodienthoai, email, chude, noidung, dadoc.

---

## API Endpoints

> Tất cả controllers trả về JSON. Không có chuẩn envelope thống nhất — một số trả `{success, data}`, một số trả trực tiếp array.

### `controllers/car-controller.php` — GET

| Action | Params | Trả về |
|--------|--------|--------|
| `?action=getFeatured` | — | 6 xe available mới nhất |
| `?action=getAll` | — | Tất cả xe available |
| `?action=getById` | `&id=X` | Chi tiết xe + mảng ảnh theo góc |
| `?action=getFilterOptions` | — | `{brands[], seats[], priceRange:{min,max}}` |

> Tên cột DB (tiếng Việt) được map sang tên tiếng Anh qua SQL `AS` alias hoặc `car.php` columnMap trước khi trả về.

### `controllers/booking-controller.php` — POST

**Action:** `?action=create`

**Body (JSON):**
```json
{
  "car_id": 1,
  "pickup_date": "2026-04-01",
  "return_date": "2026-04-03",
  "pickup_time": "08:00",
  "return_time": "08:00",
  "pickup_address": "123 Lê Lợi, Q.1, TP.HCM",
  "customer_name": "Nguyễn Văn A",
  "customer_email": "a@gmail.com",
  "customer_phone": "0901234567",
  "customer_address": "...",
  "cccd": "012345678901",
  "note": "...",
  "addon_services": [1, 3],
  "promo_code": ""
}
```

**Trả về:** `{success: true/false, message, data: booking_object}`

> **Giá được tính server-side**, không tin giá từ client. Logic: base + addon (theo ngày hoặc chuyến) + VAT 10% + phụ phí cuối tuần 10% + đặt cọc 30%.

**Auth:** Cần session `user_id` + `user_role = 'customer'`

### `controllers/service-controller.php` — GET

**Action:** `?action=getAll` → `{success, data: [{id, name, icon, price, unit, description}]}`

### `controllers/contact-controller.php` — POST

**Action:** `?action=submit`

**Body:** `{name, phone, email, subject, message}` (Validation: phone 10 chữ số 03-09x, message ≤ 2000 ký tự)

### `controllers/check-session.php` — GET

```json
// Khách chưa đăng nhập
{ "logged_in": false }

// Khách hàng / Provider đã đăng nhập
{ "logged_in": true, "id": 5, "name": "Nguyễn Văn A", "email": "...", "phone": "...", "role": "customer" }

// Admin đã đăng nhập
{ "logged_in": true, "id": 1, "name": "Admin", "role": "admin" }
```

---

## Luồng hoạt động

### 1. Đặt xe

```
Người dùng vào index.html hoặc dich-vu.html
    ↓
home.js / services.js gọi:
  API.cars.getFeatured()  →  controllers/car-controller.php?action=getFeatured
  API.services.getAll()   →  controllers/service-controller.php?action=getAll
  (fallback: static-data.json nếu DB lỗi)
    ↓
Click "Chi tiết xe" → chi-tiet-xe.html?id=X
    ↓
car-detail.js:
  1. Đọc ?id từ URL
  2. API.cars.getById(id) → controllers/car-controller.php?action=getById&id=X
  3. Hiển thị thông tin xe, ảnh carousel (front/back/left/right/interior)
  4. Cập nhật SEO động: document.title, og:title, og:image, canonical
  5. API.services.getAll() → load addon services vào form
    ↓
Click "Đặt Xe Ngay"
    ↓
booking-panel.js:
  1. Tạo Bootstrap Modal động (inject vào body)
  2. Lazy-load views/partials/dat-lich-modal.html (jQuery .load())
  3. Gọi window.txBpFormLoaded() khi form đã load xong
    ↓
car-detail.js nhận callback txBpFormLoaded():
  - Điền sẵn thông tin xe (tên, giá/ngày, ảnh)
  - Nếu đã đăng nhập: fetch controllers/check-session.php → tự điền tên/email/SĐT
  - Gắn event: date picker, addon checkboxes, tính giá realtime
    ↓
Submit form → POST controllers/booking-controller.php?action=create
    ↓
Response: { success: true, data: { id, ... } }
    ↓
Redirect → dat-lich-thanh-cong.html?booking_id=X
```

**Phí tính theo công thức (server-side):**
```
Giá thuê xe = giathue × songay
Phí cuối tuần = Nếu có ngày cuối tuần trong kỳ: × tilephicuoituan (10%)
Addon = Tổng(giá dịch vụ × songay nếu "ngày", × 1 nếu "chuyến")
Tạm tính = Xe + Addon
VAT = Tạm tính × 10%
Đặt cọc = Tổng × tiledatcoc (30%)
Tổng cuối = Tạm tính + VAT + Đặt cọc
```

---

### 2. Admin Panel

```
Truy cập admin/index.php
    ↓
Hiển thị form đăng nhập
  → POST controllers/admin/auth-controller.php
  → Kiểm tra nguoidung với vaitro='admin' + bcrypt verify
  → Set session: admin_id, admin_name
    ↓
Redirect → admin/index.php (dashboard mode)
    ↓
Admin SPA: quản lý qua menu sidebar
  ├── Quản lý đơn hàng → bookig-admin-controller.php
  │     (xem, xác nhận, hủy, hoàn thành đơn)
  ├── Quản lý xe       → car-addmin-controller.php
  │     (thêm, sửa, xóa xe)
  └── Nhà cung cấp     → providers-controller.php
        (duyệt pending, block/unblock, xem thông tin)
```

---

### 3. Nhà cung cấp

```
Provider đăng ký (views/pages/provider/dang-ky.html)
  → POST controllers/provider/auth-controller.php
  → Tạo nguoidung với vaitro='provider', trangthai='pending'
    ↓
Admin vào dashboard → tab Nhà Cung Cấp
  → Xem danh sách pending
  → Duyệt → trangthai='active'  /  Từ chối → trangthai='rejected' + lý do
    ↓
Provider đăng nhập được (views/pages/provider/dang-nhap.html)
  → Vào bang-dieu-khien.html
  → Xem đơn được giao (controllers/provider/bookings-controller.php)
  → Cập nhật trạng thái đơn
```

---

## Kiến trúc kỹ thuật

### PHP Router (`index.php`)

```php
$page = $_GET['page'] ?? 'home';
// Map page name → file path
$pageMap = [
  'home'       => 'index.html',
  'car-detail' => 'views/pages/public/chi-tiet-xe.html',
  'services'   => 'views/pages/public/dich-vu.html',
  ...
];
// Dùng readfile() để serve file HTML (không phải PHP template)
readfile($pageMap[$page]);
```

### Header/Footer Injection (`load-template.js`)

Mọi trang public đều gọi `loadHeader()` trong inline script:

```javascript
window.PAGE_SEO = {
  title: '...',
  desc: '...',
  keys: '...',
  url: '...'      // canonical URL
};
loadHeader();     // Inject CSS + header HTML + footer HTML + kiểm tra session
```

**Thứ tự thực thi sau loadHeader():**
1. Inject Bootstrap, Font Awesome, Poppins, style.css vào `<head>`
2. Fetch `views/partials/header.html` → inject vào `<body>`
3. `initAuthNav()` → fetch `controllers/check-session.php` → hiển thị đúng UI (guest / customer / provider / admin)
4. `injectBaseSEO()` → set meta tags từ `window.PAGE_SEO`

> **Lưu ý:** Vì inject bằng JS, meta tags nằm trong `<body>` (không phải `<head>`). SEO crawler hiện đại vẫn đọc được, nhưng tool kiểm tra HTML sẽ báo invalid.

### Fallback Data (`api.js` + `static-data.json`)

```javascript
// api.js — mọi hàm đều có cấu trúc:
try {
  const res = await fetch('controllers/car-controller.php?action=...');
  return await res.json();
} catch (e) {
  // Fallback về static-data.json
  const data = await STATIC_DATA_PROMISE;
  return { success: true, data: data.car_types, _fallback: true };
}
```

`static-data.js` chỉ có 1 dòng:
```javascript
window.STATIC_DATA_PROMISE = fetch('assets/data/static-data.json').then(r => r.json());
```

Phải load `static-data.js` **trước** `api.js` trong mọi trang HTML.

### Booking Modal (`booking-panel.js`)

```
Click "Đặt Xe" button
  ↓
booking-panel.js._createModal()
  → Tạo #txBpModal (Bootstrap Modal) động → append vào body
  ↓
booking-panel.js._loadContent()
  → jQuery('#txBpModalBody').load('views/partials/dat-lich-modal.html #bookingFormContent')
  → Sau khi load: gọi window.txBpFormLoaded()
  ↓
car-detail.js.txBpFormLoaded()
  → Bind data xe vào form, gắn event handlers, tính giá real-time
```

### Session Management

- **Session keys cho Customer:** `user_id`, `user_role = 'customer'`, `user_name`, `user_email`, `user_phone`, `user_company`
- **Session keys cho Admin:** `admin_id`, `admin_name`
- **Không có session name riêng** (khác tho-nha dùng `THONHA_SID`)
- **Kiểm tra session:** GET `controllers/check-session.php` → trả JSON với `logged_in` + `role`

### Database Model (Column Mapping)

Bảng DB dùng tên tiếng Việt không dấu (`ten`, `giathue`, `socho`), nhưng API trả về tên tiếng Anh (`name`, `price_per_day`, `seats`) thông qua:

```php
// base-model.php
protected $columnMap = [
  'ten'      => 'name',
  'giathue'  => 'price_per_day',
  'socho'    => 'seats',
  // ... 19 mappings trong car.php
];
```

---

## Xử lý lỗi thường gặp

### Trang trắng hoàn toàn khi vào index.html

**Nguyên nhân:** CSS/JS không load được.

**Kiểm tra:**
1. DevTools → Console → có lỗi 404 không?
2. `load-template.js` inject CSS từ CDN (Bootstrap, Font Awesome) → cần internet
3. `style.css` phải ở đúng `assets/css/style.css`
4. `static-data.js` phải load trước `load-template.js` trong HTML

---

### Danh sách xe không hiển thị

**Triệu chứng:** Trang chủ hoặc dich-vu.html hiện loading mãi hoặc trống.

**Kiểm tra:**
1. DevTools → Network → xem request `car-controller.php?action=getFeatured` trả gì
2. Nếu 500 → PHP lỗi: kiểm tra `config/database.php` (MySQL đang chạy chưa? DB `car_rental` đã import chưa?)
3. Nếu request không có (fetch bị block) → `api.js` sẽ fallback `static-data.json`:
   - Xem Network có request `assets/data/static-data.json` không
   - Nếu 404 → file `static-data.json` bị thiếu
4. Nếu fallback thành công → console sẽ có log `_fallback: true`

---

### Kết nối database thất bại

**Triệu chứng:** API trả về lỗi 500 hoặc JSON rỗng.

**Kiểm tra:**
1. MySQL đang chạy trong XAMPP chưa?
2. Database `car_rental` đã được tạo chưa? (phpMyAdmin → kiểm tra)
3. Mở `config/database.php`:
   ```php
   $host = 'localhost';
   $user = 'root';
   $pass = '';          ← XAMPP mặc định không có password
   $dbname = 'car_rental';
   ```
4. Nếu MySQL dùng port khác: thêm `$host = 'localhost:3307'`

---

### Form đặt xe không mở được modal

**Triệu chứng:** Click "Đặt Xe Ngay" không có phản ứng gì.

**Kiểm tra:**
1. Console có lỗi `jQuery is not defined` không?
   - `booking-panel.js` dùng jQuery `.load()` → cần load jQuery trước
2. Console có lỗi fetch `views/partials/dat-lich-modal.html` không?
   - File phải tồn tại đúng đường dẫn đó
3. `window.txBpFormLoaded` có được define bởi `car-detail.js` trước khi modal load không?
   - Kiểm tra thứ tự load script trong `chi-tiet-xe.html`

---

### Đặt xe bị lỗi "Vui lòng đăng nhập"

**Nguyên nhân:** `booking-controller.php` yêu cầu session `user_id` + `user_role = 'customer'`.

**Xử lý:**
1. Khách hàng phải đăng ký tại `views/pages/customer/dang-ky.html`
2. Đăng nhập tại `views/pages/customer/dang-nhap.html`
3. Quay lại đặt xe

---

### Admin không đăng nhập được

**Triệu chứng:** Vào `admin/index.php`, nhập đúng email/mật khẩu vẫn báo lỗi.

**Kiểm tra:**
1. SQL: `SELECT email, vaitro, trangthai FROM nguoidung WHERE vaitro='admin';`
2. Nếu rỗng → import lại `database_new.sql`
3. Mật khẩu mặc định: **admin123** (bcrypt hash, không sửa trực tiếp trong DB)
4. Email mặc định: **admin.thuexe@gmail.com**

---

### Provider đăng ký xong không đăng nhập được

**Nguyên nhân đúng thiết kế:** Provider cần admin duyệt trước.

**Quy trình:**
1. Admin vào `admin/index.php` → tab Nhà Cung Cấp
2. Tìm provider vừa đăng ký (trangthai = pending)
3. Nhấn "Duyệt" → `trangthai = active`
4. Provider mới đăng nhập được

---

### Giá tính sai hoặc không đúng với form

**Nguyên nhân:** Giá được tính **server-side** trong `booking-controller.php`, không dùng giá từ client.

**Debug:**
1. Xem response JSON từ `booking-controller.php` → có `data.tongcuoi` không?
2. Kiểm tra `giathue` trong bảng `xe` cho đúng xe đó
3. Kiểm tra `tilephicuoituan` (mặc định 0.10) và `tiledatcoc` (mặc định 0.30)

---

### Ảnh xe không hiển thị

**Kiểm tra:**
1. Đường dẫn ảnh trong static-data.json là relative: `assets/images/cars/camry-*.jpg`
2. File ảnh phải tồn tại đúng tên (không phân biệt hoa thường trên Windows, nhưng Linux/server phân biệt)
3. Ảnh từ DB: cột `anhchinh` trong bảng `xe` (đường dẫn relative từ root project)
4. Fallback: nếu `anhchinh` NULL → hiển thị `assets/images/cars/default.jpg`

---

## Stack & Dependencies

| Thành phần | Version | CDN / Local |
|-----------|---------|------------|
| Bootstrap | 5.3.0 | CDN (jsdelivr) |
| Font Awesome | 6.4.0 | CDN (cdnjs) |
| Google Fonts (Poppins) | — | CDN |
| jQuery | 3.x | CDN (booking-panel.js) |
| Leaflet (bản đồ) | 1.9.x | CDN |
| PHP | 7.4+ / 8.x | XAMPP |
| MySQL | 5.7+ / 8.x | XAMPP |
| Google Analytics | G-FHV0Y0778D | CDN |
