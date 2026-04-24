# Giao Hàng Nhanh

README này dùng để nắm nhanh cấu trúc dự án `giao-hang-nhanh` trong workspace `GlobalCare`.

Mục tiêu của tài liệu:

- biết trang nào đang chạy bằng file nào
- biết sửa UI ở đâu, sửa logic ở đâu, sửa dữ liệu ở đâu
- tránh nhầm với các project khác cùng repo như `dich-vu-chuyen-don`, `giat-ui-nhanh`, `cham-soc-me-va-be`

## 1. Bối cảnh kỹ thuật

`giao-hang-nhanh` hiện là frontend tĩnh `HTML/CSS/JS`.

Nguồn dữ liệu chính:

- KRUD: đọc/ghi dữ liệu đơn hàng và tài khoản
- KRUD bảng giá: nguồn chính cho cấu hình giá admin; `pricing-data.json` chỉ là cache/export cho public calculator
- `localStorage` / `sessionStorage`: giữ session cục bộ, fallback tạm, draft form

Không nên hiểu project này là app PHP fullstack duy nhất. Phần giao diện khách hàng/shipper hiện tại chủ yếu là frontend tĩnh + KRUD. Riêng cụm `admin-giaohang/...` vẫn dùng PHP để render admin và JavaScript để đồng bộ dữ liệu KRUD.

## 2. Phạm vi dự án

Chỉ các file dưới đây mới là của `giao-hang-nhanh`:

- `giao-hang-nhanh/...`

Lưu ý quan trọng:

- `dich-vu-chuyen-don/...` là project khác
- nếu đang sửa GHN mà mở nhầm file ở project khác thì thay đổi sẽ không có tác dụng trên trang GHN

## 3. Bảng dữ liệu chính

| Mục đích | Tên bảng |
|---|---|
| Đơn đặt lịch giao hàng | `giaohangnhanh_dat_lich` |
| Tài khoản dùng chung hệ sinh thái | `nguoidung` |
| Phiên bản bảng giá nội bộ | `ghn_pricing_versions`, `ghn_pricing_meta` |
| Cấu hình bảng giá | `ghn_goi_dich_vu`, `ghn_gia_goi_theo_vung`, `ghn_loai_hang`, `ghn_khung_gio_dich_vu`, `ghn_dieu_kien_giao`, `ghn_phuong_tien`, `ghn_cau_hinh_khoang_cach`, `ghn_cau_hinh_tai_chinh` |
| Dữ liệu phụ trợ bảng giá | `ghn_thanh_pho`, `ghn_quan_huyen`, `ghn_vung_giao_hang`, `ghn_goi_y_phuong_tien`, `ghn_pricing_chunks` |

Một số field quan trọng của đơn:

- mã đơn hiển thị cho người dùng: `ma_don_hang_noi_bo`
- id bản ghi KRUD: `id`
- trạng thái: `trang_thai`, `status`
- mốc nhận đơn: `thoidiemnhandon`, `ngaynhan`
- mốc bắt đầu: `ngaybatdauthucte`
- mốc hoàn thành: `ngayhoanthanhthucte`
- mốc hủy: `ngayhuy`
- chi tiết giá cước: `chi_tiet_gia_cuoc`, `chi_tiet_gia_cuoc_json`
- tổng cước: `tong_cuoc`
- khoảng cách: `khoang_cach_km`

## 4. Sơ đồ entrypoint

### Trang landing / các trang public thường

Entry HTML:

- `index.html`
- `dich-vu-giao-hang.html`
- `huong-dan-su-dung-dich-vu-giao-hang-nhanh.html`
- `tra-cuu-gia-giaohang.html`
- `tra-don-hang-giaohang.html`

JS bootstrap:

- `public/assets/js/main.js`

`main.js` sẽ nạp tiếp:

- `public/assets/js/main-core.js`
- `public/assets/js/modules/main-navigation.js`
- `public/assets/js/modules/main-tracking.js`
- `public/assets/js/modules/main-landing.js`

### Trang đặt lịch

