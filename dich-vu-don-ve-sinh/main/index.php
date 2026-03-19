<?php
session_start();
$customer = $_SESSION['customer'] ?? null;
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dịch vụ | Vệ sinh Care</title>
      <link rel="stylesheet" href="../css/style.css">

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
        Chọn nhanh dịch vụ bạn cần – đặt lịch chỉ trong 30s
    </p>

    <div class="cards">

        <!-- Căn hộ -->
        <div class="service-preview-card">
            <img src="../img/Bi-Quyet-Don-Nha-Sac.jpg">
            <div class="card-body">
                <h3>Vệ sinh căn hộ</h3>
                <p>Phù hợp chung cư, nhà nhỏ</p>
                <a href="booking.php?service=apartment" class="btn-small">
                    Đặt lịch
                </a>
            </div>
        </div>

        <!-- Nhà phố -->
        <div class="service-preview-card">
            <img src="../img/Bi-Quyet-Don-Nha-Sac.jpg">
            <div class="card-body">
                <h3>Nhà phố / Biệt thự</h3>
                <p>Dọn dẹp toàn diện, sạch sâu</p>
                <a href="booking.php?service=house" class="btn-small">
                    Đặt lịch
                </a>
            </div>
        </div>

        <!-- Văn phòng -->
        <div class="service-preview-card">
            <img src="../img/baogom_930de0865e.png">
            <div class="card-body">
                <h3>Vệ sinh văn phòng</h3>
                <p>Không gian làm việc chuyên nghiệp</p>
                <a href="booking.php?service=restaurant" class="btn-small">
                    Đặt lịch
                </a>
            </div>
        </div>

        <!-- Sofa -->
        <div class="service-preview-card">
            <img src="../img/baogom_930de0865e.png">
            <div class="card-body">
                <h3>Giặt sofa</h3>
                <p>Loại bỏ bụi bẩn & vi khuẩn</p>
                <a href="booking.php?service=sofa" class="btn-small">
                    Đặt lịch
                </a>
            </div>
        </div>

    </div>

    <div class="center mt-4">
        <a href="services.php" class="btn btn-outline">
            Xem tất cả dịch vụ
        </a>
    </div>
</section>






<?php require_once "footer.php"; ?>


</body>
</html>
