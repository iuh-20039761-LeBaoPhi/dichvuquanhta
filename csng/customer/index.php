<?php
/* ================= NORMAL PAGE ================= */
require_once __DIR__ . '/components/header.php';
renderHeader('Dịch Vụ - MamaCore');
?>
 
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
require_once '../config/database.php';
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
                                                <img src="../<?php echo htmlspecialchars($service['hinh_anh']); ?>"
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
                <a href="customer/services.php" class="btn btn-outline-success px-5 rounded-pill fw-bold">Xem Tất Cả Giải Pháp</a>
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
<?php
require_once __DIR__ . '/components/footer.php';
renderFooter();
?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="JS/style.js"></script>
