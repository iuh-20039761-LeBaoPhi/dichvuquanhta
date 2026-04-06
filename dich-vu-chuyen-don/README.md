# Dịch Vụ Chuyển Dọn

Website riêng cho dịch vụ chuyển dọn trong hệ sinh thái `Dịch Vụ Quanh Ta`, tập trung vào 3 nhóm chính:
- Chuyển nhà trọn gói
- Chuyển văn phòng công ty
- Chuyển kho bãi

Project hiện ưu tiên `UI / CSS / nội dung / SEO / điều hướng / trải nghiệm form`. Phần khảo sát, đặt lịch và tài khoản đang chạy theo hướng client-side demo, lưu dữ liệu cục bộ bằng `localStorage`, chưa nối hệ thống lưu trữ chính thức.

## Phạm vi hiện tại

- Landing page riêng cho chuyển dọn
- Một trang dịch vụ duy nhất, đổi nội dung theo từng nhóm nhu cầu
- 3 URL dịch vụ cũ giữ lại để chuyển hướng mềm
- Trang bảng giá tham khảo
- Cụm cẩm nang và trang chi tiết bài viết
- Trang chính sách
- Trang khảo sát riêng
- Trang đặt lịch riêng
- Cụm trang tài khoản:
  - `dang-nhap.html`
  - `dang-ky.html`

## Cấu trúc thư mục

```text
dich-vu-chuyen-don/
├── index.html
├── dich-vu-chuyen-don.html
├── bang-gia-chuyen-don.html
├── cam-nang.html
├── khao-sat.html
├── dat-lich.html
├── dang-nhap.html
├── dang-ky.html
├── chinh-sach-va-dieu-khoan.html
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
        │       ├── auth.css
        │       ├── services-hub.css
        │       ├── transparent-pricing.css
        │       └── moving-house.css
        ├── js/
        │   ├── main.js
        │   ├── main-core.js
        │   ├── shared-layout.js
        │   ├── data/
        │   │   ├── news-data.json
        │   │   └── bang-gia-minh-bach.json
        │   └── modules/
        │       ├── main-navigation.js
        │       ├── main-landing.js
        │       ├── main-news.js
        │       ├── main-pricing.js
        │       ├── main-transparent-pricing.js
        │       ├── main-forms.js
        │       └── main-auth.js
        ├── partials/
        │   └── bieu-mau/
        │       ├── form-khao-sat.html
        │       └── form-dat-lich.html
        └── images/
```

## Các trang chính

| Trang | Vai trò |
|---|---|
| `index.html` | Landing page của dịch vụ chuyển dọn |
| `dich-vu-chuyen-don.html` | Trang dịch vụ duy nhất, chuyển nội dung trong cùng trang theo 3 nhóm nhu cầu |
| `bang-gia-chuyen-don.html` | Trang bảng giá tham khảo và minh bạch thông tin |
| `khao-sat.html` | Trang khảo sát riêng |
| `dat-lich.html` | Trang đặt lịch riêng |
| `dang-nhap.html` | Trang đăng nhập, chọn vai trò khách hàng hoặc đối tác cung ứng |
| `dang-ky.html` | Trang đăng ký, chọn vai trò khách hàng hoặc đối tác cung ứng |
| `cam-nang.html` | Danh sách cẩm nang |
| `chinh-sach-va-dieu-khoan.html` | Trang chính sách và điều khoản |
| `public/trang/dich-vu/chuyen-nha.html` | URL cũ, chuyển hướng về tab chuyển nhà trên trang dịch vụ |
| `public/trang/dich-vu/chuyen-van-phong.html` | URL cũ, chuyển hướng về tab chuyển văn phòng trên trang dịch vụ |
| `public/trang/dich-vu/chuyen-kho-bai.html` | URL cũ, chuyển hướng về tab chuyển kho bãi trên trang dịch vụ |
| `public/trang/noi-dung/cam-nang-chi-tiet.html` | Trang chi tiết bài viết |

## Form khảo sát

`khao-sat.html` dùng partial [form-khao-sat.html](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\partials\bieu-mau\form-khao-sat.html) và module [main-forms.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-forms.js).

Hiện đã có:
- Form chia section theo ngữ cảnh nghiệp vụ
- Hiện/ẩn trường theo loại dịch vụ
- `id`, `class`, `name`, `data-*` dùng tiếng Việt không dấu
- Bản đồ khảo sát dùng Leaflet
- 2 ghim cố định cho điểm khảo sát và điểm đến
- Tự lấy vị trí hiện tại cho điểm khảo sát
- Box tóm tắt nhanh trước khi gửi

Chưa có:
- Gửi dữ liệu chính thức lên hệ thống CRUD / Google Sheets
- Logic xử lý nghiệp vụ sau submit

## Form đặt lịch

`dat-lich.html` dùng partial [form-dat-lich.html](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\partials\bieu-mau\form-dat-lich.html) và module [main-forms.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-forms.js).

Hiện đã có:
- Form đặt lịch riêng khỏi landing
- Nhịp bố cục đồng bộ với form khảo sát
- Hiện/ẩn chi tiết theo từng loại dịch vụ
- Summary cuối form

Chưa có:
- Đồng bộ dữ liệu sang hệ thống lưu trữ chính thức
- Tính giá / xác nhận đơn

## Tài khoản đăng nhập / đăng ký

`dang-nhap.html` và `dang-ky.html` dùng module [main-auth.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\modules\main-auth.js) và style [auth.css](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\css\pages\auth.css).

Hiện đã có:
- Menu `Tài khoản` dùng chung qua `header.html`
- 2 luồng vai trò:
  - Khách hàng
  - Đối tác cung ứng
- Chuyển vai trò ngay trong trang đăng nhập / đăng ký
- Ghi nhớ vai trò gần nhất bằng `localStorage`
- Autofill lại một số dữ liệu đã nhập gần nhất
- Validate client-side:
  - Email đúng định dạng
  - Số điện thoại Việt Nam
  - Tên / đơn vị / người phụ trách theo độ dài hợp lệ
  - Mật khẩu đăng ký có chữ hoa, chữ thường, số và đủ độ dài
  - Mật khẩu xác nhận phải khớp
- Checkbox điều khoản bắt buộc
- Các trường đặc thù của đối tác cung ứng bắt buộc
- Hiển thị lỗi inline dưới từng trường
- Đăng ký / đăng nhập demo bằng `localStorage`
- Lưu phiên và thông tin hồ sơ cục bộ để dùng lại cho dashboard khách hàng

Chưa có:
- Dashboard riêng cho từng vai trò
- Giao diện quản trị / duyệt đối tác
- Phân quyền sâu cho khu vực nội bộ

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
- Form khảo sát và đặt lịch đã có bố cục riêng, không còn phụ thuộc landing
- Khu vực tài khoản đã có giao diện hoàn chỉnh, validate client-side và lưu dữ liệu demo cục bộ
- Footer hiện không chứa link auth, auth được gom trong menu `Tài khoản`

## Liên hệ

- Thương hiệu: Dịch Vụ Chuyển Dọn
- Hotline: `0775 472 347`
- Email: `dichvuquanhta.vn@gmail.com`
- Khu vực phục vụ chính: TP. Hồ Chí Minh
