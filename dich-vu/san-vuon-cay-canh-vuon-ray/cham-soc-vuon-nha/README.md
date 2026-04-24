# Dự án Chăm sóc Mẹ và Bé (me-va-be)

Tài liệu này tóm tắt cấu trúc, luồng hoạt động và các cơ chế xử lý chính của module Chăm sóc Mẹ và Bé dành cho lập trình viên.

---

## 1. Cấu trúc Thư mục Chính
- `/don-hang/`: Quản lý danh sách và chi tiết đơn hàng.
- `/admin_mevabe/`: Hệ thống quản trị dành cho nhà cung cấp và quản trị viên.
- `/JS/`: Chứa mã nguồn Javascript quản lý giao diện (`shared-layout.js`, `user-nav-menu.js`).
- `/assets/`: Hình ảnh, logo và tài nguyên tĩnh.
- `session_user.php`: File hạt nhân quản lý toàn bộ phiên đăng nhập (Hợp nhất từ `session_auth.php`).

---

## 2. Hệ thống Xác thực & Phiên làm việc (Authentication)
Dự án sử dụng cơ chế xác thực "Hybrid" kết hợp giữa Session, Cookie và API bên thứ ba.

### File trung tâm: `session_user.php`
Đây là file duy nhất quản lý đăng nhập. Luồng hoạt động:
1. **Kiểm tra URL Params:** Nếu truy cập kèm `?sodienthoai=...&password=...`, hệ thống sẽ xóa session cũ, lưu Cookie mới qua JS và reload trang để bảo mật.
2. **Kiểm tra Timeout:** Sau 30 phút không hoạt động, session sẽ tự hủy.
3. **Đồng bộ Cookie (Auto-Sync):** Nếu session trống nhưng có Cookie `dvqt_u` và `dvqt_p`, PHP sẽ tự động gọi API `https://api.dvqt.vn/list/` để lấy thông tin người dùng và tái tạo session.
4. **Hỗ trợ AJAX:** Cho phép gọi qua `action=login`, `action=logout`, `action=current` để phục vụ giao diện Single Page hoặc Modals.

---

## 3. Luồng Xử lý Dữ liệu Đơn hàng
- **Lấy dữ liệu:** Sử dụng `don-hang/get-hoa-don.php` để kết nối với API trung tâm (`api.dvqt.vn`), lọc dữ liệu theo `id_dichvu` hoặc vai trò người dùng.
- **Phân trang & Tìm kiếm:** Xử lý trực tiếp trong `don-hang/index.php` bằng PHP thuần, giúp tốc độ tải nhanh và tối ưu SEO.
- **Trạng thái Đơn hàng:** Các đơn hàng được map màu sắc theo trạng thái (Chờ duyệt: Vàng, Đã nhận: Xanh lá, Đã xong: Xanh dương).

---

## 4. Hiển thị Hình ảnh & Avatars
Cơ chế hiển thị Avatar động để tối ưu dung lượng host:
- **Nguồn:** Ảnh được lưu trên Google Drive.
- **Hiển thị:** Sử dụng thẻ `<iframe>` hoặc link trực tiếp `https://drive.google.com/file/d/[FILE_ID]/preview`.
- **Fallback:** Nếu người dùng không có ảnh, hệ thống tự động hiển thị logo mặc định tại `assets/logomvb.png`.

---

## 5. Giao diện (Frontend Logic)
- **Navbar động (`JS/user-nav-menu.js`):**
    - Tự động thay đổi giữa nút "Đăng nhập" và "Menu người dùng" dựa trên trạng thái session.
    - Đồng bộ dữ liệu từ `localStorage` để giao diện phản hồi tức thì trước khi PHP kiểm tra xong.
- **Shared Layout (`JS/shared-layout.js`):** Tự động nạp Header và Footer từ các file HTML dùng chung, giảm thiểu lặp code.
- **Responsive:** Hệ thống CSS được tối ưu riêng cho iPad (768px - 1024px) và Mobile, đảm bảo bố cục không bị vỡ.

---

## 6. Quy trình Đặt lịch (dat-lich.html)
Trang dành cho khách hàng chọn dịch vụ, tính toán chi phí và thực hiện đặt lịch.

