<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MamaCore - Chăm Sóc Mẹ, Bé, Người Bệnh & Người Già</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="CSS/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
</head>
<body>
<div style="font-family: 'Quicksand', sans-serif;">

    <!-- Navbar -->
    <nav class="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm py-3">
        <div class="container">
            <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3" href="index.php" style="color: #F06292;">
                <i class="fas fa-heart"></i>
                <span>MamaCore</span>
            </a>

            <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse justify-content-end" id="navMenu">
                <ul class="navbar-nav align-items-center gap-3">
                    <li class="nav-item"><a class="nav-link fw-bold px-3 active" style="color:#F06292; font-size: larger;" href="index.php">Trang Chủ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/about.php">Giới Thiệu</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/services.php">Dịch Vụ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/contact.php">Liên Hệ</a></li>
                    <li class="nav-item ms-lg-3">
                        <a href="customer/contact.php" class="btn text-white rounded-pill px-4 py-2 shadow-sm" style="background-color:#F06292;">Đặt Lịch Chăm Sóc</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
<section class="hero-section py-5" style="background: linear-gradient(135deg, #FFE1EC 0%, #FFFFFF 50%, #f7e0f4 100%);">
        <div class="container py-lg-5">
            <div class="row align-items-center">
                <div class="col-lg-6 text-center text-lg-start mb-5 mb-lg-0">
                    <h1 class="display-3 fw-bold mb-3">Chăm Sóc Toàn Diện <br> Cho <span class="text-danger" style="font-family: 'Pacifico', cursive; ">Mẹ và Bé</span></h1>
                    <p class="lead text-muted mb-4">Dịch vụ y tế chuyên nghiệp, tận tâm và chất lượng cao cho sức khỏe của gia đình bạn.</p>
                    <button class="btn text-white rounded-pill btn-lg px-5 py-3" style="background-color:#F06292;" onmouseover="this.style.backgroundColor='#d84374'; this.style.transform='scale(1.05)';"
                            onmouseout="this.style.backgroundColor='#F06292'; this.style.transform='scale(1)';" onclick="window.location.href='customer/contact.php'">Bắt đầu ngay</button>
                </div>
                <div class="col-lg-6 text-center">
                    <img src="https://babybrezza.vn/wp-content/uploads/2021/01/kawaii-spa-dia-chi-spa-cho-me-va-be-uy-tin-o-sai-gon.jpg" 
                         class="img-fluid rounded-pill shadow-lg" alt="Mẹ và bé" style="width: 500px; height: 450px;">
                </div>
            </div>
        </div>
    </section>

    <section class="py-5 bg-light">
        <div class="container py-5">
            <h2 class="text-center fw-bold display-5 mb-5">Tại Sao Chọn MamaCore?</h2>
            <div class="row g-4" id="features-grid">
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-danger"><i class="fas fa-user-md"></i></div>
                        <h3 class="h5 fw-bold">Bác Sĩ Chuyên Nghiệp</h3>
                        <p class="text-muted small mb-0">Đội ngũ bác sĩ sản phụ khoa giàu kinh nghiệm.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-danger"><i class="fas fa-heartbeat"></i></div>
                        <h3 class="h5 fw-bold">Chăm Sóc 24/7</h3>
                        <p class="text-muted small mb-0">Luôn sẵn sàng phục vụ bạn mọi lúc, mọi nơi.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-danger"><i class="fas fa-hospital"></i></div>
                        <h3 class="h5 fw-bold">Thiết Bị Hiện Đại</h3>
                        <p class="text-muted small mb-0">Cơ sở vật chất và thiết bị y tế tân tiến nhất.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-danger"><i class="fas fa-smile"></i></div>
                        <h3 class="h5 fw-bold">Dịch Vụ Chân Tình</h3>
                        <p class="text-muted small mb-0">Chúng tôi coi gia đình bạn như gia đình mình.</p>
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
<section class="py-5 text-white shadow-inner" style="background-color: #F06292;">
        <div class="container py-4">
            <div class="row g-4 text-center">
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">15+</h3>
                    <p class="mb-0 opacity-75">Năm Kinh Nghiệm</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">10k+</h3>
                    <p class="mb-0 opacity-75">Gia Đình Tin Tưởng</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">98%</h3>
                    <p class="mb-0 opacity-75">Độ Hài Lòng</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">50+</h3>
                    <p class="mb-0 opacity-75">Bác Sĩ</p>
                </div>
            </div>
        </div>
    </section>
    <!-- CTA -->
    <section class="py-5 text-center text-white" style="background-color:#2fb3a5;">
        <div class="container py-5">
            <h2 class="display-6 fw-bold mb-3">Bạn Cần Người Chăm Sóc Tin Cậy?</h2>
            <p class="fs-5 mb-4 opacity-75">Chúng tôi luôn sẵn sàng đồng hành cùng gia đình bạn.</p>
            <button class="btn btn-light btn-lg px-5 rounded-pill shadow" onclick="window.location.href='customer/contact.php'">Liên Hệ Ngay</button>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-dark text-white pt-5 pb-3">
        <div class="container">
            <div class="row g-4 mb-4">
                <div class="col-lg-4">
                    <h3 class="h4 fw-bold mb-3" style="color:#F06292;">MamaCore</h3>
                    <p class="opacity-75">Dịch vụ chăm sóc Mẹ và Bé.</p>
                </div>
                <div class="col-lg-2">
                    <h4 class="h5 fw-bold mb-3">Liên Kết</h4>
                    <ul class="list-unstyled">
                        <li class="mb-2"><a href="customer/about.php" class="text-white text-decoration-none opacity-75">Giới Thiệu</a></li>
                        <li class="mb-2"><a href="customer/services.php" class="text-white text-decoration-none opacity-75">Dịch Vụ</a></li>
                        <li class="mb-2"><a href="customer/contact.php" class="text-white text-decoration-none opacity-75">Liên Hệ</a></li>
                    </ul>
                </div>
                <div class="col-lg-3">
                    <h4 class="h5 fw-bold mb-3">Liên Hệ</h4>
                    <p class="mb-1 opacity-75 small"><i class="fas fa-phone me-2"></i> 1900 8888</p>
                    <p class="mb-1 opacity-75 small"><i class="fas fa-envelope me-2"></i> contact@mamacore.vn</p>
                    <p class="mb-1 opacity-75 small"><i class="fas fa-map-marker-alt me-2"></i> Việt Nam</p>
                </div>
                <div class="col-lg-3">
                    <h4 class="h5 fw-bold mb-3">Theo Dõi</h4>
                    <div class="d-flex gap-3">
                        <a href="#" class="btn btn-outline-light rounded-circle"><i class="fab fa-facebook-f"></i></a>
                        <a href="#" class="btn btn-outline-light rounded-circle"><i class="fab fa-instagram"></i></a>
                        <a href="#" class="btn btn-outline-light rounded-circle"><i class="fab fa-youtube"></i></a>
                    </div>
                </div>
            </div>
            <hr class="opacity-25">
            <p class="text-center small opacity-50">&copy; 2026 MamaCore. All rights reserved.</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="JS/style.js"></script>
</div>
</body>
</html>
