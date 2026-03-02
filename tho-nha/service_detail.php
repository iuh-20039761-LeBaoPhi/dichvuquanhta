<?php
require_once 'api/db.php';

// Lấy category_id từ URL
$category_id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

// Lấy thông tin category
$category_query = "SELECT * FROM service_categories WHERE id = ? AND is_active = 1";
$stmt = $conn->prepare($category_query);
$stmt->bind_param("i", $category_id);
$stmt->execute();
$category_result = $stmt->get_result();
$category = $category_result->fetch_assoc();

// Nếu không tìm thấy category, chuyển về trang chủ
if (!$category) {
    header('Location: index.html');
    exit;
}

// Lấy danh sách dịch vụ trong category
$services_query = "SELECT * FROM services WHERE category_id = ? AND is_active = 1 ORDER BY id ASC";
$stmt = $conn->prepare($services_query);
$stmt->bind_param("i", $category_id);
$stmt->execute();
$services_result = $stmt->get_result();
$services = $services_result->fetch_all(MYSQLI_ASSOC);

// Lấy các category khác để hiển thị "Dịch vụ liên quan"
$related_query = "SELECT * FROM service_categories WHERE id != ? AND is_active = 1 LIMIT 3";
$stmt = $conn->prepare($related_query);
$stmt->bind_param("i", $category_id);
$stmt->execute();
$related_result = $stmt->get_result();
$related_categories = $related_result->fetch_all(MYSQLI_ASSOC);

// Định nghĩa icon cho từng category
$category_icons = [
    'Sửa máy lạnh' => 'fa-wind',
    'Sửa máy giặt' => 'fa-tshirt',
    'Nhà vệ sinh'  => 'fa-droplet',
    'Điện nước'    => 'fa-bolt',
    'Đồ gia dụng'  => 'fa-plug',
    'Cải tạo nhà'  => 'fa-hammer'
];

// Định nghĩa hình ảnh cho từng category
$category_images = [
    'Sửa máy lạnh' => 'image/2.jpg',
    'Sửa máy giặt' => 'image/4.jpg',
    'Nhà vệ sinh'  => 'image/3.jpg',
    'Điện nước'    => 'image/6.jpg',
    'Đồ gia dụng'  => 'image/5.jpg',
    'Cải tạo nhà'  => 'image/7.jpg'
];

$icon       = $category_icons[$category['name']]  ?? 'fa-tools';
$main_image = $category_images[$category['name']] ?? 'image/1.jpg';

