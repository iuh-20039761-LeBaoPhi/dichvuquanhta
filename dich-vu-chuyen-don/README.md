# Dịch Vụ Chuyển Dọn

Website riêng cho dịch vụ chuyển dọn trong hệ sinh thái `Dịch Vụ Quanh Ta`, tập trung vào 3 nhóm chính:

- Chuyển nhà trọn gói
- Chuyển văn phòng công ty
- Chuyển kho bãi

Project hiện đã đi qua giai đoạn landing/form cơ bản và đang có thêm các luồng portal sau đăng nhập cho `khách hàng` và `nhà cung cấp`. Luồng đặt lịch đang lưu vào KRUD, đồng bộ Google Sheets, và menu đăng nhập / đăng ký đã dùng form chung của `Dịch Vụ Quanh Ta`.

## Phạm vi hiện tại

- Landing page riêng cho chuyển dọn
- Một trang dịch vụ tổng hợp cho 3 nhóm nhu cầu chính
- 3 URL dịch vụ cũ giữ lại để chuyển hướng mềm
- Trang bảng giá tham khảo
- Cụm cẩm nang và trang chi tiết bài viết
- Trang chính sách
- Trang đặt lịch riêng
- URL khảo sát cũ giữ lại để chuyển hướng mềm về trang đặt lịch
- Portal khách hàng sau đăng nhập
- Portal nhà cung cấp sau đăng nhập

## Cấu trúc thư mục

```text
dich-vu-chuyen-don/
├── index.html
├── dich-vu-chuyen-don.html
├── bang-gia-chuyen-don.html
├── cam-nang.html
├── dat-lich.html
├── khao-sat.html
├── chinh-sach-va-dieu-khoan.html
├── khach-hang/
│   ├── dashboard.html
│   ├── lich-su-yeu-cau.html
│   ├── chi-tiet-hoa-don.html
│   └── ho-so.html
├── nha-cung-cap/
│   ├── dashboard.html
│   ├── cong-viec.html
│   ├── chi-tiet-don.html
│   └── ho-so.html
├── includes/
│   ├── header.html
│   └── footer.html
└── public/
    ├── trang/
    │   ├── dich-vu/
    │   │   ├── chuyen-nha.html
    │   │   ├── chuyen-van-phong.html
    │   │   └── chuyen-kho-bai.html
    │   └── noi-dung/
    │       └── cam-nang-chi-tiet.html
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
        │       └── form-dat-lich.html
        └── images/
```

## Các trang chính

| Trang                                          | Vai trò                                                         |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `index.html`                                   | Landing page của dịch vụ chuyển dọn                             |
| `dich-vu-chuyen-don.html`                      | Trang dịch vụ tổng hợp cho 3 nhóm nhu cầu chuyển dọn            |
| `bang-gia-chuyen-don.html`                     | Trang bảng giá tham khảo và minh bạch thông tin                 |
| `dat-lich.html`                                | Trang đặt lịch riêng                                            |
| `khao-sat.html`                                | URL cũ, chuyển hướng về `dat-lich.html`                         |
| `khach-hang/dashboard.html`                    | Dashboard khách hàng sau đăng nhập                              |
| `khach-hang/lich-su-yeu-cau.html`              | Danh sách đơn hàng của khách hàng                               |
| `khach-hang/chi-tiet-hoa-don.html`             | Chi tiết một đơn đặt lịch của khách hàng                        |
| `khach-hang/ho-so.html`                        | Hồ sơ và đổi mật khẩu của khách hàng                            |
| `nha-cung-cap/dashboard.html`                  | Dashboard nhà cung cấp                                          |
| `nha-cung-cap/cong-viec.html`                  | Danh sách việc chuyển dọn cho nhà cung cấp                      |
| `nha-cung-cap/chi-tiet-don.html`               | Chi tiết đơn và thao tác nhận/triển khai của nhà cung cấp       |
| `nha-cung-cap/ho-so.html`                      | Hồ sơ và đổi mật khẩu của nhà cung cấp                          |
| `cam-nang.html`                                | Danh sách cẩm nang                                              |
| `chinh-sach-va-dieu-khoan.html`                | Trang chính sách và điều khoản                                  |
| `public/trang/dich-vu/chuyen-nha.html`         | URL cũ, chuyển hướng về tab chuyển nhà trên trang dịch vụ       |
| `public/trang/dich-vu/chuyen-van-phong.html`   | URL cũ, chuyển hướng về tab chuyển văn phòng trên trang dịch vụ |
| `public/trang/dich-vu/chuyen-kho-bai.html`     | URL cũ, chuyển hướng về tab chuyển kho bãi trên trang dịch vụ   |
| `public/trang/noi-dung/cam-nang-chi-tiet.html` | Trang chi tiết bài viết                                         |

## Luồng khảo sát

- Không còn form khảo sát riêng trong runtime.
- Nhu cầu khảo sát được gộp vào [form-dat-lich.html](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\partials\bieu-mau\form-dat-lich.html) bằng checkbox `Cần nhà cung cấp khảo sát trước (+150.000/lượt)`.
- `khao-sat.html` chỉ còn vai trò URL cũ để chuyển hướng về `dat-lich.html`.

## Form đặt lịch

`dat-lich.html` dùng partial [form-dat-lich.html](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\partials\bieu-mau\form-dat-lich.html), module UI [main-forms.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-forms.js) và lớp API [main-booking-api.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-booking-api.js).

Hiện đã có:

- Form đặt lịch riêng khỏi landing
- Hiện/ẩn chi tiết theo từng loại dịch vụ
- Summary cuối form
- Checkbox `Cần nhà cung cấp khảo sát trước (+150.000/lượt)` ngay trong bước đầu tiên
- Lưu dữ liệu vào KRUD và đồng bộ Google Sheets

Chưa có:

- Tính giá / xác nhận đơn

## Tài khoản / phiên người dùng

- Menu `Tài khoản` của chuyển dọn trỏ sang form chung:
  - `../public/dang-nhap.html?service=chuyendon`
  - `../public/dang-ky.html?service=chuyendon`
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

## Liên hệ

- Thương hiệu: Dịch Vụ Chuyển Dọn
- Hotline: `0775 472 347`
- Email: `dichvuquanhta.vn@gmail.com`
- Khu vực phục vụ chính: TP. Hồ Chí Minh
