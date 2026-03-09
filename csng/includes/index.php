<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ElderlyCare - Chăm Sóc Người Cao Tuổi & Người Già Đơn Côi</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="CSS/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&family=Roboto:wght@700&display=swap" rel="stylesheet">
</head>
<body>
<div style="font-family: 'Quicksand', sans-serif;">

    <nav class="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm py-3">
        <div class="container">
            <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3" href="index.php" style="color: #2e7d32;">
                <i class="fas fa-blind"></i>
                <span>ElderlyCare</span>
            </a>

            <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse justify-content-end" id="navMenu">
                <ul class="navbar-nav align-items-center gap-3">
                    <li class="nav-item"><a class="nav-link fw-bold px-3 active" style="color:#2e7d32; font-size: larger;" href="index.php">Trang Chủ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/about.php">Giới Thiệu</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/services.php">Dịch Vụ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/contact.php">Liên Hệ</a></li>
                    <li class="nav-item ms-lg-3">
                        <a href="customer/contact.php" class="btn text-white rounded-pill px-4 py-2 shadow-sm" style="background-color:#2e7d32;">Đặt Lịch Chăm Sóc</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <section class="hero-section py-5" style="background: linear-gradient(135deg, #f1f8e9 0%, #FFFFFF 50%, #e3f2fd 100%);">
        <div class="container py-lg-5">
            <div class="row align-items-center">
                <div class="col-lg-6 text-center text-lg-start mb-5 mb-lg-0">
                    <h1 class="display-3 fw-bold mb-3">Ấm Áp Tuổi Già <br> <span class="text-success" style="font-family: 'Roboto', sans-serif;">An Tâm Con Cháu</span></h1>
                    <p class="lead text-muted mb-4">Dịch vụ chăm sóc người cao tuổi sức yếu, sống một mình. Chúng tôi mang đến sự quan tâm như người thân trong gia đình.</p>
                    <button class="btn text-white rounded-pill btn-lg px-5 py-3" style="background-color:#2e7d32;" onmouseover="this.style.backgroundColor='#1b5e20'; this.style.transform='scale(1.05)';"
                            onmouseout="this.style.backgroundColor='#2e7d32'; this.style.transform='scale(1)';" onclick="window.location.href='customer/contact.php'">Tìm người đồng hành ngay</button>
                </div>
                <div class="col-lg-6 text-center">
                    <img src="https://duonglaobinhmy.com/wp-content/uploads/2024/03/nhu-cau-cham-soc-nguoi-cao-tuoi-hien-nay-1024x683.jpg" 
                         class="img-fluid rounded-4 shadow-lg" alt="Chăm sóc người già" style="width: 500px; height: 400px; object-fit: cover;">
                </div>
            </div>
        </div>
    </section>

    <section class="py-5 bg-light">
        <div class="container py-5">
            <h2 class="text-center fw-bold display-5 mb-5">Tại Sao Chọn ElderlyCare?</h2>
            <div class="row g-4" id="features-grid">
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-success"><i class="fas fa-user-check"></i></div>
                        <h3 class="h5 fw-bold">Nhân Viên Tận Tâm</h3>
                        <p class="text-muted small mb-0">Đội ngũ am hiểu tâm lý và sức khỏe người cao tuổi.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-success"><i class="fas fa-heart"></i></div>
                        <h3 class="h5 fw-bold">Bầu Bạn Sẻ Chia</h3>
                        <p class="text-muted small mb-0">Không chỉ chăm sóc thể chất mà còn là người bạn tinh thần.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-success"><i class="fas fa-phone-alt"></i></div>
                        <h3 class="h5 fw-bold">Hỗ Trợ Khẩn Cấp</h3>
                        <p class="text-muted small mb-0">Hệ thống liên lạc và ứng cứu 24/7 khi có sự cố.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-success"><i class="fas fa-utensils"></i></div>
                        <h3 class="h5 fw-bold">Dinh Dưỡng Chuẩn</h3>
                        <p class="text-muted small mb-0">Chế độ ăn uống phù hợp với bệnh lý người già.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

<?php
require_once 'config/database.php';
$db = new Database();
$conn = $db->getConnection();

$stmt = $conn->prepare("SELECT * FROM dichvu WHERE status = 1 ORDER BY id DESC LIMIT 12");
$stmt->execute();
$featured_services = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>

