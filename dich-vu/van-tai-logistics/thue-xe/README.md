# Toàn bộ hệ thống Thuê Xe - Dịch Vụ Quanh Ta

Nền tảng trung gian cho thuê xe tích hợp trong hệ sinh thái **Dịch Vụ Quanh Ta**. Hệ thống hỗ trợ khách hàng đặt xe trực tuyến, nhà cung cấp quản lý đội xe và admin điều phối toàn bộ hoạt động.

---

## 📌 Bối cảnh & Cấu trúc dự án

Dự án đã được chuyển đổi và đồng bộ hóa vào platform trung tâm:
- **Vị trí thư mục:** `dich-vu/van-tai-logistics/thue-xe/`
- **URL cục bộ:** `http://localhost/dichvuquanhta/dich-vu/van-tai-logistics/thue-xe/`

---

## 🛠 Kiến trúc Kỹ thuật

Dự án sử dụng kiến trúc hiện đại, tập trung vào hiệu suất phía Client và sử dụng thư viện lõi của platform:

- **Frontend:** HTML5, CSS3 (System Variables), Bootstrap 5.3, Vanilla JavaScript.
- **Backend Logic (Client-side DB Control):** 
  - Sử dụng đối tượng `DVQTKrud` từ thư viện `/public/asset/js/dvqt-krud.js`.
  - Thực hiện các thao tác CRUD (Danh sách, Thêm, Sửa, Xóa) trực tiếp qua API trung tâm của platform, loại bỏ việc bảo trì các Controller PHP riêng lẻ.
- **Giao diện & SEO:** 
  - Nạp Header/Footer động qua `assets/js/load-template.js`.
  - Quản lý Meta Tags động cho từng trang để tối ưu SEO.

---

## 📂 Cấu trúc thư mục

```text
thue-xe/
│
├── index.html                   ← Trang chủ chính (Phân phối dịch vụ)
├── assets/
│   ├── css/
│   │   └── style.css            ← Giao diện tùy chỉnh (UI/UX đồng bộ)
│   ├── js/
│   │   ├── api.js               ← Logic kết nối dữ liệu (Proxy cho DVQTKrud)
│   │   ├── load-template.js     ← Inject Header, Footer và xử lý Auth
│   │   ├── admin/
│   │   │   └── admin-logic.js   ← Nghiệp vụ riêng cho trang quản trị
│   │   └── static-data.js       ← Dữ liệu fallback & cấu hình tĩnh
│   └── images/
│       └── cars/                ← Kho ảnh xe thực tế
│
├── views/
│   ├── pages/
│   │   ├── public/              ← Chi tiết xe, Tìm kiếm, Dịch vụ
│   │   ├── admin/               ← Dashboard quản trị (quan-tri.html - SPA)
│   │   ├── customer/            ← Trang cá nhân & Lịch sử đặt xe của khách
│   │   └── provider/            ← Giao diện cho chủ xe (Quản lý xe & đơn hàng)
│   └── partials/                ← Các thành phần UI dùng chung (Admin modals, templates)
│
└── controllers/
    └── upload-car-media.php     ← Xử lý upload ảnh xe lên server
```

---

## 🗄 Cơ sở dữ liệu

Hệ thống sử dụng các bảng chính trong Database trung tâm:

### 1. Bảng `xethue` (Danh sách xe)
| Cột | Ý nghĩa |
|-----|---------|
| `id` | Khóa chính |
| `tenxe` | Tên mẫu xe (VD: Toyota Vios 2023) |
| `giathue` | Giá thuê theo ngày (VNĐ) |
| `anhdaidien` | Tên file ảnh chính |
| `socho` | Số chỗ ngồi (4, 5, 7, 16...) |
| `loaixe` | Phân loại (Sedan, SUV, Bán tải...) |
| `nhienlieu` | Xăng, Dầu, Điện |
| `trangthai` | Trạng thái xe (available, rented, pending...) |

### 2. Bảng `datlich_thuexe` (Lịch đặt xe)
Lưu trữ thông tin khách hàng, thời gian thuê và trạng thái đơn hàng.

### 3. Bảng `admin`
Quản lý quyền truy cập hệ thống quản trị.

---

## 🔄 Luồng hoạt động chính

### 1. Dành cho Khách hàng
- Xem danh sách xe tại `index.html` hoặc `views/pages/public/dich-vu.html`.
- Xem thông tin chi tiết tại `chi-tiet-xe.html?id=X`.
- Nhấn "Đặt xe ngay" để mở Modal đặt lịch. Thông tin được lưu qua `DVQTKrud.insertRow` vào bảng `datlich_thuexe`.

### 2. Dành cho Quản trị viên (Admin)
- Truy cập Dashboard: `views/pages/admin/quan-tri.html`.
- Đây là một **Single Page Application (SPA)** cho phép:
  - Duyệt danh mục xe từ các đối tác (Provider).
  - Quản lý toàn bộ đơn đặt xe trên hệ thống.
  - Thống kê doanh thu và hoạt động.

---

## 🚀 Hướng dẫn cài đặt (XAMPP)

1. **Vị trí mã nguồn:**
   Sao chép toàn bộ thư mục `dichvuquanhta` vào: `C:\xampp\htdocs\dichvuquanhta\`

2. **Cấu hình Database:**
   - Truy cập `phpMyAdmin`.
   - Tạo Database mới (Tên database được cấu hình trong core của platform).
   - Import file SQL schema mới nhất.

3. **Khởi động:**
   - Mở XAMPP Control Panel và Start **Apache** & **MySQL**.
   - Truy cập: `http://localhost/dichvuquanhta/dich-vu/van-tai-logistics/thue-xe/`

4. **Đăng nhập Admin:**
   - URL: `views/pages/admin/quan-tri.html`
   - Kiểm tra tài khoản trong bảng `admin` hoặc sử dụng tài khoản hệ thống mặc định.

---
*© 2026 - Phát triển bởi Đội ngũ Dịch Vụ Quanh Ta*
