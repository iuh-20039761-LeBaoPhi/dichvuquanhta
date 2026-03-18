<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Liên hệ | Vệ sinh Care</title>
     <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/header.css">
</head>
<body>

<!-- ===== HEADER ===== -->
<?php require_once "header.php"; ?>

<!-- ===== TITLE ===== -->
<section class="container page-title">
    <h2>Liên hệ với chúng tôi</h2>
    <p>Chúng tôi luôn sẵn sàng hỗ trợ bạn</p>
</section>

<!-- ===== CONTACT CONTENT ===== -->
<section class="container contact-wrapper">

    <!-- THÔNG TIN -->
    <div class="contact-box">
        <h3>Thông tin liên hệ</h3>

        <p>📍 <strong>Địa chỉ:</strong><br>
            273 Trần Thủ Độ, Tân Phú, TP. Hồ Chí Minh
        </p>

        <p>📞 <strong>Hotline:</strong><br>
            <a href="tel:0966223312">0966 223 312</a>
        </p>

        <p>✉ <strong>Email:</strong><br>
            <a href="mailto:info@vesinhcare.com">info@vesinhcare.com</a>
        </p>

        <p>⏰ <strong>Thời gian làm việc:</strong><br>
            Thứ 2 – Chủ nhật: 7:00 – 20:00
        </p>
    </div>

    <!-- FORM -->
    <div class="contact-box">
        <h3>Gửi tin nhắn cho chúng tôi</h3>

        <form id="contactForm" class="contact-form">
    <input type="text" id="contactName" placeholder="Họ và tên">
    <input type="text" id="contactPhone" placeholder="Số điện thoại">
    <input type="email" id="contactEmail" placeholder="Email">
    <textarea id="contactMessage" placeholder="Nội dung liên hệ"></textarea>
    <button type="submit" class="btn">Gửi liên hệ</button>
</form>

    </div>

</section>

<!-- ===== MAP (OPTIONAL) ===== -->
<section class="container map-section">
    <iframe
        src="https://www.google.com/maps?q=273%20Tr%E1%BA%A7n%20Th%E1%BB%A7%20%C4%90%E1%BB%99%20T%C3%A2n%20Ph%C3%BA&output=embed"
        loading="lazy">
    </iframe>
</section>

<!-- ===== FOOTER ===== -->
<?php require_once "footer.php"; ?>
<script src="../js/contact.js"></script>

</body>
</html>
