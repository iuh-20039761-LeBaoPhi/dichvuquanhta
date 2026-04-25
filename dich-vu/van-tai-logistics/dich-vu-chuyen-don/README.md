# Dịch Vụ Chuyển Dọn

Website riêng cho dịch vụ chuyển dọn trong hệ sinh thái `Dịch Vụ Quanh Ta`, tập trung vào 3 nhóm chính:

- Chuyển nhà trọn gói
- Chuyển văn phòng công ty
- Chuyển kho bãi

Project hiện đã đi qua giai đoạn landing/form cơ bản và đang có thêm các luồng portal sau đăng nhập cho `khách hàng` và `nhà cung cấp`. Luồng đặt lịch đang lưu vào KRUD, đồng bộ Google Sheets, menu đăng nhập / đăng ký đã dùng form chung của `Dịch Vụ Quanh Ta`, và cụm admin chuyển dọn đã vận hành theo hướng `PHP session + KRUD + cấu hình local`.

## Phạm vi hiện tại

- Landing page riêng cho chuyển dọn
- Một trang dịch vụ tổng hợp cho 3 nhóm nhu cầu chính
- 3 URL dịch vụ cũ giữ lại để chuyển hướng mềm
- Trang bảng giá tham khảo
- Cụm cẩm nang và trang chi tiết bài viết
- Trang chính sách
- Trang đặt lịch riêng
- Portal khách hàng sau đăng nhập
- Portal nhà cung cấp sau đăng nhập
- Cụm admin riêng cho chuyển dọn theo hướng PHP session + KRUD + cấu hình local

## Cấu trúc thư mục

```text
dich-vu-chuyen-don/
├── admin-chuyendon/
│   ├── api/
│   ├── config/
│   ├── data/
│   ├── includes/
│   └── public/
│       ├── index.php
│       ├── login.php
│       ├── logout.php
│       ├── admin_stats.php
│       ├── users_manage.php
│       ├── orders_manage.php
│       ├── order_detail.php
│       ├── admin_pricing.php
│       ├── contact_manage.php
│       ├── articles_manage.php
│       ├── notifications.php
│       ├── admin_guide.php
│       └── admin_profile.php
├── index.html
├── dich-vu-chuyen-don.html
├── bang-gia-chuyen-don.html
├── cam-nang-chuyendon.html
├── dat-lich-chuyendon.html
├── chinh-sach-va-dieu-khoan-chuyendon.html
├── khach-hang/
│   ├── dashboard-chuyendon.html
│   ├── danh-sach-don-hang-chuyendon.html
│   ├── chi-tiet-hoa-don-chuyendon.html
│   ├── upload.php
│   └── ho-so-chuyendon.html
├── nha-cung-cap/
│   ├── dashboard-chuyendon.html
│   ├── cong-viec.html
│   ├── chi-tiet-don.html
│   ├── upload.php
│   └── ho-so-chuyendon.html
├── includes/
│   ├── header.html
│   └── footer.html
├── upload.php
└── public/
    ├── upload_settings.php
    ├── trang/
    │   ├── dich-vu/
    │   │   ├── chuyen-nha.html
    │   │   ├── chuyen-van-phong.html
    │   │   └── chuyen-kho-bai.html
    │   └── noi-dung/
    │       └── cam-nang-chi-tiet-chuyendon.html
    └── assets/
        ├── css/
        │   ├── styles.css
        │   ├── base/
        │   ├── components/
        │   ├── layout/
        │   └── pages/
        │       ├── landing.css
        │       ├── forms-standalone.css
        │       ├── services-hub.css
        │       ├── transparent-pricing.css
        │       └── moving-house.css
        ├── js/
        │   ├── main.js
        │   ├── main-core.js
        │   ├── shared-layout.js
        │   ├── data/
        │   │   ├── services-hub.json
        │   │   ├── news-data.json
        │   │   └── bang-gia-minh-bach.json
        │   └── modules/
        │       ├── main-navigation.js
        │       ├── main-landing.js
        │       ├── main-news.js
        │       ├── main-pricing.js
        │       ├── main-services-hub.js
        │       ├── main-transparent-pricing.js
        │       ├── main-forms.js
        │       └── main-auth.js
        ├── partials/
        │   └── bieu-mau/
        │       └── form-dat-lich-chuyendon.html
        └── images/
```

## Các trang chính

