# Dự án Chăm sóc Vườn nhà (cham-soc-vuon-nha)

Tài liệu này tóm tắt cấu trúc, luồng hoạt động và các cơ chế xử lý chính của module **Chăm sóc Vườn nhà** dành cho lập trình viên.

---

## 1. Cấu trúc Thư mục Chính
* `/don-hang/`: Quản lý danh sách và chi tiết đơn hàng dịch vụ làm vườn.
* `/admin/`: Hệ thống quản trị dành cho nhà cung cấp và quản trị viên mảng sân vườn.
* `/JS/`: Mã nguồn Javascript quản lý giao diện (`shared-layout.js`, `user-nav-menu.js`).
* `/assets/`: Hình ảnh, logo và tài nguyên tĩnh (Logo mặc định: `logocsv.png`).
* `session_user.php`: File hạt nhân quản lý toàn bộ phiên đăng nhập.

---

## 2. Hệ thống Xác thực & Phiên làm việc (Authentication)
Dự án sử dụng cơ chế xác thực "Hybrid" kết hợp giữa Session, Cookie và API bên thứ ba.

### File trung tâm: `session_user.php`
1. **Kiểm tra URL Params:** Tự động bắt `sodienthoai` & `password` để tái tạo phiên.
2. **Kiểm tra Timeout:** Tự hủy session sau 30 phút không hoạt động.
3. **Đồng bộ Cookie (Auto-Sync):** Tự động gọi API `https://api.dvqt.vn/list/` để lấy thông tin nếu session trống nhưng còn Cookie hợp lệ.

---

## 3. Luồng Xử lý Dữ liệu Đơn hàng
* **Lấy dữ liệu:** Kết nối API trung tâm thông qua `don-hang/get-hoa-don.php`.
* **Trạng thái Đơn hàng:** 
    * 🟡 **Chờ duyệt:** Vàng
    * 🟢 **Đã nhận:** Xanh lá
    * 🔵 **Đã xong:** Xanh dương

---

## 4. Quy trình Đặt lịch (dat-lich.html)

### Thuật toán Tính giá (Pricing Logic)
`Tổng tiền = Giá cơ bản + Phụ phí đêm (20%) + Phụ phí lễ (30%) + Phí đi lại`

* **Phí đi lại:** 5.000 VNĐ / 1km (Tính từ hệ thống đến địa chỉ vườn).

### Bản đồ & GPS
* Sử dụng **Leaflet JS** để xác định tọa độ vườn.
* **Reverse Geocoding:** Chuyển tọa độ thành địa chỉ văn bản để tính khoảng cách (KM).

---

## 5. Hệ thống Quản trị (admin_chamsocvuon)

* **Xác thực:** Mọi file phải gọi hàm `admin_require_login()` từ `Slidebar.php`.
* **Phân quyền:** Chỉ người dùng có `id_dichvu = 5` (Nhà cung cấp/Admin).
* **Cơ chế JSON:** Các trường `includes` (đầu việc làm vườn) và `pricing` được lưu dạng JSON trong Database.

---

## 6. Cơ sở Dữ liệu (Database Schema)

### Bảng `datlich_chamsocvuon` (Đơn hàng)
| Trường | Mô tả |
| :--- | :--- |
| `id` | Primary Key |
| `diachikhachhang` | Địa chỉ khu vườn thực hiện dịch vụ |
| `dich_vu` | Loại hình (Chăm sóc cây, cắt cỏ, thiết kế...) |
| `cong_viec` | Danh sách đầu việc (Ngăn cách bởi dấu `.`) |
| `trangthai` | chờ duyệt, đã nhận, đang thực hiện, hoàn thành, hủy |
| `tien_do` | Phần trăm tiến độ bảo trì (0-100%) |
| `anh_id` / `video_id` | Google Drive FileID hiện trạng vườn |

### Bảng `lich_su_lam_viec_csv` (Nhật ký)
* `id_dv`: Foreign Key nối với bảng đơn hàng.
* `ghichu_cv_ngay`: Ghi chú chi tiết công việc tại vườn (vd: bón phân, thay đất).

---

## 7. Lưu ý khi Chỉnh sửa
1. **Login Logic:** Tuyệt đối không tạo lại `session_auth.php`, chỉ sửa tại `session_user.php`.
2. **Giao diện:** File `chi-tiet-hoa-don-chamsocvuon.php` chứa CSS `!important` cho iPad, cần lưu ý khi thay đổi layout.
3. **API:** Luôn ưu tiên dùng thư viện `DVQTApp` để tương tác với DB trung tâm.

---
*Cập nhật lần cuối: 08/05/2026*