### Thuật toán Tính giá (Pricing Logic)
Hệ thống sử dụng công thức tính giá động dựa trên nhiều yếu tố:
- **Giá cơ bản:** `Giá gói / Số giờ gốc / Số đầu việc gốc * Số công việc chọn * Số giờ thực tế * Số ngày`.
- **Phụ phí ca đêm:** Tự động cộng **20%** nếu khung giờ làm việc rơi vào buổi đêm.
- **Phụ phí ngày lễ:** Tự động cộng **30%** nếu ngày bắt đầu trùng vào các ngày lễ.
- **Phí đi lại (Travel Fee):** Tính **5.000 VNĐ / 1km** dựa trên khoảng cách từ hệ thống đến vị trí khách hàng.
- **Tổng cộng:** `Giá cơ bản + Phụ phí đêm + Phụ phí lễ + Phí đi lại`.

### Xử lý Vị trí & Bản đồ (Location & Maps)
- **Leaflet JS:** Sử dụng thư viện Leaflet để hiển thị bản đồ và xác định tọa độ GPS của khách hàng.
- **Tự động điền địa chỉ:** Khi khách hàng nhấn "Lấy vị trí của tôi", hệ thống sử dụng Reverse Geocoding để chuyển tọa độ thành địa chỉ văn bản và tính toán khoảng cách (KM) để áp phí đi lại.

---

## 7. Hệ thống Quản trị (admin_mevabe)
Khu vực dành cho quản trị viên và nhà cung cấp quản lý vận hành dịch vụ.

### Xác thực & Phân quyền
- **Slidebar.php:** Chứa hàm `admin_require_login()`. Mọi file trong admin đều phải gọi hàm này để kiểm tra quyền truy cập.
- **Phân quyền:** Chỉ người dùng có `id_dichvu = 1` mới được phép truy cập vào khu vực quản trị này.

### Quản lý Dịch vụ (Catalog Management)
- **Luồng xử lý:** `them-dich-vu.php` -> `xu-ly-them-dich-vu.php`.
- **Cơ chế JSON:** Các trường phức tạp như danh sách công việc (`includes`) và bảng giá (`pricing`) được mã hóa thành chuỗi JSON trước khi lưu để giữ nguyên cấu trúc phân cấp.
- **Upload ảnh:** Ảnh được upload qua `upload.php`, sau đó trả về `fileId` của Google Drive để lưu vào DB.

### Quản lý Đơn hàng (Order Operations)
- **Trạng thái & Màu sắc:** Tự động map trạng thái chữ thành mã màu (Badge) để dễ nhận diện trong danh sách đơn.
- **Tính toán Tiến độ:** Tiến độ được tính dựa trên số ngày đã làm việc thực tế so với tổng số ngày dự kiến trong kế hoạch.
- **Xử lý Nhật ký:** Giao diện `chi-tiet-hoa-don.php` gộp các bản ghi lịch sử làm việc theo ngày để hiển thị dạng dòng thời gian (Timeline).

### Hạt nhân API (`admin_api_common.php`)
- Cung cấp các hàm wrapper (`admin_api_list_table`, `admin_api_insert_table`, `admin_api_update_table`) để tương tác đồng nhất với hệ thống API trung tâm `api.dvqt.vn`.
- Tự động chuẩn hóa dữ liệu trả về từ API (normalize rows) để tránh lỗi định dạng khi hiển thị.

---

## 8. Lưu ý cho Lập trình viên khi chỉnh sửa
1. **Sửa Logic Đăng nhập:** Chỉ sửa tại `session_user.php`. Không được tạo lại `session_auth.php`.
2. **Sửa Giao diện:** Lưu ý các Media Queries cho iPad trong file `chi-tiet-hoa-don-mevabe.php` vì chúng sử dụng `!important` để ghi đè style mobile.
3. **API:** Mọi thao tác lưu dữ liệu (Insert/Update) nên thông qua thư viện `DVQTApp` trong `public/asset/js/dvqt-app.js` hoặc `admin_api_common.php` để đảm bảo đồng bộ với Database trung tâm.