| Trang                                          | Vai trò                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `index.html`                                   | Landing page của dịch vụ chuyển dọn                             |
| `dich-vu-chuyen-don.html`                      | Trang dịch vụ tổng hợp cho 3 nhóm nhu cầu chuyển dọn            |
| `bang-gia-chuyen-don.html`                     | Trang bảng giá tham khảo và minh bạch thông tin                 |
| `dat-lich-chuyendon.html`                                | Trang đặt lịch riêng                                            |
| `admin-chuyendon/public/login.php`             | Đăng nhập admin chuyển dọn                                      |
| `admin-chuyendon/public/admin_stats.php`       | Dashboard admin: KPI, cảnh báo hồ sơ, đơn mới, liên hệ mới      |
| `admin-chuyendon/public/users_manage.php`      | Quản lý người dùng                                              |
| `admin-chuyendon/public/orders_manage.php`     | Quản lý đơn hàng                                                |
| `admin-chuyendon/public/order_detail.php`      | Chi tiết đơn hàng trong admin                                   |
| `admin-chuyendon/public/admin_pricing.php`     | Quản lý bảng giá                                                |
| `admin-chuyendon/public/contact_manage.php`    | Quản lý liên hệ gắn với dịch vụ chuyển dọn                      |
| `admin-chuyendon/public/articles_manage.php`   | Quản lý bài viết/cẩm nang                                       |
| `admin-chuyendon/public/notifications.php`     | Tổng hợp thông báo/cảnh báo vận hành                            |
| `admin-chuyendon/public/admin_guide.php`       | Hướng dẫn vận hành admin chuyển dọn                             |
| `admin-chuyendon/public/admin_profile.php`     | Cấu hình dung lượng upload tối đa                               |
| `khach-hang/dashboard-chuyendon.html`                    | Dashboard khách hàng sau đăng nhập                              |
| `khach-hang/danh-sach-don-hang-chuyendon.html`           | Danh sách đơn hàng của khách hàng                               |
| `khach-hang/chi-tiet-hoa-don-chuyendon.html`             | Chi tiết một đơn đặt lịch của khách hàng                        |
| `khach-hang/ho-so-chuyendon.html`                        | Hồ sơ và đổi mật khẩu của khách hàng                            |
| `nha-cung-cap/dashboard-chuyendon.html`                  | Dashboard nhà cung cấp                                          |
| `nha-cung-cap/cong-viec.html`                  | Danh sách việc chuyển dọn cho nhà cung cấp                      |
| `nha-cung-cap/chi-tiet-don.html`               | Chi tiết đơn và thao tác nhận/triển khai của nhà cung cấp       |
| `nha-cung-cap/ho-so-chuyendon.html`                      | Hồ sơ và đổi mật khẩu của nhà cung cấp                          |
| `cam-nang-chuyendon.html`                                | Danh sách cẩm nang                                              |
| `chinh-sach-va-dieu-khoan-chuyendon.html`                | Trang chính sách và điều khoản                                  |
| `public/trang/dich-vu/chuyen-nha.html`         | URL cũ, chuyển hướng về tab chuyển nhà trên trang dịch vụ       |
| `public/trang/dich-vu/chuyen-van-phong.html`   | URL cũ, chuyển hướng về tab chuyển văn phòng trên trang dịch vụ |
| `public/trang/dich-vu/chuyen-kho-bai.html`     | URL cũ, chuyển hướng về tab chuyển kho bãi trên trang dịch vụ   |
| `public/trang/noi-dung/cam-nang-chi-tiet-chuyendon.html` | Trang chi tiết bài viết                                         |

## Luồng khảo sát

- Không còn form khảo sát riêng trong runtime.
- Nhu cầu khảo sát được gộp vào [form-dat-lich-chuyendon.html](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\partials\bieu-mau\form-dat-lich-chuyendon.html) bằng checkbox `Cần nhà cung cấp khảo sát trước (+150.000)`.

## Admin chuyển dọn

- Cụm admin mới nằm tại [admin-chuyendon](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon)
- Hướng triển khai bám theo `giao-hang-nhanh`: có `login`, `session`, `includes`, `config`, `public`
- Dữ liệu vận hành admin hiện đọc/ghi chủ yếu qua KRUD dùng chung:
  - `nguoidung`
  - `dich_vu_chuyen_don_dat_lich`
  - `lien_he`
  - các bảng giá/chính sách liên quan