Entry HTML:

- `dat-lich-giao-hang-nhanh.html`

Các lớp chính:

- `public/assets/js/modules/main-forms.js`
  Dùng để nhúng partial form vào host `#booking-form-host`.

- `public/assets/partials/bieu-mau/form-dat-lich-giao-hang.html`
  Là HTML form thật của bước đặt lịch.

- `public/assets/js/dat-lich.js`
  Bootstrap mỏng để nạp 4 file con của flow đặt lịch.

Các file con của form đặt lịch:

- `public/assets/js/dat-lich/core.js`
  State chung của form, mode giao hàng, khung giờ, thời tiết, helper UI, init.

- `public/assets/js/dat-lich/map-reorder.js`
  Bản đồ, geocode, tính khoảng cách, reorder/prefill từ đơn cũ.

- `public/assets/js/dat-lich/pricing.js`
  Tính cước, render card gói cước, breakdown phí, tạm tính dưới map.

- `public/assets/js/dat-lich/flow-submit.js`
  Validate từng bước, màn review, build payload và submit đơn.

### Trang tra đơn

Entry HTML:

- `tra-don-hang-giaohang.html`

Logic chính:

- `public/assets/js/modules/main-tracking.js`

Dùng cho:

- tra cứu theo mã đơn
- hiển thị trạng thái, timeline, phí, shipper, lịch sử xử lý

### Trang chi tiết đơn hàng standalone

Entry HTML thật:

- `chi-tiet-don-hang-giaohang.html`

Hai file dưới đây chỉ redirect về trang trên:

- `public/khach-hang/chi-tiet-don-hang-giaohang.html`
- `public/nha-cung-cap/chi-tiet-don-hang-giaohang.html`

Nghĩa là:

- sửa trang chi tiết đơn hàng thì sửa ở `chi-tiet-don-hang-giaohang.html` và các module của nó
- không cần vá riêng ở `public/khach-hang/...` hay `public/nha-cung-cap/...`

Module chính của trang chi tiết:

- `public/assets/js/modules/order-detail-render.js`
  Render UI của trang chi tiết: hero, thông tin điều phối, chi tiết cước phí, liên hệ, kiện hàng, timeline, POD.

- `public/assets/js/modules/main-order-detail.js`
  Nạp dữ liệu, normalize field, merge KRUD + local, suy ra trạng thái, xử lý action `Hủy đơn`, `Nhận đơn`, `Bắt đầu`, `Hoàn thành`, lưu lại KRUD.

- `public/assets/js/modules/order-detail-actions.js`
  Bind form phản hồi khách hàng, ghi chú NCC, upload media.

### Portal khách hàng

Entry HTML:

- `public/khach-hang/dashboard-giaohang.html`
- `public/khach-hang/danh-sach-don-hang-giaohang.html`
- `public/khach-hang/ho-so-giaohang.html`

Logic chính:

- `public/assets/js/customer-portal.js`

Lưu ý upload hồ sơ:

- Upload bám pattern `me-va-be`: dùng tên `upload.php` theo từng khu, không dùng các tên proxy riêng kiểu `upload_avatar.php`, `upload_booking_media.php`, `upload_feedback_media.php`.
- `public/upload.php` dùng cho ảnh/video từ form đặt lịch, `folderKey = 27`.
- `public/khach-hang/upload.php` dùng cho khách hàng: `upload_kind = order_media` lưu `folderKey = 27`, `upload_kind = avatar` lưu `folderKey = 33`.
- `public/nha-cung-cap/upload.php` dùng cho nhà cung cấp/shipper: `upload_kind = order_media` lưu `folderKey = 27`, `upload_kind = avatar` lưu `folderKey = 33`.
- `CCCD` hiện chưa có proxy upload riêng trong GHN để map `folderKey` theo đúng thư mục dịch vụ.
- Vì chưa có chỗ/tuyến upload tách riêng cho `CCCD`, không tự ý vá Apps Script Google Drive / Google Sheet chỉ để ép lưu CCCD.
- Nếu sau này cần bật upload `CCCD`, phải tạo rõ proxy/file đích cho GHN trước rồi mới gắn `folderKey` tương ứng.

