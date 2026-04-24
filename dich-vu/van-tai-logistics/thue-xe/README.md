# Toàn bộ hệ thống Thuê Xe - Dịch Vụ Quanh Ta

Nền tảng trung gian cho thuê xe tích hợp trong hệ sinh thái **Dịch Vụ Quanh Ta**. Hệ thống hỗ trợ khách hàng đặt xe trực tuyến, nhà cung cấp quản lý đội xe và admin điều phối toàn bộ hoạt động.

---

## 📌 Bối cảnh & Cấu trúc dự án

Dự án đã được chuyển đổi sang cấu trúc phẳng và đồng bộ hóa vào platform trung tâm:
- **Vị trí thư mục:** `dich-vu/van-tai-logistics/thue-xe/`
- **Tên miền chính thức:** `https://dichvuquanhta.vn/dich-vu/van-tai-logistics/thue-xe/`
- **URL cục bộ:** `http://localhost/dichvuquanhta/dich-vu/van-tai-logistics/thue-xe/`

---

## 🛠 Kiến trúc Kỹ thuật

Dự án sử dụng kiến trúc hiện đại, tập trung vào hiệu suất phía Client và sử dụng thư viện lõi của platform:

- **Frontend:** HTML5, CSS3 (System Variables), Bootstrap 5.3, Vanilla JavaScript.
- **Backend Logic (Client-side DB Control):** 
  - Sử dụng đối tượng `DVQTKrud` từ thư viện `/public/asset/js/dvqt-krud.js`.
  - Thực hiện các thao tác CRUD trực tiếp qua API trung tâm của platform.
- **Giao diện & SEO:** 
  - Quản lý Meta Tags động (Canonical, Open Graph, JSON-LD) trỏ về `dichvuquanhta.vn`.
  - Các trang được tối ưu SEO với cấu trúc dữ liệu chuẩn Schema.org cho dịch vụ thuê xe.

---

## 📂 Cấu trúc thư mục (Cập nhật mới)

```text
thue-xe/
│
├── index.html                   ← Trang chủ (Danh sách & Lọc xe)
├── dich-vu.html                 ← Trang dịch vụ tổng hợp
├── cam-nang.html                ← Danh sách bài viết hướng dẫn
├── chi-tiet-cam-nang.html       ← Chi tiết bài viết (slug động)
├── chi-tiet-thue-xe.html        ← Chi tiết mẫu xe và thông số
├── dat-lich.html                ← Quy trình đặt xe và thanh toán
├── dat-lich-thanh-cong.html     ← Trang xác nhận sau khi đặt
├── dieu-khoan.html              ← Chính sách & Quy định
├── gioi-thieu.html              ← Về thương hiệu Thuê Xe
├── tim-kiem.html                ← Kết quả tìm kiếm nâng cao
│
├── public/
│   └── assets/
│       ├── css/
│       ├── js/                  ← Chứa logic xử lý frontend (api.js, data.js)
│       └── images/              ← Kho ảnh xe thực tế
│
├── admin/                       ← SPA quản trị dành cho Admin (quan-tri.html)
├── nhacungcap/                  ← Giao diện dành cho đối tác chủ xe
└── khachhang/                   ← Trang quản lý lịch trình khách hàng
```

---

## 🗄 Cơ sở dữ liệu

Hệ thống sử dụng các bảng chính trong Database trung tâm:

### 1. Bảng `xethue` (Danh sách xe)
Lưu trữ thông tin chi tiết xe: tên, giá, ảnh, số chỗ, loại nhiên liệu, trạng thái...

### 2. Bảng `datlich_thuexe` (Lịch đặt xe)
Lưu trữ thông tin khách hàng, thời gian thuê, tổng tiền và trạng thái thanh toán.

---

## 🚀 Hướng dẫn khởi động nhanh

1. **Local environment:** 
   - Đảm bảo XAMPP đang chạy Apache/MySQL.
   - Truy cập: `http://localhost/dichvuquanhta/dich-vu/van-tai-logistics/thue-xe/`

2. **Production:** 
   - Hệ thống tự động nhận diện domain `dichvuquanhta.vn`.
   - Các thẻ `canonical` và `og:url` đã được cấu hình trỏ về production để tối ưu SEO.

---
*© 2026 - Phát triển bởi Đội ngũ Dịch Vụ Quanh Ta*