- Thư mục `data/` vẫn được giữ cho một số dữ liệu nội bộ/fallback và cấu hình local để dễ mang theo khi copy cả project
- Các màn hình đang có:
  - [admin_stats.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\admin_stats.php): dashboard KPI, cảnh báo hồ sơ, đơn mới, contact mới
  - [users_manage.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\users_manage.php): quản lý khách hàng và nhà cung cấp
  - [orders_manage.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\orders_manage.php): danh sách đơn, cập nhật trạng thái, mở chi tiết
  - [order_detail.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\order_detail.php): chi tiết một đơn trong admin
  - [admin_pricing.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\admin_pricing.php): quản lý bảng giá và phụ phí
  - [contact_manage.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\contact_manage.php): inbox liên hệ của riêng dịch vụ chuyển dọn
  - [articles_manage.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\articles_manage.php): quản lý cẩm nang
  - [notifications.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\notifications.php): tổng hợp cảnh báo vận hành
  - [admin_guide.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\admin_guide.php): tài liệu hướng dẫn vận hành cho đội admin
  - [admin_profile.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\admin_profile.php): cấu hình upload tối đa
- JS admin dùng wrapper [admin-api.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\assets\js\admin-api.js) để gọi KRUD, chuẩn hóa filter dùng chung và gom lỗi `try/catch` theo một chuẩn thống nhất
- Tài khoản mặc định:
  - `admin01`
  - `0901234569`
  - mật khẩu `Admin@123`
- Muốn chạy trên máy khác vẫn cần môi trường PHP/XAMPP hoặc web server có PHP, sau đó mở:
  - [login.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\login.php)

## Form đặt lịch

`dat-lich-chuyendon.html` dùng partial [form-dat-lich-chuyendon.html](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\partials\bieu-mau\form-dat-lich-chuyendon.html), module UI [main-forms.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-forms.js) và lớp API [main-booking-api.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-booking-api.js).

Hiện đã có:

- Form đặt lịch riêng khỏi landing
- Hiện/ẩn chi tiết theo từng loại dịch vụ
- Summary cuối form
- Checkbox `Cần nhà cung cấp khảo sát trước (+150.000)` ngay trong bước đầu tiên
- Lưu dữ liệu vào KRUD và đồng bộ Google Sheets

Chưa có:

- Tính giá / xác nhận đơn

## Quy ước upload Drive

- `movingServiceId = 12`
- Theo bảng folder dùng chung đã chốt:
  - `12` = ảnh dịch vụ web của `chuyển dọn`
  - `32` = ảnh/video từ form đặt lịch, đánh giá khách hàng, báo cáo/ghi chú của nhà cung cấp trong `chuyển dọn`
  - `33` = profile/avatar
- Ảnh/video của form đặt lịch, đánh giá khách hàng và báo cáo/ghi chú của nhà cung cấp đi qua các file `upload.php` riêng theo khu và dùng `folderKey = 32`
- Avatar khách hàng và nhà cung cấp đi qua `khach-hang/upload.php` hoặc `nha-cung-cap/upload.php` với `upload_kind = avatar`, dùng `folderKey = 33`
- `CCCD` trước/sau đi qua `khach-hang/upload.php` hoặc `nha-cung-cap/upload.php` với `upload_kind = cccd`, dùng `folderKey = 33`
- Nếu sau này phát sinh luồng upload ảnh dịch vụ riêng cho chuyển dọn thì dùng đúng `folderKey = 12`
- Dung lượng file upload tối đa được cấu hình từ [admin_profile.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\public\admin_profile.php)
- `admin_profile.php` ghi cấu hình qua [admin-chuyendon/api/settings.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\admin-chuyendon\api\settings.php)
- Frontend/public đọc ngưỡng hiện hành qua [public/upload_settings.php](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\upload_settings.php)
- Frontend sẽ chặn file vượt ngưỡng trước khi gửi request upload

## Tài khoản / phiên người dùng

- Menu `Tài khoản` của chuyển dọn trỏ sang form chung:
  - `../../../public/dang-nhap.html?service=chuyendon`
  - `../../../public/dang-ky.html?service=chuyendon`
- [main-auth.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-auth.js) chỉ còn giữ logic tạo tài khoản khách hàng tối giản từ form đặt lịch khi chưa có tài khoản.
- Portal khách hàng / nhà cung cấp của chuyển dọn đọc dữ liệu phiên cục bộ và đồng bộ lại từ bảng `nguoidung`.
- Hồ sơ khách hàng chỉ cho sửa `họ tên` và `email`; `số điện thoại` là định danh tài khoản nên đang ở chế độ chỉ đọc.

## Portal sau đăng nhập

### Khách hàng

- Dashboard: tổng quan số đơn và đơn gần đây
- Danh sách đơn hàng: lọc theo từ khóa, trạng thái, mở chi tiết đơn
- Chi tiết đơn: xem tạm tính, timeline trạng thái, tệp đính kèm, hủy đơn khi còn hợp lệ, gửi đánh giá khi đơn hoàn tất
- Hồ sơ: cập nhật họ tên/email và đổi mật khẩu

