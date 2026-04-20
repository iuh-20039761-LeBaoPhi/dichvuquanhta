# Thợ Nhà

Nền tảng trung gian dịch vụ sửa chữa nhà tích hợp trong hệ sinh thái **Dịch Vụ Quanh Ta**. Project cho phép khách hàng đặt lịch online, nhà cung cấp (thợ) nhận đơn và Admin quản lý toàn bộ hệ thống thông qua giao diện SPA hiện đại.

---

## Mục lục

- [Cài đặt](#cài-đặt)
- [Hệ thống Tài khoản & SSO](#hệ-thống-tài-khoản--sso)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Cơ sở dữ liệu (Database)](#cơ-sở-dữ-liệu-database)
- [Luồng hoạt động chính](#luồng-hoạt-động-chính)
  - [1. Đặt lịch (Public Flow)](#1-đặt-lịch-public-flow)
  - [2. Quản trị (Admin SPA)](#2-quản-tri-admin-spa)
  - [3. Nhà cung cấp (Provider Flow)](#3-nhà-cung-cấp-provider-flow)
- [Kiến trúc Kỹ thuật & Tích hợp](#kiến-trúc-kỹ-thuật--tích-hợp)
- [Xử lý lỗi & Bảo trì](#xử-lý-lỗi--bảo-trì)

---

## Cài đặt

```text
1. Vị trí Project:
   Đặt toàn bộ codebase vào thư mục: 
   C:\xampp\htdocs\dichvuquanhta\dich-vu\sua-chua\tho-nha\

2. Cấu hình Database:
   - Sử dụng database chung `dichvuquanhta` (hoặc `thonha` tùy cấu hình local).
   - Đảm bảo các bảng `datlich_thonha`, `nguoidung`, `danhmuc_thonha` đã được khởi tạo.

3. File .env:
   Chỉnh sửa file .env tại thư mục gốc của project (tho-nha/.env) để kết nối DB cục bộ nếu cần.

4. URL truy cập local:
   Trang chủ: http://localhost/dichvuquanhta/dich-vu/sua-chua/tho-nha/index.html
```

---

## Hệ thống Tài khoản & SSO

Project sử dụng hệ thống xác thực tập trung (Central SSO) của platform **Dịch Vụ Quanh Ta**.

| Vai trò | URL đăng nhập / quản lý | Ghi chú |
| :--- | :--- | :--- |
| **Admin** | `/public/admin-login.html` | Đăng nhập tập trung cho toàn platform. |
| **Khách hàng** | `/public/dang-nhap.html` | Tự động tạo tài khoản khi đặt lịch nhanh. |
| **Nhà cung cấp** | `tho-nha/pages/provider/trang-ca-nhan.html` | Quản lý profile và danh sách đơn được giao. |

---

## Cấu trúc thư mục

Hệ thống được tổ chức theo mô hình Modular JS + SPA, tách biệt Content (HTML) và Logic (JS Shared).

```text
tho-nha/
├── index.html                    # Trang chủ (cổng vào chính)
├── chi-tiet-don-hang.html        # Trang xem chi tiết đơn (cho Khách/Thợ/Admin)
├── .htaccess                     # Cấu hình chặn truy cập file nhạy cảm
│
├── assets/
│   ├── css/                      # style.css (Public), admin-style.css (Dashboard)
│   ├── images/                   # Banner, Logo, ảnh dịch vụ
│   └── js/
│       ├── public/               # Logic đặt lịch: booking-detail-shared.js, order-tracking.js
│       ├── admin/                # shell.js (Router SPA Admin), pages/ (Logic từng tab)
│       ├── shared/               # Module dùng chung: auth-nav.js, order-service.js, order-view-utils.js
│       └── customer/             # Logic dành riêng cho khách hàng
│
├── pages/
│   ├── public/                   # dich-vu.html, chi-tiet-dich-vu.html, cam-nang.html
│   ├── admin/                    # quan-tri.html, tong-quan.html, don-hang.html (Template SPA)
│   ├── provider/                 # trang-ca-nhan.html
│   └── customer/                 # Trang dành cho khách hàng đã đăng nhập
│
├── partials/
│   ├── dau-trang.html            # Header dùng chung (navbar + auth state)
│   ├── chan-trang.html           # Footer dùng chung
│   └── dat-lich-chi-tiet.html    # Template Modal đặt lịch (lazy-load)
│
└── data/                         # services.json (Fallback pricing), blog-data.json
```

---

## Cơ sở dữ liệu (Database)

Sử dụng hệ thống **KRUD API** (Google Apps Script hoặc PHP Wrapper) để giao tiếp với các bảng:

### 1. `datlich_thonha` (Đơn hàng)
- `madon`: Mã đơn hàng (TN-YYYYMMDD-XXXX).
- `hoten`, `sodienthoai`, `diachi`: Thông tin khách hàng.
- `id_dichvu`: Liên kết đến danh mục sửa chữa.
- `trangthai`: `new` (Mới) → `confirmed` → `doing` → `done` | `cancel`.
- `giadichvu`, `phidichuyen`, `tongtien`: Chi tiết tài chính.
- `media_ids`: Danh sách ID ảnh/video lưu trên Google Drive.

### 2. `nguoidung` (User chung)
- Chứa cả Admin, Provider và Customer.
- Phân loại qua `vaitro` và `id_dichvu` (id_dichvu=9 dành cho Thợ Nhà).

### 3. `danhmuc_thonha`
- Chứa danh sách 8+ danh mục dịch vụ (Sửa Máy Lạnh, Máy Giặt, Điện Nước...).

---

## Luồng hoạt động chính

### 1. Đặt lịch (Public Flow)

- **Auth Gate:** Người dùng có thể đăng nhập hoặc dùng chế độ "Đặt lịch nhanh". Nếu chưa có tài khoản, hệ thống tự động tạo account với mật khẩu là số điện thoại.
- **Tính toán chi phí:**
  - `booking-detail-shared.js` phối hợp với `map-picker.js` (Leaflet).
  - Sử dụng **Nominatim** để geocode địa chỉ và **OSRM** để tính km từ Provider gần nhất.
  - Phí di chuyển tính theo giờ (Ngày/Đêm/Gấp) dựa trên bảng giá `phidichuyen`.
- **Media & Avatar Management:**
  - Ảnh/Video đính kèm trong đơn hàng được upload và quản lý qua Google Drive.
  - Avatar người dùng được render tự động bằng kỹ thuật "Zoom & Crop" iframe từ link Google Drive, đảm bảo tính thẩm mỹ đồng bộ trên toàn dashboard.
- **Google Sheets Integration:** Tự động ghi log đơn hàng mới vào Google Sheets để phục vụ báo cáo và theo dõi real-time.

### 2. Quản trị (Admin SPA)

- **Entry:** `pages/admin/quan-tri.html` (Yêu cầu đăng nhập admin platform).
- **Cơ chế SPA:** `shell.js` fetch template HTML và script JS của từng tab (Tổng quan, Đơn hàng, Dịch vụ) rồi inject vào `pageContent`.
- **Quản lý:** Admin có thể thay đổi trạng thái đơn, gán thợ (Provider), và quản lý danh mục dịch vụ.

### 3. Nhà cung cấp (Provider Flow)

- Thợ đăng nhập vào trang cá nhân để xem danh sách đơn hàng được gán.
- Cập nhật trạng thái thi công (`doing`, `done`) trực tiếp trên chi tiết đơn hàng.

---

## Kiến trúc Kỹ thuật & Tích hợp

- **Authentication:** Token/Cookie based SSO. Tích hợp chặt chẽ với platform `dichvuquanhta`.
- **Database Access:** Không gọi Raw SQL trực tiếp từ frontend. Sử dụng `DVQTKrud` (Wrapper cho RESTful API).
- **Bản đồ & Định vị:** Leaflet.js + OSM (OpenStreetMap).
- **Lưu trữ:** Google Drive (Media) & Google Sheets (Logging/Reporting).
- **UI Framework:** Bootstrap 5.3 + Vanilla JS (ES6+).

---

## Xử lý lỗi & Bảo trì

1. **Lỗi tính phí di chuyển (0đ):** Thường do Nominatim không geocode được địa chỉ hoặc mất kết nối internet. Hệ thống sẽ để trống để thợ báo giá sau.
2. **Lỗi Login Admin:** Kiểm tra Cookie `admin_e` và `admin_p`. Nếu mất, hệ thống tự động đưa về trang login trung tâm.
3. **Mã đơn hàng bị trùng:** Đã được xử lý bằng algorithm phát sinh mã kèm timestamp và random suffix.

---
*Cập nhật lần cuối: 20/04/2026 bởi Antigravity AI.*