### Portal nhà cung cấp / shipper

Entry HTML:

- `public/nha-cung-cap/dashboard-giaohang.html`
- `public/nha-cung-cap/don-hang-giaohang.html`
- `public/nha-cung-cap/ho-so-giaohang.html`

Logic chính:

- `public/assets/js/shipper-portal.js`

### Admin bảng giá

Entry PHP:

- `admin-giaohang/public/admin_guide.php`
- `admin-giaohang/public/admin_pricing.php`
- `admin-giaohang/public/pricing_support.php`

Logic và partial chính:

- `admin-giaohang/includes/pricing/admin_pricing_logic.php`
  Đọc dữ liệu bảng giá, validate preview POST, dựng biến cho view.

- `admin-giaohang/includes/pricing/admin_pricing_sections.php`
  Render các bảng tóm tắt trong từng tab bảng giá.

- `admin-giaohang/includes/pricing/admin_pricing_modals.php`
  Render modal thêm/sửa/xóa.

- `admin-giaohang/lib/pricing_config_service.php`
  Dựng cấu trúc pricing từ KRUD theo bảng giá đang áp dụng, fallback JSON khi bootstrap lần đầu.

- `admin-giaohang/api/pricing_export.php`
  Export lại `public/data/pricing-data.json` cho public calculator.

JS admin:

- `admin-giaohang/public/assets/js/admin-pricing-krud.js`
  Xử lý submit form, lưu KRUD, export JSON, patch DOM.

- `admin-giaohang/public/assets/js/pricing-support.js`
  CRUD dữ liệu phụ trợ: thành phố, quận huyện, nhãn vùng. UI phiên bản bảng giá đã được ẩn; `pricing_version_id` vẫn dùng nội bộ để biết bảng giá đang áp dụng.

Tài liệu vận hành:

- `admin-giaohang/public/admin_guide.php`
  Trang hướng dẫn trong admin, mô tả toàn bộ chức năng quản trị, nguồn dữ liệu và giới hạn hiện tại.

## 5. Muốn sửa gì thì vào đâu

### Sửa form đặt lịch

Sửa layout HTML form:

- `public/assets/partials/bieu-mau/form-dat-lich-giao-hang.html`

Sửa state, khung giờ, thời tiết, mode giao hàng:

- `public/assets/js/dat-lich/core.js`

Sửa map, geocode, prefill lại đơn:

- `public/assets/js/dat-lich/map-reorder.js`

Sửa tạm tính, gói cước, breakdown phí:

- `public/assets/js/dat-lich/pricing.js`

Sửa validate và submit:

- `public/assets/js/dat-lich/flow-submit.js`

### Sửa trang chi tiết đơn hàng

Sửa bố cục / copy / block hiển thị:

- `public/assets/js/modules/order-detail-render.js`

Sửa alias field, lấy dữ liệu đúng từ payload, merge KRUD/local:

- `public/assets/js/modules/main-order-detail.js`

Sửa nút hành động, lưu trạng thái lên KRUD:

- `public/assets/js/modules/main-order-detail.js`

Sửa form phản hồi / ghi chú / media:

- `public/assets/js/modules/order-detail-actions.js`

### Sửa tra đơn

- `public/assets/js/modules/main-tracking.js`

### Sửa portal khách hàng

- `public/assets/js/customer-portal.js`

### Sửa portal shipper

- `public/assets/js/shipper-portal.js`

### Sửa admin bảng giá

Sửa trang hướng dẫn admin:

- `admin-giaohang/public/admin_guide.php`
- `admin-giaohang/includes/header_admin.php`

Sửa bảng giá chính:

- `admin-giaohang/public/admin_pricing.php`
- `admin-giaohang/includes/pricing/admin_pricing_sections.php`
- `admin-giaohang/includes/pricing/admin_pricing_modals.php`
- `admin-giaohang/includes/pricing/admin_pricing_logic.php`
- `admin-giaohang/public/assets/js/admin-pricing-krud.js`