### Nhà cung cấp

- Dashboard: xem nhanh việc mới và KPI cơ bản
- Danh sách việc: lọc các yêu cầu chuyển dọn theo trạng thái / khảo sát
- Chi tiết đơn: nhận đơn, bắt đầu triển khai, hoàn tất, cập nhật ghi chú cho khách hàng
- Hồ sơ: cập nhật thông tin cơ bản và đổi mật khẩu

## Rule tự hủy đơn chờ nhận

- Áp dụng cho bảng `dich_vu_chuyen_don_dat_lich`
- Một đơn sẽ bị hệ thống tự hủy khi đồng thời thỏa các điều kiện:
  - Trạng thái vẫn còn ở nhóm `mới tiếp nhận`
  - Chưa có `accepted_at`
  - Chưa có `started_at`
  - Chưa có `completed_at`
  - Chưa ở trạng thái hủy
  - Thời gian từ `created_at` đến hiện tại đã quá `120 phút`
- Khi quét thấy đơn quá hạn, hệ thống cập nhật `status/trang_thai = da_huy`
- Nếu backend chấp nhận field `cancelled_at` thì sẽ ghi thêm mốc hủy; nếu không, hệ thống fallback về cập nhật trạng thái tối thiểu để không làm lỗi luồng
- Cơ chế hiện tại là `lazy sweep`: chạy khi khách hàng hoặc nhà cung cấp tải dữ liệu đơn hàng, chưa phải cron job nền độc lập

## Ghi chú kỹ thuật

- Header và footer được load động qua [shared-layout.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\shared-layout.js)
- Logic khởi tạo chung nằm ở [main.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\main.js)
- CSS đang đi theo hướng `base / components / layout / pages`
- Tất cả HTML user-facing đều đã có `ga.js`
- `main-core.js` đang cung cấp helper dùng chung cho format tiền, URL nội bộ và lỗi form

## Trạng thái hiện tại

- Cấu trúc thư mục đã được sắp lại theo hướng dễ bảo trì hơn
- Menu `Dịch vụ` trỏ sang `dich-vu-chuyen-don.html`
- Cụm bảng giá là nơi hiển thị giá tham khảo chính
- Trang dịch vụ đã được gom lại để tránh lặp nội dung giữa 3 nhóm nhu cầu
- Form đặt lịch đã là luồng tạo yêu cầu duy nhất; khảo sát chỉ còn là checkbox tùy chọn trong form
- Menu auth riêng của chuyển dọn đã được gỡ; đăng nhập / đăng ký dùng form chung của Dịch Vụ Quanh Ta
- Footer hiện không chứa link auth, auth được gom trong menu `Tài khoản`
- Portal khách hàng và nhà cung cấp đã có UI + luồng dữ liệu KRUD cơ bản
- Khu khách hàng đang chạy các thao tác thực: xem đơn, lọc đơn, xem chi tiết, hủy đơn, đánh giá, cập nhật hồ sơ, đổi mật khẩu
- Khu nhà cung cấp đang chạy các thao tác thực: xem việc, nhận đơn, bắt đầu triển khai, hoàn tất, cập nhật ghi chú
- Đơn chờ quá `120 phút` mà chưa có nhà cung cấp nhận sẽ bị tự hủy theo cơ chế lazy sweep hiện tại
- Admin chuyển dọn hiện đã có dashboard, notifications, contact inbox, quản lý cẩm nang, chi tiết đơn và cấu hình upload
- Filter `liên hệ` trong admin chỉ lấy các bản ghi được gắn đúng service chuyển dọn, tránh lẫn dữ liệu dịch vụ khác
- Logic kiểm tra hồ sơ nhà cung cấp đã được đồng bộ giữa `users`, `dashboard` và `notifications`, kể cả dữ liệu alias/legacy như `avatar_link`, `cccd_front_link`, `cccd_back_link`
- Mã đơn hiển thị và nhận diện trạng thái hoàn tất đã được đồng bộ giữa danh sách đơn, thông báo và trang chi tiết đơn
- Tầng `adminApi` đã được bọc `try/catch` để chuẩn hóa lỗi KRUD/API, đặc biệt cho các thao tác list/get/insert/update/delete và ensure table

## Liên hệ

- Thương hiệu: Dịch Vụ Chuyển Dọn
- Hotline: `0775 472 347`
- Email: `dichvuquanhta.vn@gmail.com`
- Khu vực phục vụ chính: TP. Hồ Chí Minh

