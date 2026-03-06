# GlobalCare

Link github page: https://iuh-20039761-lebaophi.github.io/GlobalCare/

---

## Hướng dẫn cài đặt & chạy dự án trên máy local

### Yêu cầu hệ thống

- **Git** (để clone dự án)
- **Web Server**: XAMPP / WAMP / Laragon (bao gồm PHP ≥ 7.4 và MySQL)
- **Trình duyệt** web hiện đại (Chrome, Firefox, Edge, …)

---

### 1. Clone dự án về máy

```bash
git clone https://github.com/iuh-20039761-LeBaoPhi/GlobalCare.git
```

---

### 2. Cấu trúc các module

| Thư mục | Mô tả | Công nghệ |
|---|---|---|
| `index.html` | Trang chủ tổng hợp dịch vụ | HTML / CSS / JS |
| `csbn/` | Chăm Sóc Bé & Nhi | PHP / MySQL |
| `csmvb/` | Chăm Sóc Mẹ & Bé | PHP / MySQL |
| `csng/` | Chăm Sóc Người Già | PHP / MySQL |
| `giat-ui-nhanh/` | Giặt Ủi Nhanh | PHP / HTML |
| `he-thong-giao-hang-chuyen-don/` | Hệ Thống Giao Hàng | PHP / MySQL |
| `tho-nha/` | Thợ Nhà | PHP / MySQL |
| `thue-xe/` | Thuê Xe | PHP / MySQL |
| `vesinhcare/` | Vệ Sinh Care | PHP / MySQL |
| `web-cham-soc-vuon-nha/` | Chăm Sóc Vườn Nhà | HTML / CSS / JS |

---

### 3. Chạy trang tĩnh (HTML/CSS/JS)

Các module chỉ dùng HTML/CSS/JS (`web-cham-soc-vuon-nha`) có thể mở trực tiếp bằng trình duyệt:

```
GlobalCare/web-cham-soc-vuon-nha/index.html
GlobalCare/index.html
```

---

### 4. Chạy các module PHP/MySQL với XAMPP

#### Bước 1 – Di chuyển thư mục dự án vào `htdocs`

Sao chép (hoặc di chuyển) thư mục `GlobalCare` vào thư mục `htdocs` của XAMPP:

```
C:\xampp\htdocs\GlobalCare\
```

#### Bước 2 – Khởi động XAMPP

Mở **XAMPP Control Panel** và khởi động:
- **Apache**
- **MySQL**

#### Bước 3 – Tạo database và import dữ liệu

Mở **phpMyAdmin** tại `http://localhost/phpmyadmin` rồi tạo các database và import file SQL tương ứng:

| Module | Tên database | File SQL |
|---|---|---|
| `csbn/` | `csbn` | *(không có file SQL, tạo database trống)* |
| `csmvb/` | `csmvb` | *(không có file SQL, tạo database trống)* |
| `csng/` | `csng` | *(không có file SQL, tạo database trống)* |
| `he-thong-giao-hang-chuyen-don/` | `shipper_db` | `he-thong-giao-hang-chuyen-don/database/shipper_db.sql` |
| `tho-nha/` | `thonha_db` | `tho-nha/database/thonha_db.sql` |
| `thue-xe/` | `car_rental` | `thue-xe/database.sql` |
| `vesinhcare/` | *(xem docs)* | *(xem `vesinhcare/docs/`)* |

Cách import:
1. Chọn database vừa tạo trong phpMyAdmin
2. Chuyển sang tab **Import**
3. Chọn file `.sql` tương ứng → nhấn **Go**

#### Bước 4 – Truy cập ứng dụng

Mở trình duyệt và vào địa chỉ tương ứng:

```
http://localhost/GlobalCare/                                ← Trang chủ
http://localhost/GlobalCare/csbn/                           ← Chăm Sóc Bé & Nhi
http://localhost/GlobalCare/csmvb/                          ← Chăm Sóc Mẹ & Bé
http://localhost/GlobalCare/csng/                           ← Chăm Sóc Người Già
http://localhost/GlobalCare/giat-ui-nhanh/                  ← Giặt Ủi Nhanh
http://localhost/GlobalCare/he-thong-giao-hang-chuyen-don/  ← Hệ Thống Giao Hàng
http://localhost/GlobalCare/tho-nha/                        ← Thợ Nhà
http://localhost/GlobalCare/thue-xe/                        ← Thuê Xe
http://localhost/GlobalCare/vesinhcare/                     ← Vệ Sinh Care
```

---

### 5. Thông tin kết nối Database mặc định

Tất cả module PHP sử dụng cấu hình kết nối mặc định của XAMPP:

| Thông số | Giá trị |
|---|---|
| Host | `localhost` |
| Username | `root` |
| Password | *(để trống)* |

Nếu cấu hình MySQL của bạn khác, hãy chỉnh sửa file `config/database.php` (hoặc `config/db.php`) trong từng module tương ứng.

---

### 6. Ghi chú thêm

- Module `csmvb` lưu thông tin khách hàng vào cả MySQL và Google Sheets. Xem thêm tại `csmvb/README.md`.
- Tài liệu chi tiết của từng module nằm trong thư mục `docs/` hoặc file `README.md` bên trong mỗi module.