---

## 9. Cơ sở Dữ liệu (Database)

### Bảng `nguoidung` (Quản lý tài khoản)
Dùng để xác thực thông tin đăng nhập và phân quyền.
- **id**: ID định danh.
- **hovaten**: Họ và tên người dùng.
- **sodienthoai**: Số điện thoại (dùng làm tài khoản).
- **matkhau**: Mật khẩu (đang lưu dạng text thuần/mã hóa tùy giai đoạn).
- **email**: Địa chỉ email.
- **diachi**: Địa chỉ liên lạc.
- **link_avatar**: ID file Google Drive của ảnh đại diện.
- **id_dichvu**: Phân quyền (1: Nhà cung cấp, còn lại: Khách hàng).
- **trangthai**: Trình trạng tài khoản (`active`, `pending`).

### Bảng `datlich_mevabe` (Quản lý đơn đặt lịch)
Lưu trữ toàn bộ thông tin chi tiết về các đơn hàng dịch vụ Mẹ và Bé.
- **id**: Mã đơn hàng tự tăng (Primary Key).
- **tenkhachhang**: Tên khách hàng.
- **sdtkhachhang**: Số điện thoại khách hàng.
- **diachikhachhang**: Địa chỉ thực hiện dịch vụ.
- **emailkhachhang**: Email của khách hàng.
- **avatar_khachhang**: ID ảnh đại diện khách hàng (Google Drive fileId).
- **dich_vu**: Tên dịch vụ chính.
- **goi_dich_vu**: Tên gói dịch vụ.
- **tong_tien**: Tổng cộng tiền dịch vụ.
- **ngay_bat_dau_kehoach**: Ngày bắt đầu theo lịch hẹn.
- **ngay_ket_thuc_kehoach**: Ngày kết thúc theo lịch hẹn.
- **gio_bat_dau_kehoach**: Giờ bắt đầu cố định hàng ngày.
- **gio_ket_thuc_kehoach**: Giờ kết thúc cố định hàng ngày.
- **cong_viec**: Danh sách các đầu việc (Ngăn cách bởi dấu chấm `.`).
- **yeu_cau_khac**: Yêu cầu đặc biệt khác.
- **ghi_chu**: Ghi chú nội bộ.
- **anh_id**: ID ảnh thực tế (Google Drive fileId).
- **video_id**: ID video thực tế (Google Drive fileId).
- **trangthai**: Trạng thái đơn (chờ duyệt, đã nhận, đang thực hiện, hoàn thành, hủy, quá hạn).
- **tien_do**: Phần trăm tiến độ (0-100%).
- **id_nhacungcap**: ID nhân viên nhận việc.
- **tenncc / sdtncc / emailncc**: Thông tin nhân viên nhận việc.
- **thoigian_batdau_thucte**: Bắt đầu thực tế tổng thể.
- **thoigian_ketthuc_thucte**: Kết thúc thực tế tổng thể.
- **danhgia_khachhang / danhgia_nhanvien**: Nội dung đánh giá 2 chiều.
- **media_danhgia_khachhang / media_danhgia_nhanvien**: Media đính kèm đánh giá.

### Bảng `lich_su_lam_viec_mvb` (Chi tiết lịch sử làm việc)
Ghi nhật ký làm việc từng ngày của nhân viên.
- **id**: ID dòng lịch sử.
- **id_dv**: ID đơn hàng (FK).
- **ngay_lam**: Ngày làm việc thực tế.
- **gio_bat_dau_trong_ngay / gio_ket_thuc_trong_ngay**: Giờ làm việc trong ngày.
- **ghichu_cv_ngay**: Ghi chú công việc trong ca.
- **is_auto_end**: Đánh dấu hệ thống tự động kết thúc ca.

### Bảng `dichvu_mevabe` (Danh mục dịch vụ)
Lưu trữ thông tin các gói dịch vụ có sẵn.
- **id / name / image / alt / description**: Thông tin cơ bản.
- **includes**: Danh sách công việc (JSON).
- **pricing**: Cấu hình bảng giá (JSON).

---
*Cập nhật lần cuối: 20/04/2026*