// Tính giá thấp nhất và cao nhất
$prices     = array_map(fn($s) => (int)$s['price'], $services);
$min_price  = !empty($prices) ? min($prices) : 0;
$max_price  = !empty($prices) ? max($prices) : 0;
$price_range = number_format($min_price) . 'đ – ' . number_format($max_price) . 'đ';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="<?= htmlspecialchars($category['name']) ?> chuyên nghiệp - Thợ Nhà">
    <title><?= htmlspecialchars($category['name']) ?> - Thợ Nhà</title>

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

    <!-- Header -->
    <div id="header-container"></div>

    <!-- Breadcrumb -->
    <div class="breadcrumb-wrap">
        <div class="container">
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="index.html">Trang chủ</a></li>
                    <li class="breadcrumb-item"><a href="index.html#services">Dịch vụ</a></li>
                    <li class="breadcrumb-item active" aria-current="page"><?= htmlspecialchars($category['name']) ?></li>
                </ol>
            </nav>
        </div>
    </div>

    <!-- Page Hero -->
    <section class="page-hero">
        <div class="container">
            <div class="row align-items-center">
                <div class="col-lg-8">
                    <span class="section-label" style="background:rgba(255,255,255,0.2); color:white;">
                        Dịch vụ chuyên nghiệp
                    </span>
                    <h1><?= htmlspecialchars($category['name']) ?></h1>
                    <p class="lead">
                        Dịch vụ <?= strtolower(htmlspecialchars($category['name'])) ?> chuyên nghiệp với đội ngũ thợ giàu kinh nghiệm, cam kết chất lượng, bảo hành dài hạn.
                    </p>
                    <div class="page-hero-meta">
                        <span><i class="fas fa-star"></i> 4.9/5 (500+ đánh giá)</span>
                        <span><i class="fas fa-users"></i> 1.000+ khách hàng</span>
                        <span><i class="fas fa-shield-alt"></i> Bảo hành 6–12 tháng</span>
                    </div>
                </div>
                <div class="col-lg-4 page-hero-icon">
                    <i class="fas <?= $icon ?>"></i>
                </div>
            </div>
        </div>
    </section>

    <!-- Detail Content -->
    <section class="detail-content">
        <div class="container">
            <div class="row g-4">

                <!-- ===== Main Content ===== -->
                <div class="col-lg-8">

                    <!-- Danh sách dịch vụ -->
                    <div class="mb-5">
                        <h2 class="detail-section-title">
                            <i class="fas fa-list-check"></i>
                            Bảng Giá Dịch Vụ
                        </h2>

                        <?php if (!empty($services)): ?>
                            <?php foreach ($services as $service): ?>
                                <div class="service-item-card">
                                    <div class="row align-items-center">
                                        <div class="col-md-8">
                                            <h3 class="service-item-name">
                                                <i class="fas fa-check-circle me-2" style="color: var(--primary);"></i>
                                                <?= htmlspecialchars($service['name']) ?>
                                            </h3>
                                            <?php if (!empty($service['description'])): ?>
                                                <p class="service-item-description">
                                                    <?= htmlspecialchars($service['description']) ?>
                                                </p>
                                            <?php endif; ?>
                                        </div>
                                        <div class="col-md-4 text-md-end mt-2 mt-md-0">
                                            <div class="service-item-price">
                                                <?= number_format($service['price']) ?>đ
                                            </div>
                                            <button
                                                class="btn btn-gradient btn-sm booking-btn"
                                                data-service-name="<?= htmlspecialchars($service['name']) ?>"
                                                data-service-price="<?= $service['price'] ?>"
                                            >
                                                <i class="fas fa-calendar-check me-1"></i> Đặt lịch
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        <?php else: ?>
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle me-2"></i>
                                Hiện chưa có dịch vụ nào trong danh mục này.
                            </div>
                        <?php endif; ?>
                    </div>

                    <!-- Tính năng nổi bật -->
                    <div class="mb-5">
                        <h2 class="detail-section-title">
                            <i class="fas fa-star"></i>
                            Tính Năng Nổi Bật
                        </h2>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <div class="detail-feature-box">
                                    <div class="feature-icon-large"><i class="fas fa-user-tie"></i></div>
                                    <h5>Thợ Chuyên Nghiệp</h5>
                                    <p>Đội ngũ được đào tạo bài bản, có chứng chỉ hành nghề và nhiều năm kinh nghiệm thực tế.</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detail-feature-box">
                                    <div class="feature-icon-large"><i class="fas fa-certificate"></i></div>
                                    <h5>Linh Kiện Chính Hãng</h5>
                                    <p>Sử dụng 100% linh kiện, vật tư chính hãng có xuất xứ rõ ràng, kiểm tra trước khi lắp đặt.</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detail-feature-box">
                                    <div class="feature-icon-large"><i class="fas fa-shield-alt"></i></div>
                                    <h5>Bảo Hành Dài Hạn</h5>
                                    <p>Bảo hành 6–12 tháng cho dịch vụ và linh kiện thay thế. Cam kết sửa lại miễn phí nếu còn trong hạn bảo hành.</p>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="detail-feature-box">
                                    <div class="feature-icon-large"><i class="fas fa-headset"></i></div>
                                    <h5>Hỗ Trợ 24/7</h5>
                                    <p>Luôn sẵn sàng hỗ trợ khách hàng mọi lúc, mọi nơi kể cả ngày lễ và cuối tuần.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Hình ảnh thực tế -->
                    <div class="mb-5">
                        <h2 class="detail-section-title">
                            <i class="fas fa-images"></i>
                            Hình Ảnh Thực Tế
                        </h2>
                        <div class="gallery-grid">
                            <div class="gallery-item">
                                <img src="<?= $main_image ?>" alt="<?= htmlspecialchars($category['name']) ?>">
                            </div>
                            <div class="gallery-item">
                                <img src="image/8.jpg" alt="Khách hàng hài lòng">
                            </div>
                            <div class="gallery-item">
                                <img src="image/1.jpg" alt="Thợ chuyên nghiệp">
                            </div>
                            <div class="gallery-item">
                                <img src="<?= $main_image ?>" alt="<?= htmlspecialchars($category['name']) ?>">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ===== Sidebar ===== -->
                <div class="col-lg-4">

                    <!-- Price card -->
                    <div class="price-card mb-4">
                        <h4>Giá dịch vụ tham khảo</h4>
                        <div class="price-amount"><?= $price_range ?></div>
                        <p class="mb-4"><small>* Giá thực tế có thể thay đổi theo tình trạng cụ thể</small></p>
                        <button class="btn btn-light w-100 mb-3" onclick="scrollToServices()">
                            <i class="fas fa-list me-2"></i> Xem bảng giá chi tiết
                        </button>
                        <a href="tel:0775472347" class="btn btn-outline-light w-100">
                            <i class="fas fa-phone me-2"></i> Gọi: 0775 472 347
                        </a>
                    </div>

                    <!-- Commitment -->
                    <div class="sidebar-box mb-4">
                        <h5>Cam Kết Của Chúng Tôi</h5>
                        <div class="commit-item">
                            <i class="fas fa-check-circle"></i>
                            <span>Thợ giàu kinh nghiệm, tay nghề cao</span>
                        </div>
                        <div class="commit-item">
                            <i class="fas fa-check-circle"></i>
                            <span>Linh kiện chính hãng, có xuất xứ rõ ràng</span>
                        </div>
                        <div class="commit-item">
                            <i class="fas fa-check-circle"></i>
                            <span>Bảo hành dài hạn 6–12 tháng</span>
                        </div>
                        <div class="commit-item">
                            <i class="fas fa-check-circle"></i>
                            <span>Giá cả minh bạch, không phát sinh</span>
                        </div>
                        <div class="commit-item">
                            <i class="fas fa-check-circle"></i>
                            <span>Hỗ trợ 24/7, phản hồi nhanh chóng</span>
                        </div>
                    </div>

                    <!-- Working hours -->
                    <div class="sidebar-box">
                        <h5>Giờ Làm Việc</h5>
                        <div class="hours-row">
                            <span>Thứ 2 – Thứ 6</span>
                            <strong>7:00 – 22:00</strong>
                        </div>
                        <div class="hours-row">
                            <span>Thứ 7 – Chủ nhật</span>
                            <strong>7:00 – 22:00</strong>
                        </div>
                        <div class="hours-row" style="border-bottom: none;">
                            <span>Khẩn cấp</span>
                            <strong style="color: var(--primary);">24/7</strong>
                        </div>
                        <div class="alert alert-success mb-0 mt-3 py-2 px-3" style="font-size: 0.84rem; border-radius: var(--radius-sm);">
                            <i class="fas fa-headset me-2"></i>
                            Hotline hỗ trợ khẩn cấp 24/7
                        </div>
                    </div>
                </div>
            </div>

            <!-- Related Services -->
            <?php if (!empty($related_categories)): ?>
                <div class="mt-5 pt-4" style="border-top: 1px solid rgba(0,0,0,0.07);">
                    <h2 class="detail-section-title mb-4">
                        <i class="fas fa-layer-group"></i>
                        Dịch Vụ Liên Quan
                    </h2>
                    <div class="row g-4">
                        <?php foreach ($related_categories as $related):
                            $r_icon  = $category_icons[$related['name']]  ?? 'fa-tools';
                            $r_image = $category_images[$related['name']] ?? 'image/1.jpg';
                        ?>
                            <div class="col-md-4">
                                <div class="related-service" onclick="window.location.href='service_detail.php?id=<?= $related['id'] ?>'">
                                    <img src="<?= $r_image ?>" alt="<?= htmlspecialchars($related['name']) ?>">
                                    <div class="related-service-content">
                                        <h5>
                                            <i class="fas <?= $r_icon ?> me-2" style="color: var(--primary);"></i>
                                            <?= htmlspecialchars($related['name']) ?>
                                        </h5>
                                        <p>Dịch vụ <?= strtolower(htmlspecialchars($related['name'])) ?> chuyên nghiệp, uy tín</p>
                                        <div class="related-service-link">
                                            <span>Xem chi tiết</span>
                                            <i class="fas fa-arrow-right"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </section>

    <!-- Footer -->
    <div id="footer-container"></div>

    <!-- Floating Hotline -->
    <div class="hotline-float">
        <span class="hotline-label">Gọi ngay: 0775 472 347</span>
        <a href="tel:0775472347" class="hotline-btn" title="Gọi ngay">
            <i class="fas fa-phone-alt"></i>
        </a>
    </div>

    <!-- Modal Đặt Lịch -->
    <div class="modal fade" id="bookingModal" tabindex="-1">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">
                        <i class="fas fa-calendar-check me-2" style="color: var(--primary);"></i>
                        Đặt Lịch Dịch Vụ
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="bookingForm">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label for="name" class="form-label">Họ và tên <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="name" placeholder="Nguyễn Văn A" required>
                            </div>
                            <div class="col-md-6">
                                <label for="phone" class="form-label">Số điện thoại <span class="text-danger">*</span></label>
                                <input type="tel" class="form-control" id="phone" placeholder="0xxx xxx xxx" required>
                            </div>
                            <div class="col-12">
                                <label for="selectedService" class="form-label">Dịch vụ đã chọn <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="selectedService" readonly>
                            </div>
                            <div class="col-12">
                                <label for="servicePrice" class="form-label">Giá dịch vụ (tham khảo)</label>
                                <input type="text" class="form-control" id="servicePrice" readonly>
                            </div>
                            <div class="col-12">
                                <label for="address" class="form-label">Địa chỉ <span class="text-danger">*</span></label>
                                <textarea class="form-control" id="address" rows="2" placeholder="Số nhà, đường, phường, quận..." required></textarea>
                            </div>
                            <div class="col-12">
                                <label for="note" class="form-label">Ghi chú thêm</label>
                                <textarea class="form-control" id="note" rows="2" placeholder="Mô tả thêm về tình trạng hư hỏng..."></textarea>
                            </div>
                        </div>
                        <div class="mt-4">
                            <button type="submit" class="btn btn-gradient w-100" style="padding: 14px; font-size: 1rem;">
                                <i class="fas fa-check-circle me-2"></i> Xác nhận đặt lịch
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Tra Cứu Đơn Hàng -->
    <div class="modal fade" id="viewOrderModal" tabindex="-1">
        <div class="modal-dialog modal-xl modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title fw-bold">
                        <i class="fas fa-search me-2" style="color: var(--primary);"></i>
                        Tra Cứu Đơn Hàng
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <form id="viewOrderForm">
                        <div class="input-group">
                            <input type="text" id="orderPhone" class="form-control"
                                placeholder="Nhập số điện thoại đặt lịch" required>
                            <button type="submit" class="btn btn-gradient" style="border-radius: 0 var(--radius-sm) var(--radius-sm) 0; padding: 12px 24px;">
                                <i class="fas fa-search me-1"></i> Tra cứu
                            </button>
                        </div>
                    </form>
                    <div id="orderResult" class="mt-4"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

    <!-- Load Header & Footer -->
    <script>
        fetch('header.html')
            .then(r => r.text())
            .then(html => {
                document.getElementById('header-container').innerHTML = html;
                // Scroll to section khi click anchor links trong header
                document.querySelectorAll('#header-container a[href^="#"]').forEach(link => {
                    link.addEventListener('click', function(e) {
                        const target = document.querySelector(this.getAttribute('href'));
                        if (target) {
                            e.preventDefault();
                            target.scrollIntoView({ behavior: 'smooth' });
                        } else {
                            window.location.href = 'index.html' + this.getAttribute('href');
                        }
                    });
                });
            });

        fetch('footer.html')
            .then(r => r.text())
            .then(html => {
                document.getElementById('footer-container').innerHTML = html;
            });

        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
        });
    </script>

    <!-- Booking Logic -->
    <script>
        // Mở modal và điền thông tin dịch vụ
        document.querySelectorAll('.booking-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const serviceName  = this.getAttribute('data-service-name');
                const servicePrice = this.getAttribute('data-service-price');

                document.getElementById('selectedService').value = serviceName;
                document.getElementById('servicePrice').value =
                    new Intl.NumberFormat('vi-VN').format(servicePrice) + 'đ';

                new bootstrap.Modal(document.getElementById('bookingModal')).show();
            });
        });

        // Scroll đến bảng giá
        function scrollToServices() {
            const first = document.querySelector('.service-item-card');
            if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // Submit đặt lịch → gọi API thật
        document.getElementById('bookingForm').addEventListener('submit', async function(e) {
            e.preventDefault();

            const name    = document.getElementById('name').value.trim();
            const phone   = document.getElementById('phone').value.trim();
            const service = document.getElementById('selectedService').value.trim();
            const address = document.getElementById('address').value.trim();
            const note    = document.getElementById('note').value.trim();

            if (!name || !phone || !service || !address) {
                alert('Vui lòng điền đầy đủ thông tin bắt buộc!');
                return;
            }

            const phoneRegex = /^(0|\+84)[0-9]{9}$/;
            if (!phoneRegex.test(phone)) {
                alert('Số điện thoại không hợp lệ!');
                return;
            }

            const submitBtn = this.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang gửi...';

            try {
                const res = await fetch('api/book.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, service_id: service, address, note })
                });

                const data = await res.json();

                if (data.status === 'success') {
                    alert('✅ Đặt lịch thành công! Mã đơn: ' + data.order_code);
                    bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
                    this.reset();
                } else {
                    alert('❌ ' + (data.message || 'Có lỗi xảy ra, vui lòng thử lại!'));
                }
            } catch (err) {
                console.error(err);
                alert('❌ Không thể kết nối server. Vui lòng thử lại sau!');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-check-circle me-2"></i> Xác nhận đặt lịch';
            }
        });
    </script>

    <script src="js/order_tracking.js"></script>
</body>
</html>
