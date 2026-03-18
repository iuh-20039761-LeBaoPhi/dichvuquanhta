<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lịch | Vệ sinh Care</title>
      <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/header.css">
</head>
<body>

<!-- ===== HEADER ===== -->
<?php require_once "header.php"; ?>

<!-- ===== TITLE ===== -->
<section class="container page-title">
    <h2>Đặt lịch dịch vụ</h2>
    <p>Vui lòng chọn dịch vụ và điền thông tin bên dưới</p>
</section>

<!-- ===== FORM ===== -->
<section class="booking-bg">
    <div class="container">
        <form id="bookingForm" class="booking-form"
      action="booking_process.php" method="POST">

    <!-- THÔNG TIN KHÁCH -->
    <h3 class="form-title">Thông tin khách hàng</h3>

    <input type="text" id="name" name="customer_name"
           placeholder="Họ và tên" required>

    <input type="text" id="phone" name="phone"
           placeholder="Số điện thoại" required>

    <!-- ĐỊA CHỈ -->
    <h3 class="form-title">Địa chỉ thực hiện</h3>

    <input type="text" id="address" name="address"
           placeholder="Số nhà, tên đường">

    <div class="address-row">
        <input type="text" id="district" name="district"
               placeholder="Quận / Huyện">
        <input type="text" id="city" name="city"
               placeholder="Tỉnh / Thành phố">
    </div>

    <!-- CHỌN DỊCH VỤ -->
    <section class="service-bg">
        <h3 class="form-title">Chọn dịch vụ</h3>

        <div class="service-options">
            <div class="service-card" data-value="Vệ sinh nhà ở">
                🏠
                <h4>Vệ sinh nhà ở</h4>
                <p>Lau dọn theo yêu cầu</p>
            </div>

            <div class="service-card" data-value="Vệ sinh văn phòng">
                🏢
                <h4>Vệ sinh văn phòng</h4>
                <p>Sạch sẽ – gọn gàng</p>
            </div>

            <div class="service-card" data-value="Tổng vệ sinh sau xây dựng">
                🧹
                <h4>Tổng vệ sinh</h4>
                <p>Sau xây dựng</p>
            </div>
        </div>

        <!-- hidden bắt buộc -->
        <input type="hidden" id="service"
               name="service_type">
    </section>

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

    <!-- THỜI GIAN -->
    <h3 class="form-title">Thời gian & ghi chú</h3>

    <input type="date" id="date"
           name="booking_date" required>

    <textarea id="note" name="note"
        placeholder="Ghi chú thêm (nếu có)"></textarea>

    <button type="submit" class="submit-btn">
        Gửi yêu cầu
    </button>
</form>

</section>

<!-- ===== MODAL SUCCESS ===== -->
<div id="successModal" class="modal">
    <div class="modal-content">
        <span class="close-btn">&times;</span>
        <h2>🎉 Gửi yêu cầu thành công!</h2>
        <p>
            Chúng tôi đã nhận được thông tin.<br>
            Nhân viên sẽ liên hệ xác nhận trong thời gian sớm nhất.
        </p>
        <button id="closeModalBtn">Đóng</button>
    </div>
</div>

<!-- ===== FOOTER ===== -->
<?php require_once "footer.php"; ?>

<script src="../js/main.js"></script>
</body>
</html>
