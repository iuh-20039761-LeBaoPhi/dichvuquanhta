<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MediCare - Dịch Vụ Chăm Sóc Bệnh Nhân Chuyên Nghiệp</title>

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="CSS/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&family=Roboto:wght@700&display=swap" rel="stylesheet">
</head>
<body>
<div style="font-family: 'Quicksand', sans-serif;">

    <nav class="navbar navbar-expand-lg navbar-light bg-white sticky-top shadow-sm py-3">
        <div class="container">
            <a class="navbar-brand d-flex align-items-center gap-2 fw-bold fs-3" href="index.php" style="color: #007bff;">
                <i class="fas fa-hand-holding-medical"></i>
                <span>MediCare</span>
            </a>

            <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse justify-content-end" id="navMenu">
                <ul class="navbar-nav align-items-center gap-3">
                    <li class="nav-item"><a class="nav-link fw-bold px-3 active" style="color:#007bff; font-size: larger;" href="index.php">Trang Chủ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/about.php">Giới Thiệu</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/services.php">Dịch Vụ</a></li>
                    <li class="nav-item"><a class="nav-link fw-bold px-3" href="customer/contact.php">Liên Hệ</a></li>
                    <li class="nav-item ms-lg-3">
                        <a href="customer/contact.php" class="btn text-white rounded-pill px-4 py-2 shadow-sm" style="background-color:#007bff;">Đăng Ký Chăm Sóc</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>

    <section class="hero-section py-5" style="background: linear-gradient(135deg, #e3f2fd 0%, #FFFFFF 50%, #e8f5e9 100%);">
        <div class="container py-lg-5">
            <div class="row align-items-center">
                <div class="col-lg-6 text-center text-lg-start mb-5 mb-lg-0">
                    <h1 class="display-3 fw-bold mb-3">Chăm Sóc <br> <span class="text-primary" style="font-family: 'Roboto', sans-serif;">Bệnh Nhân</span> Tận Tâm</h1>
                    <p class="lead text-muted mb-4">Giải pháp hỗ trợ người bệnh tại bệnh viện chuyên nghiệp, giúp người thân an tâm công tác và làm việc.</p>
                    <button class="btn text-white rounded-pill btn-lg px-5 py-3" style="background-color:#007bff;" 
                            onmouseover="this.style.backgroundColor='#0056b3'; this.style.transform='scale(1.05)';"
                            onmouseout="this.style.backgroundColor='#007bff'; this.style.transform='scale(1)';" 
                            onclick="window.location.href='customer/contact.php'">Tìm người chăm sóc ngay</button>
                </div>
                <div class="col-lg-6 text-center">
                    <img src="https://images.unsplash.com/photo-1584515933487-779824d29309?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                         class="img-fluid rounded-4 shadow-lg" alt="Chăm sóc bệnh nhân" style="width: 550px; height: 400px; object-fit: cover;">
                </div>
            </div>
        </div>
    </section>

    <section class="py-5 bg-light">
        <div class="container py-5">
            <h2 class="text-center fw-bold display-5 mb-5">Giá Trị Cốt Lõi Của MediCare</h2>
            <div class="row g-4" id="features-grid">
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-primary"><i class="fas fa-user-nurse"></i></div>
                        <h3 class="h5 fw-bold">Điều Dưỡng Chuyên Nghiệp</h3>
                        <p class="text-muted small mb-0">Đội ngũ có chứng chỉ hành nghề và am hiểu tâm lý người bệnh.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-primary"><i class="fas fa-clock"></i></div>
                        <h3 class="h5 fw-bold">Trực Viện 24/7</h3>
                        <p class="text-muted small mb-0">Luôn túc trực bên giường bệnh bất kể ngày đêm, lễ tết.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-primary"><i class="fas fa-notes-medical"></i></div>
                        <h3 class="h5 fw-bold">Báo Cáo Liên Tục</h3>
                        <p class="text-muted small mb-0">Cập nhật tình trạng sức khỏe bệnh nhân cho gia đình mỗi giờ.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3 text-center">
                    <div class="p-5 bg-white rounded-4 shadow-sm h-100 hover-lift feature-card">
                        <div class="mb-4 fs-1 text-primary"><i class="fas fa-shield-alt"></i></div>
                        <h3 class="h5 fw-bold">An Toàn Tuyệt Đối</h3>
                        <p class="text-muted small mb-0">Cam kết bảo vệ tài sản và sức khỏe bệnh nhân trong suốt quá trình.</p>
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
            <h2 class="text-center fw-bold display-6 mb-5">Dịch Vụ Trọng Tâm</h2>
            <div class="row align-items-center">
                <div class="col-auto d-none d-lg-flex">
                    <button class="btn btn-light shadow rounded-circle" type="button" data-bs-target="#servicesCarousel" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" style="filter: invert(1);"></span>
                    </button>
                </div>
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
                                                    <img src="<?= htmlspecialchars($service['hinh_anh']); ?>" class="card-img-top" style="height:200px; object-fit:cover;" alt="<?= htmlspecialchars($service['tendichvu']); ?>">
                                                    <div class="card-body p-4 text-center">
                                                        <h3 class="h5 fw-bold"><?= htmlspecialchars($service['tendichvu']); ?></h3>
                                                        <p class="text-muted small"><?= mb_strimwidth($service['mo_ta_ngan'], 0, 85, '...'); ?></p>
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
                <div class="col-auto d-none d-lg-flex">
                    <button class="btn btn-light shadow rounded-circle" type="button" data-bs-target="#servicesCarousel" data-bs-slide="next">
                        <span class="carousel-control-next-icon" style="filter: invert(1);"></span>
                    </button>
                </div>
            </div>
            <div class="text-center mt-5">
                <a href="customer/services.php" class="btn btn-outline-primary px-5 rounded-pill fw-bold">Xem Tất Cả Giải Pháp</a>
            </div>
        </div>
    </section>

    <section class="py-5 text-white shadow-inner" style="background-color: #007bff;">
        <div class="container py-4">
            <div class="row g-4 text-center">
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">10+</h3>
                    <p class="mb-0 opacity-75">Năm Hoạt Động</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">20k+</h3>
                    <p class="mb-0 opacity-75">Ca Chăm Sóc Thành Công</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">100%</h3>
                    <p class="mb-0 opacity-75">Tận Tâm Phục Vụ</p>
                </div>
                <div class="col-6 col-md-3">
                    <h3 class="display-5 fw-bold">200+</h3>
                    <p class="mb-0 opacity-75">Điều Dưỡng Viên</p>
                </div>
            </div>
        </div>
    </section>

    <section class="py-5 text-center text-white" style="background-color:#198754;">
        <div class="container py-5">
            <h2 class="display-6 fw-bold mb-3">Gia Đình Bạn Đang Cần Hỗ Trợ Tại Viện?</h2>
            <p class="fs-5 mb-4 opacity-75">MediCare luôn sẵn sàng chia sẻ gánh nặng cùng bạn ngay hôm nay.</p>
            <button class="btn btn-light btn-lg px-5 rounded-pill shadow" onclick="window.location.href='customer/contact.php'">Liên Hệ Tư Vấn</button>
        </div>
    </section>

    <footer class="bg-dark text-white pt-5 pb-3">
        <div class="container">
            <div class="row g-4 mb-4">
                <div class="col-lg-4">
                    <h3 class="h4 fw-bold mb-3" style="color:#007bff;">MediCare</h3>
                    <p class="opacity-75">Hệ thống cung ứng nhân sự chăm sóc bệnh nhân chuyên nghiệp hàng đầu tại Việt Nam.</p>
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
                    <p class="mb-1 opacity-75 small"><i class="fas fa-envelope me-2"></i> info@medicare.vn</p>
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
            <p class="text-center small opacity-50">&copy; 2026 MediCare. Đồng hành cùng sức khỏe Việt.</p>
        </div>
    </footer>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="JS/style.js"></script>
</div>
</body>
</html>