Sửa dữ liệu phụ trợ bảng giá:

- `admin-giaohang/public/pricing_support.php`
- `admin-giaohang/public/assets/js/pricing-support.js`

Sửa mapping KRUD/JSON export:

- `admin-giaohang/lib/pricing_config_service.php`
- `admin-giaohang/api/pricing_export.php`

Lưu ý:

- Admin không hiển thị card “Phiên bản bảng giá” nữa.
- Không xóa `pricing_version_id`, `ghn_pricing_versions` hoặc `active_pricing_version_id` nếu chỉ muốn đơn giản UI. Các field/bảng này vẫn là khóa nội bộ để gom cấu hình giá đang áp dụng.

### Sửa CSS

CSS tổng:

- `public/assets/css/styles.css`

CSS riêng trang đặt lịch:

- `public/assets/css/pages/dat-lich.css`

CSS riêng trang chi tiết đơn:

- `public/assets/css/pages/order-detail.css`

Lưu ý:

- `styles.css` là entry CSS chung
- nhiều trang load qua `styles.css` rồi import page CSS bên trong

## 6. Luồng dữ liệu chính

### Đặt lịch

Luồng:

1. `dat-lich-giao-hang-nhanh.html`
2. `main-forms.js` nhúng partial form
3. `dat-lich.js` nạp các module con
4. người dùng nhập địa chỉ, hàng hóa, ngày/giờ, phương tiện
5. `pricing.js` tính cước và render gói
6. `flow-submit.js` build payload
7. ghi vào bảng `giaohangnhanh_dat_lich`

Payload lưu đơn đang gồm nhóm field quan trọng:

- thông tin người gửi / người nhận
- `ngay_lay_hang`, `khung_gio_lay_hang`, `ten_khung_gio_lay_hang`
- `du_kien_giao_hang`
- `phuong_tien`, `ten_phuong_tien`
- `khoang_cach_km`
- `tong_cuoc`
- `chi_tiet_gia_cuoc`
- `nguoi_tra_cuoc`
- `mat_hang`
- `ghi_chu_tai_xe`
- `gia_tri_thu_ho_cod`

### Chi tiết đơn hàng

Nguồn dữ liệu:

- ưu tiên KRUD
- nếu KRUD thiếu field thì merge từ local để không bị rỗng giao diện

Các hành động hiện có trên trang chi tiết:

- khách hàng: `Hủy đơn`
- shipper: `Nhận đơn`, `Bắt đầu`, `Hoàn thành`

Các nút này đang lưu lại KRUD qua `persistDetail()` trong `main-order-detail.js`.

### Tra đơn

Luồng tra đơn đọc từ:

- KRUD trước
- local/mock sau, để tránh vỡ UI nếu thiếu dữ liệu

### Bảng giá public

Luồng:

1. Admin chỉnh giá ở `admin_pricing.php` hoặc dữ liệu phụ trợ ở `pricing_support.php`
2. JS admin lưu thay đổi vào các bảng KRUD theo `pricing_version_id` đang áp dụng
3. Admin gọi `api/pricing_export.php`
4. API ghi lại `public/data/pricing-data.json`
5. Public calculator và form đặt lịch đọc JSON cache để tính nhanh phía client

Ghi nhớ:

- KRUD là nguồn chính.
- `public/data/pricing-data.json` là cache/export, không phải nguồn chỉnh sửa chính.
- UI phiên bản bảng giá đã bị ẩn khỏi admin; rollback/kích hoạt version cũ không còn là thao tác trên giao diện.

## 7. Quy ước trạng thái đang dùng

Trang chi tiết standalone GHN đang suy ra trạng thái chủ yếu từ các mốc:

- `ngayhuy` -> `cancelled`
- `ngayhoanthanhthucte` -> `completed`
- `ngaybatdauthucte` -> `shipping`
- nếu chưa có các mốc trên -> `pending`

Nhãn `Đã nhận đơn` hiện được suy ra từ:

