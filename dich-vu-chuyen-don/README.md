# Dịch vụ Chuyển Dọn - Giải Pháp Di Dời Trọn Gói

Website giới thiệu dịch vụ vận chuyển và di dời chuyên nghiệp tại TP.HCM, bao gồm chuyển nhà, chuyển văn phòng và chuyển kho bãi.

---

## 🚀 Tính Năng Chính

- **Chuyển nhà trọn gói:** Tháo lắp nội thất, đóng gói bảo vệ đồ dễ vỡ, vận chuyển và sắp xếp tại nhà mới.
- **Chuyển văn phòng:** Di dời thiết bị IT, hồ sơ bảo mật, tháo lắp nội thất, triển khai ngoài giờ hành chính giảm gián đoạn.
- **Chuyển kho bãi:** Xử lý hàng pallet, hàng nặng, máy móc với xe nâng và xe cẩu chuyên dụng, kiểm kê nghiệm thu.
- **Tính toán báo giá nhanh:** Ước tính chi phí vận chuyển ngay trên web.
- **Đặt lịch trực tuyến:** Biểu mẫu đặt dịch vụ tích hợp modal trên mọi trang.
- **Tra cứu đơn hàng:** Theo dõi trạng thái đơn hàng theo mã.

---

## 📂 Cấu Trúc Thư Mục

```
Vanchuyen/
├── index.html                  # Trang chủ
├── includes/
│   ├── header.html             # Header dùng chung
│   └── footer.html             # Footer dùng chung
└── public/
    ├── chuyen-nha.html         # Trang dịch vụ chuyển nhà
    ├── chuyen-van-phong.html   # Trang dịch vụ chuyển văn phòng
    ├── chuyen-kho-bai.html     # Trang dịch vụ chuyển kho bãi
    ├── policy.html             # Trang chính sách
    └── assets/
        ├── css/
        │   ├── styles.css              # Entry point CSS (import các module)
        │   ├── base/                   # CSS reset, typography, variables
        │   ├── components/             # Button, card, modal, badge, ...
        │   ├── layout/                 # Header, footer, grid, section
        │   ├── pages/
        │   │   ├── landing.css         # CSS trang chủ
        │   │   └── moving-house.css    # CSS trang dịch vụ chuyển dọn
        ├── js/
        │   ├── shared-layout.js        # Load header/footer động
        │   ├── shared-modals.js        # Modal đặt dịch vụ & tra cứu đơn
        │   ├── main.js                 # Khởi tạo chung, load modules
        │   ├── data/
        │   │   └── news-data.js        # Dữ liệu cho trang tin tức
        │   └── modules/                # Các module chức năng
        │       ├── main-landing.js     # Logic trang chủ
        │       ├── main-navigation.js  # Navigation & scroll behavior
        │       ├── main-order.js       # Logic tính phí & đặt đơn hàng
        │       └── main-news.js        # Logic trang tin tức
        ├── images/                     # Hình ảnh hero, dịch vụ, nhân sự
        └── partials/
            └── shared-modals.html      # Template HTML cho các modal
```

---

## 🛠 Công Nghệ Sử Dụng

- **Frontend:** HTML5, CSS3 (Vanilla CSS + Tailwind CSS CDN), JavaScript ES6+
- **CSS Architecture:** Modular CSS chia theo `base / components / layout / pages`
- **Thư viện JS:** SwiperJS (slider đánh giá khách hàng)
- **Icons:** SVG inline (không phụ thuộc thư viện ngoài)
- **Fonts:** Google Fonts — Poppins, Inter

---

## 📄 Các Trang

| Trang | Mô tả |
|-------|-------|
| `index.html` | Trang chủ: hero, giới thiệu dịch vụ, quy trình, cước phí, đánh giá, liên hệ |
| `chuyen-nha.html` | Dịch vụ chuyển nhà: 6 hạng mục dịch vụ có ảnh, quy trình 4 bước, lưu ý báo giá |
| `chuyen-van-phong.html` | Dịch vụ chuyển văn phòng: 6 hạng mục, lưu ý về IT & tầng cao |
| `chuyen-kho-bai.html` | Dịch vụ chuyển kho bãi: 6 hạng mục, lưu ý xe nâng & kiểm kê |
| `policy.html` | Chính sách dịch vụ, điều khoản sử dụng |

---

## 📞 Thông Tin Liên Hệ

- **Thương hiệu:** Dịch vụ Chuyển Dọn
- **Email:** [dichvuquanhta.vn@gmail.com](mailto:dichvuquanhta.vn@gmail.com)
- **Hotline:** 0775 472 347
- **Địa chỉ:** TP. Hồ Chí Minh

---

© 2026 Dịch vụ Chuyển Dọn. Bảo lưu mọi quyền.
