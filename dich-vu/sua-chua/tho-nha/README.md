# Thợ Nhà — Hệ sinh thái dịch vụ sửa chữa 24/7

Nền tảng trung gian dịch vụ sửa chữa nhà tích hợp trong hệ sinh thái **Dịch Vụ Quanh Ta**. Project cho phép khách hàng đặt lịch online, nhà cung cấp (thợ) nhận đơn và Admin quản lý toàn bộ hệ thống thông qua giao diện SPA hiện đại.

---

## 📌 Mục lục

- [Cài đặt](#cài-đặt)
- [Hệ thống Tài khoản & Dashboard](#hệ-thống-tài-khoản--dashboard)
- [Cấu trúc thư mục (Flattened)](#cấu-trúc-thư-mục-flattened)
- [Cơ sở dữ liệu (Database)](#cơ-sở-dữ-liệu-database)
- [Luồng hoạt động chính](#luồng-hoạt-động-chính)
- [Kiến trúc Kỹ thuật](#kiến-trúc-kỹ-thuật)

---

## 🚀 Cài đặt

```text
1. Vị trí Project:
   C:\xampp\htdocs\dichvuquanhta\dich-vu\sua-chua\tho-nha\

2. Cổng vào chính:
   Trang chủ: .../tho-nha/index.html
   Dashboard: .../tho-nha/nguoidung/trang-ca-nhan.html
```

---

## 🔐 Hệ thống Tài khoản & Dashboard

Hệ thống đã được hợp nhất vai trò Khách hàng và Đối tác (Thợ) vào một cổng quản lý duy nhất.

| Vai trò | URL Quản lý | Đặc điểm |
| :--- | :--- | :--- |
| **User (KH/NCC)** | `.../tho-nha/nguoidung/trang-ca-nhan.html` | Dashboard dùng chung. NCC (id_dichvu=9) sẽ thấy thêm mục "Đơn nhận làm". |
| **Admin** | `.../tho-nha/admin_thonha/quan-tri.html` | Quản trị toàn hệ thống, gán đơn, quản lý NCC. |

---

## 📂 Cấu trúc thư mục (Flattened)

Hệ thống được tổ chức theo mô hình Modular JS + SPA, tách biệt rõ ràng Content (HTML) và Logic (JS).

```text
tho-nha/
├── index.html                    # Trang chủ chính
├── dich-vu.html                  # Danh sách dịch vụ public
├── dat-lich.html                 # Trang đặt lịch (chế độ standalone)
├── chi-tiet-don-hang.html        # Trang độc lập xem chi tiết đơn hàng
│
├── nguoidung/                    # Dashboard hợp nhất cho KH và NCC
│   ├── trang-ca-nhan.html        # Shell SPA (Hồ sơ, Đơn hàng, Việc làm)
│   ├── aside.html                # Sidebar phân quyền tự động
│   └── don-hang.html, don-nhan.html... # Các tab nội dung SPA
│
├── admin_thonha/                 # Trang quản trị dành riêng cho Thợ Nhà
│   ├── quan-tri.html             # Shell SPA Admin
│   └── tong-quan.html, dich-vu.html... # Các tab quản trị
│
├── public/
│   └── assets/
│       ├── css/                  # order-panel.css, user-panel.css
│       └── js/
│           ├── user/             # shell.js (Router cho trang cá nhân)
│           ├── shared/           # Logic lõi: order-manager.js (NEW), order-service.js
│           └── public/           # booking-detail-shared.js, map-picker.js
│
└── data/                         # services.json (Cấu hình dịch vụ & phí kiểm tra)
```

---

## 🗄️ Cơ sở dữ liệu (Database)

Sử dụng **DVQTKrud API** để giao tiếp với các bảng chính:

1. **`datlich_thonha`**: Lưu trữ mọi đơn hàng. Trạng thái: `Mới` → `Đã xác nhận` → `Đang làm` → `Hoàn thành`.
2. **`nguoidung`**: Bảng người dùng chung. Khách hàng mặc định `id_dichvu=0`, Đối tác thợ `id_dichvu=9`.
3. **`danhmuc_thonha`**: Định nghĩa 8+ nhóm dịch vụ sửa chữa.
4. **`phidichuyen`**: Bảng giá cước di chuyển theo thời điểm (Sáng/Tối/Gấp).

---

## 🔄 Luồng hoạt động chính

### 1. Đặt lịch & Tính phí (Phí kiểm tra)
- **Thuật ngữ:** Toàn bộ hệ thống sử dụng thuật ngữ **"Phí kiểm tra"** thay cho phí khảo sát để tăng tính chuyên nghiệp.
- **Tính quãng đường:** Tích hợp Nominatim (Geocoding) và OSRM (Routing) để tính phí di chuyển tự động dựa trên khoảng cách từ NCC gần nhất đến địa chỉ khách hàng.
- **Tự động hóa:** Tự động tạo tài khoản khi khách hàng đặt lịch lần đầu (Mật khẩu mặc định là SĐT).

### 2. Dashboard Hợp nhất (Unified SPA)
- Sử dụng `user/shell.js` để điều hướng không tải lại trang (SPA).
- **Phân quyền ẩn hiện:** Sidebar tự động hiển thị mục "Dành cho đối tác" nếu tài khoản có `id_dichvu=9`.
- **Order Manager:** Toàn bộ logic quản lý đơn hàng được tập trung tại `shared/order-manager.js`, xử lý chung cho cả việc đặt đơn (Customer) và nhận đơn (Provider).

---

## 🛠️ Kiến trúc Kỹ thuật

- **UI Framework:** Bootstrap 5.3 + Vanilla CSS (Custom Premium Design).
- **Status Design:** Hệ thống Badge trạng thái dạng Capsule với hiệu ứng Gradient sang trọng.
- **Confirm System:** Toàn bộ các hành động thay đổi trạng thái (Nhận đơn, Hoàn thành, Hủy) đều sử dụng **SweetAlert2** để xác nhận.
- **Media Management:** Tích hợp Google Drive để lưu trữ ảnh/video minh họa lỗi của khách hàng.

---
*Cập nhật lần cuối: 23/04/2026 bởi Antigravity AI.*
