<?php
session_start();
$customer = $_SESSION['customer'] ?? null;
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Dịch vụ | Vệ sinh Care</title>
      <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/header.css">
</head>
<body>

<?php require_once "header.php"; ?>


<!-- HERO -->
<section class="hero">
    <div class="container hero-content">
        <h2>Không gian sạch<br>Cuộc sống xanh</h2>
        <p>
            Vệ sinh Care mang đến dịch vụ vệ sinh chuyên nghiệp,
            nhanh chóng và an toàn cho gia đình & doanh nghiệp.
        </p>
        <div class="hero-buttons">
            <a href="booking.php" class="btn">Đặt lịch ngay</a>
            <a href="services.php" class="btn btn-outline">Xem dịch vụ</a>
        </div>
    </div>
</section>



<section class="why-us">
    <div class="container">
        <h2>Vì sao khách hàng chọn Vệ sinh Care?</h2>

        <div class="why-grid">
            <div class="why-item">
                <h3>✔ Nhân viên chuyên nghiệp</h3>
                <p>Đội ngũ được đào tạo bài bản, tác phong gọn gàng.</p>
            </div>
            <div class="why-item">
                <h3>✔ Dụng cụ hiện đại</h3>
                <p>Sử dụng máy móc & hóa chất an toàn cho sức khỏe.</p>
            </div>
            <div class="why-item">
                <h3>✔ Giá cả minh bạch</h3>
                <p>Báo giá rõ ràng – không phát sinh chi phí.</p>
            </div>
            <div class="why-item">
                <h3>✔ Phục vụ nhanh chóng</h3>
                <p>Có mặt đúng hẹn – linh hoạt theo lịch khách hàng.</p>
            </div>
        </div>
    </div>
</section>




<!-- SERVICES PREVIEW -->
<section class="services-preview container">
    <h2>Dịch vụ nổi bật</h2>
    <p class="section-desc">
        Chúng tôi cung cấp nhiều giải pháp vệ sinh phù hợp với mọi nhu cầu
    </p>

    <div class="cards">
        <div class="service-preview-card">
            <img src="..\img\Bi-Quyet-Don-Nha-Sac.jpg" alt="Vệ sinh nhà ở">
            <div class="card-body">
                <h3>Vệ sinh nhà ở</h3>
                <p>Làm sạch toàn diện không gian sống của bạn</p>
                <a href="house-cleaning.php" class="btn-small">
                    Đặt lịch
                </a>
            </div>
        </div>

        <div class="service-preview-card">
            <img src="..\img\baogom_930de0865e.png" alt="Vệ sinh văn phòng">
            <div class="card-body">
                <h3>Vệ sinh văn phòng</h3>
                <p>Không gian làm việc sạch sẽ – hiệu quả hơn</p>
                <a href="office-cleaning.php" class="btn-small">
                    Đặt lịch
                </a>
            </div>
        </div>
    </div>

    <div class="center">
        <a href="services.php" class="btn btn-outline">Xem tất cả dịch vụ</a>
    </div>
</section>







<footer class="footer">
    <div class="container footer-content">

        <!-- CỘT 1 -->
        <div class="footer-col">
            <h3>VỆ SINH CARE</h3>
            <p>
                Dịch vụ vệ sinh chuyên nghiệp cho nhà ở, văn phòng
                và công trình sau xây dựng.
            </p>
        </div>

        <!-- CỘT 2 -->
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

        <!-- CỘT 3 -->
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


</body>
</html>
