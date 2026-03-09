<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đặt vệ sinh nhà ở | Vệ sinh Care</title>
      <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/header.css">

    <!-- Style riêng cho trang dịch vụ -->
    <style>
        .service-options {
            display: none;
        }

        .service-banner {
            background: url("images/house-bg.jpg") center/cover no-repeat;
            padding: 80px 20px;
            color: white;
            text-align: center;
            position: relative;
        }

        .service-banner::before {
            content: "";
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.55);
        }

        .service-banner .content {
            position: relative;
            max-width: 800px;
            margin: auto;
        }
    </style>
</head>
<body>

<!-- ===== HEADER ===== -->
<?php require_once "header.php"; ?>

<!-- ===== BANNER ===== -->
<section class="service-banner">
    <div class="content">
        <h2>Đặt dịch vụ vệ sinh nhà ở</h2>
        <p>
            Giữ không gian sống luôn sạch sẽ – thoáng mát –
            an toàn cho cả gia đình bạn.
        </p>
    </div>
</section>

<!-- ===== FORM BOOKING ===== -->
<section class="container">
    <form id="bookingForm" class="booking-form" 
action="booking_process.php" method="POST">

<h3 class="form-title">Thông tin khách hàng</h3>

<input type="text" id="name" name="customer_name" placeholder="Họ và tên" required>

<input type="text" id="phone" name="phone" placeholder="Số điện thoại" required>

<h3 class="form-title">Địa chỉ nhà ở</h3>

<input type="text" name="address" placeholder="Số nhà, tên đường">

<div class="address-row">
<input type="text" name="district" placeholder="Quận / Huyện">
<input type="text" name="city" placeholder="Tỉnh / Thành phố">
</div>

<h3 class="form-title">Dịch vụ đã chọn</h3>

<div class="service-card active" data-value="Vệ sinh nhà ở">
🏠
<h4>Vệ sinh nhà ở</h4>
<p>Lau dọn theo yêu cầu – sạch toàn diện không gian sống</p>
</div>

<input type="hidden" id="service" name="service_type" value="Vệ sinh nhà ở">

 <h3 class="form-title">Chi tiết dịch vụ</h3>

<input type="number"
       name="area"
       placeholder="Diện tích cần vệ sinh (m²)"
       required>

<input type="number" name="rooms" placeholder="Số phòng (ví dụ: 3)">

<select name="cleaning_level">
    <option value="">Mức độ vệ sinh</option>
    <option value="Cơ bản">Dọn cơ bản</option>
    <option value="Dọn sâu">Dọn sâu</option>
    <option value="Sau xây dựng">Sau xây dựng</option>
</select>




<h3 class="form-title">Thời gian</h3>

<input type="date" name="booking_date" required>


<textarea name="note"
placeholder="Mô tả chi tiết công việc cần làm"></textarea>

<button type="submit" class="submit-btn">Gửi yêu cầu</button>

</form>

</section>

<!-- ===== MODAL SUCCESS ===== -->
<div id="successModal" class="modal">
    <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>🎉 Gửi yêu cầu thành công!</h2>
        <p>
            Chúng tôi đã nhận được yêu cầu vệ sinh nhà ở.<br>
            Nhân viên sẽ liên hệ xác nhận trong thời gian sớm nhất.
        </p>
        <button id="closeModalBtn">Đóng</button>
    </div>
</div>

<!-- ===== FOOTER ===== -->
<footer class="footer">
    <div class="container footer-content">

        <div class="footer-col">
            <h3>VỆ SINH CARE</h3>
            <p>
                Dịch vụ vệ sinh chuyên nghiệp cho nhà ở, văn phòng
                và công trình sau xây dựng.
            </p>
        </div>

        <div class="footer-col">
            <h4>Liên kết nhanh</h4>
            <ul>
                <li><a href="index.php">Trang chủ</a></li>
                <li><a href="about.php">Giới thiệu</a></li>
                <li><a href="services.php">Dịch vụ</a></li>
                <li><a href="booking.php">Đặt lịch</a></li>
                <li><a href="contact.php">Liên hệ</a></li>
            </ul>
        </div>

        <div class="footer-col">
            <h4>Thông tin liên hệ</h4>
            <p>📍 273 Trần Thủ Độ, Tân Phú, TP.HCM</p>
            <p>📞 <a href="tel:0966223312">0966 223 312</a></p>
            <p>✉ <a href="mailto:info@vesinhcare.com">info@vesinhcare.com</a></p>
        </div>

    </div>

    <div class="footer-bottom">
        <p>© 2026 Vệ sinh Care. All rights reserved.</p>
        <a href="terms.php">Điều khoản sử dụng</a>
    </div>
</footer>

<script src="../js/main.js"></script>
</body>
</html>