- `thoidiemnhandon` hoặc `ngaynhan`

Lưu ý:

- GHN hiện không có một status riêng kiểu `accepted`
- UI có thể hiện `Đã nhận đơn` dù field `status` vẫn là `pending`
- điều này là do logic suy luận theo milestone trong `main-order-detail.js`

## 8. Các file dễ nhầm

### Chi tiết đơn hàng GHN

Đúng:

- `giao-hang-nhanh/chi-tiet-don-hang-giaohang.html`
- `giao-hang-nhanh/public/assets/js/modules/main-order-detail.js`
- `giao-hang-nhanh/public/assets/js/modules/order-detail-render.js`

Sai project:

- `dich-vu-chuyen-don/public/assets/css/pages/order-detail.css`

Nếu đang sửa GHN mà mở file CSS/JS của project khác thì giao diện GHN sẽ không đổi.

## 9. Các cụm còn cần nhớ

### Admin cũ

Thư mục:

- `admin-giaohang/...`

Đây là cụm admin PHP. Nó không phải trung tâm của flow khách hàng/shipper, nhưng vẫn là nơi quản lý bảng giá, dữ liệu phụ trợ, thống kê và hồ sơ admin.

Tài liệu riêng cho bảng giá admin:

- `admin-giaohang/includes/pricing/README-pricing-admin.md`

### Session / auth

Các file chính:

- `public/assets/js/local-auth.js`
- `public/assets/js/main-core.js`

Vai trò:

- đọc session local
- dùng cookie chung của hệ sinh thái nếu có
- hỗ trợ phân vai khách hàng / shipper

## 10. Tình trạng hiện tại theo module

### Đặt lịch

Đã tách thành 4 module con, dễ sửa hơn trước:

- `core.js`
- `map-reorder.js`
- `pricing.js`
- `flow-submit.js`

### Chi tiết đơn hàng

Đã gom UI của khách vãng lai / khách hàng / shipper về một trang standalone chung.

Muốn sửa:

- UI: sửa một chỗ chính ở `order-detail-render.js`
- data/action: sửa ở `main-order-detail.js`

### Portal khách và shipper

Vẫn là hai file lớn:

- `customer-portal.js`
- `shipper-portal.js`

Hai file này còn giữ một số logic riêng về normalize status, pricing, fallback dữ liệu.
Nghĩa là trong phạm vi toàn project vẫn chưa DRY tuyệt đối.

## 11. Gợi ý đọc code theo thứ tự

Nếu mới vào dự án, nên đọc theo thứ tự này:

1. `dat-lich-giao-hang-nhanh.html`
2. `public/assets/js/dat-lich.js`
3. `public/assets/js/dat-lich/core.js`
4. `public/assets/js/dat-lich/pricing.js`
5. `public/assets/js/dat-lich/flow-submit.js`
6. `chi-tiet-don-hang-giaohang.html`
7. `public/assets/js/modules/main-order-detail.js`
8. `public/assets/js/modules/order-detail-render.js`
9. `public/assets/js/modules/main-tracking.js`
10. `public/assets/js/customer-portal.js`
11. `public/assets/js/shipper-portal.js`

## 12. Checklist nhanh khi sửa lỗi

Nếu lỗi ở đặt lịch:

- check partial form
- check `core.js`
- check `pricing.js`
- check `flow-submit.js`

Nếu lỗi ở chi tiết đơn:

- check đúng có đang mở `giao-hang-nhanh` không
- check `main-order-detail.js` trước nếu lỗi dữ liệu
- check `order-detail-render.js` nếu lỗi hiển thị

Nếu lỗi ở khách hàng / shipper không đồng bộ:

- check file đó có phải redirect về `chi-tiet-don-hang-giaohang.html` hay không
- nếu là portal page thật thì vào `customer-portal.js` hoặc `shipper-portal.js`

---

Nếu cập nhật kiến trúc tiếp, nên sửa lại README này ngay sau khi đổi flow để tránh lặp lại tình trạng README cũ không còn khớp code hiện tại.