<section class="py-5">
    <div class="container py-5">
        <h2 class="text-center fw-bold display-6 mb-5">Dịch Vụ Nổi Bật</h2>

        <div class="row align-items-center">

            <!-- NÚT TRÁI -->
            <div class="col-auto d-none d-lg-flex">
                <button class="btn btn-light shadow rounded-circle"
                        type="button"
                        data-bs-target="#servicesCarousel"
                        data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" style="filter: invert(1);"></span>
                </button>
            </div>

            <!-- CAROUSEL -->
            <div class="col">
                <div id="servicesCarousel" class="carousel slide" data-bs-ride="carousel">
                    <div class="carousel-inner">

                        <?php
                        $chunks = array_chunk($featured_services, 4);
                        foreach ($chunks as $index => $group):
                        ?>
                            <div class="carousel-item <?= $index === 0 ? 'active' : '' ?>">
                                <div class="row g-4">
                                    <?php foreach ($group as $service): ?>
                                        <div class="col-md-6 col-lg-3">
                                            <div class="card border-0 shadow-sm h-100 rounded-4 overflow-hidden">
                                                <img src="<?= htmlspecialchars($service['hinh_anh']); ?>"
                                                     class="card-img-top"
                                                     style="height:200px; object-fit:cover;"
                                                     alt="<?= htmlspecialchars($service['tendichvu']); ?>">
                                                <div class="card-body p-4 text-center">
                                                    <h3 class="h5 fw-bold">
                                                        <?= htmlspecialchars($service['tendichvu']); ?>
                                                    </h3>
                                                    <p class="text-muted small">
                                                        <?= mb_strimwidth($service['mo_ta_ngan'], 0, 85, '...'); ?>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        <?php endforeach; ?>

                    </div>
                </div>
            </div>

            <!-- NÚT PHẢI -->
            <div class="col-auto d-none d-lg-flex">
                <button class="btn btn-light shadow rounded-circle"
                        type="button"
                        data-bs-target="#servicesCarousel"
                        data-bs-slide="next">
                    <span class="carousel-control-next-icon" style="filter: invert(1);"></span>
                </button>
            </div>

        </div>

        <div class="text-center mt-5">
            <a href="customer/services.php"
               class="btn btn-outline-secondary px-5 rounded-pill fw-bold"
               style="border-color:#F06292; color:#F06292;">
                Xem Tất Cả Dịch Vụ
            </a>
        </div>
    </div>
</section>
    <section class="py-5 text-white shadow-inner" style="background-color: #2e7d32;">
        <div class="container py-4">
            <div class="row g-4 text-center">
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">12+</h3>
                    <p class="mb-0 opacity-75">Năm Hoạt Động</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">8k+</h3>
                    <p class="mb-0 opacity-75">Cụ Ông/Bà Tin Tưởng</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">100%</h3>
                    <p class="mb-0 opacity-75">Sự Tận Tâm</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">150+</h3>
                    <p class="mb-0 opacity-75">Điều Dưỡng Viên</p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-5 text-center text-white" style="background-color:#1565c0;">
        <div class="container py-5">
            <h2 class="display-6 fw-bold mb-3">Bạn Lo Lắng Cho Cha Mẹ Ở Một Mình?</h2>
            <p class="fs-5 mb-4 opacity-75">Hãy để ElderlyCare thay bạn chăm sóc và bầu bạn cùng người thân.</p>
            <button class="btn btn-light btn-lg px-5 rounded-pill shadow" onclick="window.location.href='customer/contact.php'">Liên Hệ Tư Vấn</button>
        </div>
    </section>

    
    <footer class="bg-dark text-white pt-5 pb-3">
        <div class="container">
            <div class="row g-4 mb-4">
                <div class="col-lg-4">
                    <h3 class="h4 fw-bold mb-3" style="color:#2e7d32;">ElderlyCare</h3>
                    <p class="opacity-75">Chăm sóc toàn diện cho người cao tuổi, mang lại niềm vui tuổi xế chiều.</p>
                </div>
                <div class="col-lg-2">
                    <h4 class="h5 fw-bold mb-3">Liên Kết</h4>
                    <ul class="list-unstyled">
                        <li class="mb-2"><a href="customer/about.php" class="text-white text-decoration-none opacity-75">Về Chúng Tôi</a></li>
                        <li class="mb-2"><a href="customer/services.php" class="text-white text-decoration-none opacity-75">Dịch Vụ</a></li>
                        <li class="mb-2"><a href="customer/contact.php" class="text-white text-decoration-none opacity-75">Liên Hệ</a></li>
                    </ul>
                </div>
                <div class="col-lg-3">
                    <h4 class="h5 fw-bold mb-3">Hỗ Trợ</h4>
                    <p class="mb-1 opacity-75 small"><i class="fas fa-phone me-2"></i> 1900 1234</p>
                    <p class="mb-1 opacity-75 small"><i class="fas fa-envelope me-2"></i> info@elderlycare.vn</p>
                    <p class="mb-1 opacity-75 small"><i class="fas fa-map-marker-alt me-2"></i> Toàn Quốc</p>
                </div>
                <div class="col-lg-3">
                    <h4 class="h5 fw-bold mb-3">Cộng Đồng</h4>
                    <div class="d-flex gap-3">
                        <a href="#" class="btn btn-outline-light rounded-circle"><i class="fab fa-facebook-f"></i></a>
                        <a href="#" class="btn btn-outline-light rounded-circle"><i class="fab fa-linkedin-in"></i></a>
                    </div>
                </div>
            </div>
            <hr class="opacity-25">
            <p class="text-center small opacity-50">&copy; 2026 ElderlyCare. Đồng hành cùng sức khỏe Việt.</p>
        </div>
    </footer>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="JS/style.js"></script>
</div>
</body>
</html>