<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Bảng giá thuê tài xế</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="../assets/pricing.css">
</head>
<body>
<?php include "../partials/header.php"; ?>



<section class="page">
    <h2 class="section-title">💰 Bảng giá dịch vụ</h2>

    <div class="price-table">
        <div class="price-card">
            <h3>🚘 Xe máy</h3>
            <p class="price">10.000đ / km</p>
            <ul>
                <li>Tối thiểu 3km</li>
                <li>Không phụ thu giờ cao điểm</li>
            </ul>
                <a href="book_driver.php?type=xe_may" class="btn-book">Đặt ngay</a>
        </div>

        <div class="price-card highlight">
            <h3>🚗 Ô tô</h3>
            <p class="price">20.000đ / km</p>
            <ul>
                <li>Tài xế kinh nghiệm</li>
                <li>Báo giá trước khi đi</li>
            </ul>
                <a href="book_driver.php?type=o_to" class="btn-book primary">Đặt ngay</a>
        </div>

        <div class="price-card">
            <h3>🌙 Ban đêm</h3>
            <p class="price">+20%</p>
            <ul>
                <li>Từ 22h – 5h</li>
                <li>Đảm bảo an toàn</li>
            </ul>
                <a href="book_driver.php?night=1" class="btn-book">Đặt ngay</a>
        </div>
    </div>

    <p class="note">* Giá có thể thay đổi theo quãng đường và thời gian thực tế</p>
</section>


</body>
<?php include "../partials/footer.php"; ?>
</html>
