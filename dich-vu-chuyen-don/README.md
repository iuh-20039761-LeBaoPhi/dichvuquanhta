# Dịch Vụ Chuyển Dọn

Website giới thiệu dịch vụ chuyển dọn tại TP.HCM, tập trung vào 3 nhóm chính:
- Chuyển nhà trọn gói
- Chuyển văn phòng công ty
- Chuyển kho bãi

Project hiện ưu tiên `UI / CSS / nội dung / SEO / điều hướng`. Phần khảo sát và đặt lịch đã được tách thành trang riêng ở mức giao diện, chưa nối backend xử lý yêu cầu thật.

## Phạm vi hiện tại

- Landing page riêng cho chuyển dọn
- Trang hub dịch vụ riêng
- 3 trang dịch vụ chi tiết
- Cụm cẩm nang và trang chi tiết bài viết
- Trang chính sách
- Trang khảo sát riêng
- Trang đặt lịch riêng

## Cấu trúc thư mục

```text
dich-vu-chuyen-don/
├── index.html
├── dich-vu-chuyen-don.html
├── cam-nang.html
├── khao-sat.html
├── dat-lich.html
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
        │       ├── moving-house.css
        │       ├── news.css
        │       ├── services-hub.css
        │       └── forms-standalone.css
        ├── js/
        │   ├── main.js
        │   ├── main-core.js
        │   ├── shared-layout.js
        │   ├── data/
        │   │   ├── news-data.json
        │   │   └── bang-gia-minh-bach.json
        │   └── modules/
        │       ├── main-landing.js
        │       ├── main-navigation.js
        │       ├── main-pricing.js
        │       ├── main-news.js
        │       └── main-forms.js
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
| `dich-vu-chuyen-don.html` | Trang hub dịch vụ, dẫn về 3 nhóm dịch vụ |
| `khao-sat.html` | Trang khảo sát riêng |
| `dat-lich.html` | Trang đặt lịch riêng |
| `cam-nang.html` | Danh sách cẩm nang |
| `chinh-sach-va-dieu-khoan.html` | Trang chính sách và điều khoản |
| `public/trang/dich-vu/chuyen-nha.html` | Trang chi tiết chuyển nhà |
| `public/trang/dich-vu/chuyen-van-phong.html` | Trang chi tiết chuyển văn phòng công ty |
| `public/trang/dich-vu/chuyen-kho-bai.html` | Trang chi tiết chuyển kho bãi |
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
- Gửi dữ liệu thật lên backend
- Lưu yêu cầu khảo sát
- Logic xử lý nghiệp vụ sau submit

## Form đặt lịch

`dat-lich.html` dùng partial [form-dat-lich.html](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\partials\bieu-mau\form-dat-lich.html).

Hiện đã có:
- Form đặt lịch riêng khỏi landing
- Nhịp bố cục đồng bộ với form khảo sát
- Hiện/ẩn chi tiết theo từng loại dịch vụ
- Summary cuối form

Chưa có:
- Submit thật
- Đồng bộ dữ liệu backend
- Tính giá / xác nhận đơn

## Ghi chú kỹ thuật

- Header và footer được load động qua [shared-layout.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\shared-layout.js)
- Logic khởi tạo chung nằm ở [main.js](e:\Thực tập Keri\Task\GlobalCare\dich-vu-chuyen-don\public\assets\js\main.js)
- CSS đang đi theo hướng `base / components / layout / pages`
- Tất cả HTML user-facing đều đã có `ga.js`

## Trạng thái hiện tại

- Cấu trúc thư mục đã được sắp lại
- Menu `Dịch vụ` trỏ sang `dich-vu-chuyen-don.html`
- Footer đã dọn bớt link không cần thiết
- Mobile cho form đã được tinh lại theo hướng đầy màn hình hơn
- Form khảo sát đang là phần được đầu tư UI nhiều nhất

## Liên hệ

- Thương hiệu: Dịch Vụ Chuyển Dọn
- Hotline: `0775 472 347`
- Email: `dichvuquanhta.vn@gmail.com`
- Khu vực phục vụ chính: TP. Hồ Chí Minh
