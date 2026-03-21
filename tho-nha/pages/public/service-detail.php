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
    header('Location: ../../index.html');
    exit;
}

// Lấy danh sách dịch vụ trong category (bao gồm pricing_json nếu có)
$services_query = "SELECT *, IF(COLUMN_JSON IS NULL, NULL, pricing_json) as pricing_json
                   FROM services WHERE category_id = ? AND is_active = 1 ORDER BY id ASC";
// Fallback cho MySQL cũ không có COLUMN_JSON
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
    'Sửa tủ lạnh'  => 'fa-snowflake',
    'Sửa tivi'     => 'fa-tv',
    'Sửa bếp từ'   => 'fa-fire',
    'Cải tạo nhà'  => 'fa-hammer'
];

// Định nghĩa hình ảnh cho từng category
$category_images = [
    'Sửa máy lạnh' => 'image/tho-nha-dich-vu-sua-may-lanh-gia-dinh.jpg',
    'Sửa máy giặt' => 'image/tho-nha-dich-vu-sua-may-giat-chuyen-nghiep.jpg',
    'Nhà vệ sinh'  => 'image/tho-nha-dich-vu-nha-ve-sinh-thong-tac-chong-tham.jpg',
    'Điện nước'    => 'image/tho-nha-dich-vu-sua-dien-nuoc-gia-dinh.jpg',
    'Sửa tủ lạnh'  => 'image/tho-nha-dich-vu-sua-tu-lanh-gia-dinh.jpg',
    'Sửa tivi'     => 'image/tho-nha-dich-vu-sua-tu-lanh-gia-dinh.jpg',
    'Sửa bếp từ'   => 'image/tho-nha-dich-vu-sua-tu-lanh-gia-dinh.jpg',
    'Cải tạo nhà'  => 'image/tho-nha-dich-vu-sua-bep-tu-dien-tu.jpg'
];

$icon       = $category_icons[$category['name']]  ?? 'fa-tools';
$main_image = $category_images[$category['name']] ?? 'image/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg';

// Tính giá thấp nhất và cao nhất (bao gồm cả brandPrices)
$all_prices = [];
foreach ($services as $s) {
    $bp = !empty($s['pricing_json']) ? (json_decode($s['pricing_json'], true)['brandPrices'] ?? null) : null;
    if (!$bp && !empty($s['brand_prices'])) $bp = json_decode($s['brand_prices'], true);
    if ($bp) {
        foreach ($bp as $b) $all_prices[] = (int)$b['price'];
    } else {
        $all_prices[] = (int)$s['price'];
    }
}
$min_price   = !empty($all_prices) ? min($all_prices) : 0;
$max_price   = !empty($all_prices) ? max($all_prices) : 0;
$price_range = number_format($min_price) . 'đ – ' . number_format($max_price) . 'đ';

// Lấy phí di chuyển chung cho category (từ service đầu tiên, hoặc null)
$category_travel_fee = null;
foreach ($services as $s) {
    if (!empty($s['pricing_json'])) {
        $pj = json_decode($s['pricing_json'], true);
        if (!empty($pj['travelFee'])) { $category_travel_fee = $pj['travelFee']; break; }
    }
}
?>
<?php
// SEO variables
$svc_name  = htmlspecialchars($category['name']);
$svc_lower = strtolower($svc_name);
$seo_title = 'Dịch Vụ Quanh Ta - Thợ Nhà - ' . $svc_name;
$seo_desc  = 'Dịch vụ ' . $svc_lower . ' uy tín tại TP.HCM – Thợ Nhà. Bảo hành 6-12 tháng, có mặt trong 30 phút. Linh kiện chính hãng, giá minh bạch. Hotline 24/7: 0775 472 347.';
$seo_keys  = $svc_lower . ', thợ ' . $svc_lower . ', ' . $svc_lower . ' tphcm, thợ nhà, sửa chữa nhà, dịch vụ sửa nhà tphcm';
$seo_url   = 'https://iuh-20039761-lebaophi.github.io/GlobalCare/tho-nha/service-detail.php?id=' . $category_id;
$seo_img   = 'https://iuh-20039761-lebaophi.github.io/GlobalCare/tho-nha/' . $main_image;

// Schema.org Service data
$schema_items = array_map(function($s, $i) {
    return [
        '@type'         => 'Offer',
        'position'      => $i + 1,
        'name'          => $s['name'],
        'description'   => $s['description'] ?? '',
        'price'         => (int)$s['price'],
        'priceCurrency' => 'VND',
        'availability'  => 'https://schema.org/InStock',
    ];
}, $services, array_keys($services));

$schema = [
    '@context'    => 'https://schema.org',
    '@type'       => 'Service',
    'name'        => $category['name'],
    'description' => $seo_desc,
    'url'         => $seo_url,
    'image'       => $seo_img,
    'provider'    => [
        '@type'     => 'HomeAndConstructionBusiness',
        '@id'       => 'https://iuh-20039761-lebaophi.github.io/GlobalCare/tho-nha/',
        'name'      => 'Thợ Nhà',
        'telephone' => '+84775472347',
        'address'   => [
            '@type'           => 'PostalAddress',
            'addressLocality' => 'Thành phố Hồ Chí Minh',
            'addressCountry'  => 'VN',
        ],
    ],
    'areaServed'       => ['@type' => 'City', 'name' => 'Thành phố Hồ Chí Minh'],
    'hasOfferCatalog'  => [
        '@type'           => 'OfferCatalog',
        'name'            => 'Bảng Giá ' . $category['name'],
        'itemListElement' => $schema_items,
    ],
    'aggregateRating'  => [
        '@type'       => 'AggregateRating',
        'ratingValue' => '4.9',
        'reviewCount' => '1000',
        'bestRating'  => '5',
    ],
];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- ===== Primary SEO Meta Tags ===== -->
    <title><?= $seo_title ?></title>
    <meta name="title"       content="<?= $seo_title ?>">
    <meta name="description" content="<?= $seo_desc ?>">
    <meta name="keywords"    content="<?= $seo_keys ?>">
    <meta name="author"      content="Thợ Nhà">
    <meta name="robots"      content="index, follow">
    <meta name="language"    content="Vietnamese">
    <meta name="geo.region"    content="VN-SG">
    <meta name="geo.placename" content="Thành phố Hồ Chí Minh">
    <link rel="canonical"    href="<?= $seo_url ?>">
    <link rel="icon"          type="image/jpeg" href="image/tho-nha-logo-thuong-hieu-cropped.jpg">
    <link rel="apple-touch-icon" href="image/tho-nha-logo-thuong-hieu-cropped.jpg">

    <!-- ===== Open Graph / Facebook ===== -->
    <meta property="og:type"        content="website">
    <meta property="og:url"         content="<?= $seo_url ?>">
    <meta property="og:title"       content="<?= $seo_title ?>">
    <meta property="og:description" content="<?= $seo_desc ?>">
    <meta property="og:image"       content="<?= $seo_img ?>">
    <meta property="og:image:width"  content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt"    content="<?= $svc_name ?> - Thợ Nhà TP.HCM">
    <meta property="og:locale"      content="vi_VN">
    <meta property="og:site_name"   content="Thợ Nhà – GlobalCare">

    <!-- ===== Twitter Card ===== -->
    <meta name="twitter:card"        content="summary_large_image">
    <meta name="twitter:url"         content="<?= $seo_url ?>">
    <meta name="twitter:title"       content="<?= $seo_title ?>">
    <meta name="twitter:description" content="<?= $seo_desc ?>">
    <meta name="twitter:image"       content="<?= $seo_img ?>">

    <!-- ===== Schema.org JSON-LD ===== -->
    <script type="application/ld+json">
    <?= json_encode($schema, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) ?>
    </script>

    <!-- ===== Preconnect for performance ===== -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preconnect" href="https://cdn.jsdelivr.net">
    <link rel="preconnect" href="https://cdnjs.cloudflare.com">

    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="../../assets/css/style.css">
</head>
<body>

    <!-- Header -->
    <div id="header-container"></div>

    <!-- Breadcrumb -->
    <div class="breadcrumb-wrap">
        <div class="container">
            <nav aria-label="breadcrumb">
                <ol class="breadcrumb">
                    <li class="breadcrumb-item"><a href="../../index.html">Trang chủ</a></li>
                    <li class="breadcrumb-item"><a href="../../index.html#services">Dịch vụ</a></li>
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
                            <?php foreach ($services as $svcIdx => $service):
                                // Parse pricing_json (mới) hoặc brand_prices (cũ)
                                $pricingJson  = !empty($service['pricing_json'])
                                    ? json_decode($service['pricing_json'], true) : [];
                                $brandPrices  = $pricingJson['brandPrices']
                                    ?? (!empty($service['brand_prices']) ? json_decode($service['brand_prices'], true) : null);
                                $hasBrands    = !empty($brandPrices) && count($brandPrices) > 1;

                                // Phí di chuyển/khảo sát từ pricing_json
                                $travelFee    = $pricingJson['travelFee']  ?? $category_travel_fee;
                                $surveyFee    = $pricingJson['surveyFee']  ?? null;
                                $priceRange   = $pricingJson['priceRange'] ?? null;

                                // Giá khởi tạo (hãng đầu hoặc giá mặc định)
                                $initPrice    = $hasBrands ? $brandPrices[0]['price']        : $service['price'];
                                $initMaterial = $hasBrands ? $brandPrices[0]['materialCost'] : $service['material_cost'];

                                // Tính tổng ước tính
                                $tfMin = $travelFee ? (int)($travelFee['min'] ?? $travelFee['fixedAmount'] ?? 0) : 0;
                                $tfMax = $travelFee ? (int)($travelFee['max'] ?? $travelFee['fixedAmount'] ?? 0) : 0;
                                $sfAmt = ($surveyFee && !empty($surveyFee['required'])) ? (int)($surveyFee['amount'] ?? 0) : 0;
                                $hasFees = $tfMax > 0 || $sfAmt > 0;
                                $estMin = (int)$initPrice + $tfMin + $sfAmt;
                                $estMax = (int)$initPrice + $tfMax + $sfAmt;
                            ?>
                                <div class="service-item-card">

                                    <!-- Tên + badges nhanh -->
                                    <div class="sic-title-row">
                                        <h3 class="service-item-name">
                                            <i class="fas fa-check-circle me-2" style="color:var(--primary);"></i>
                                            <?= htmlspecialchars($service['name']) ?>
                                        </h3>
                                        <div class="sic-badges">
                                            <?php if (!empty($service['duration'])): ?>
                                                <span class="sic-badge sic-badge--time">
                                                    <i class="fas fa-clock"></i> <?= htmlspecialchars($service['duration']) ?>
                                                </span>
                                            <?php endif; ?>
                                            <?php if (!empty($service['warranty'])): ?>
                                                <span class="sic-badge sic-badge--warranty">
                                                    <i class="fas fa-shield-alt"></i> BH <?= htmlspecialchars($service['warranty']) ?>
                                                </span>
                                            <?php endif; ?>
                                        </div>
                                    </div>

                                    <!-- Mô tả -->
                                    <?php if (!empty($service['description'])): ?>
                                        <p class="service-item-description">
                                            <?= htmlspecialchars($service['description']) ?>
                                        </p>
                                    <?php endif; ?>

                                    <!-- Badge khảo sát bắt buộc -->
                                    <?php if ($surveyFee && !empty($surveyFee['required'])): ?>
                                        <div style="margin-bottom:8px;">
                                            <span class="sic-badge" style="background:rgba(245,158,11,0.12);color:#b45309;border-color:rgba(245,158,11,0.3);font-size:0.75rem;padding:3px 8px;">
                                                <i class="fas fa-clipboard-check me-1"></i>Cần khảo sát
                                            </span>
                                        </div>
                                    <?php endif; ?>

                                    <!-- Khoảng giá theo hãng -->
                                    <?php if ($priceRange): ?>
                                        <div style="font-size:0.78rem;color:#64748b;margin-bottom:6px;">
                                            <i class="fas fa-info-circle me-1"></i>
                                            Khoảng giá: <?= number_format($priceRange['min']) ?>đ – <?= number_format($priceRange['max']) ?>đ (theo hãng)
                                        </div>
                                    <?php endif; ?>

                                    <!-- Brand selector (chỉ hiện khi có nhiều hãng) -->
                                    <?php if ($hasBrands): ?>
                                        <div class="brand-selector">
                                            <div class="brand-selector-label">
                                                <i class="fas fa-tag me-1"></i>Chọn hãng:
                                            </div>
                                            <div class="brand-options">
                                                <?php foreach ($brandPrices as $i => $bp): ?>
                                                    <button class="brand-option<?= $i === 0 ? ' active' : '' ?>"
                                                        data-brand="<?= htmlspecialchars($bp['name']) ?>"
                                                        data-price="<?= (int)$bp['price'] ?>"
                                                        data-material-cost="<?= (int)($bp['materialCost'] ?? 0) ?>"
                                                        data-labor-cost="<?= (int)($service['labor_cost'] ?? 0) ?>"
                                                        data-travel-fee="<?= htmlspecialchars(json_encode($travelFee)) ?>"
                                                        data-survey-fee="<?= htmlspecialchars(json_encode($surveyFee)) ?>">
                                                        <?= htmlspecialchars($bp['name']) ?>
                                                    </button>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    <?php endif; ?>

                                    <!-- Footer: giá + đặt lịch -->
                                    <div class="sic-footer">
                                        <div class="sic-price-block">
                                            <div class="sic-price-label">Giá dịch vụ</div>
                                            <div class="sic-total-price"><?= number_format($initPrice) ?>đ</div>

                                            <?php if (!empty($service['labor_cost']) || !empty($initMaterial)): ?>
                                                <div class="sic-price-breakdown">
                                                    <?php if (!empty($service['labor_cost'])): ?>
                                                        <span class="sic-breakdown-item sic-bd-labor">
                                                            <i class="fas fa-hammer"></i>
                                                            Công: <?= number_format($service['labor_cost']) ?>đ
                                                        </span>
                                                    <?php endif; ?>
                                                    <?php if (!empty($service['labor_cost']) && !empty($initMaterial)): ?>
                                                        <span class="sic-breakdown-sep">+</span>
                                                    <?php endif; ?>
                                                    <?php if (!empty($initMaterial)): ?>
                                                        <span class="sic-breakdown-item sic-bd-material">
                                                            <i class="fas fa-box"></i>
                                                            Vật liệu: <?= number_format($initMaterial) ?>đ
                                                        </span>
                                                    <?php endif; ?>
                                                </div>
                                            <?php endif; ?>

                                            <?php if ($hasFees): ?>
                                                <div class="sic-fee-breakdown" style="margin-top:8px;padding:8px 10px;background:#f0fdfb;border:1px solid rgba(17,153,142,0.2);border-radius:6px;font-size:0.8rem;">
                                                    <?php if ($tfMax > 0): ?>
                                                        <div style="display:flex;justify-content:space-between;color:#64748b;margin-bottom:3px;">
                                                            <span><i class="fas fa-motorcycle me-1"></i>Phí di chuyển</span>
                                                            <span><?= $tfMin === $tfMax ? number_format($tfMin).'đ' : number_format($tfMin).'đ – '.number_format($tfMax).'đ' ?></span>
                                                        </div>
                                                    <?php endif; ?>
                                                    <?php if ($sfAmt > 0): ?>
                                                        <div style="display:flex;justify-content:space-between;color:#b45309;margin-bottom:3px;">
                                                            <span><i class="fas fa-clipboard-check me-1"></i>Phí khảo sát (bắt buộc)</span>
                                                            <span><?= number_format($sfAmt) ?>đ</span>
                                                        </div>
                                                    <?php endif; ?>
                                                    <div style="display:flex;justify-content:space-between;font-weight:600;color:var(--primary);border-top:1px dashed rgba(17,153,142,0.3);margin-top:5px;padding-top:5px;">
                                                        <span>Tổng tạm tính:</span>
                                                        <span><?= $estMin === $estMax ? number_format($estMin).'đ' : number_format($estMin).'đ – '.number_format($estMax).'đ' ?></span>
                                                    </div>
                                                </div>
                                            <?php endif; ?>
                                        </div>

                                        <button
                                            class="btn btn-gradient btn-sm booking-btn"
                                            data-service-name="<?= htmlspecialchars($service['name']) ?>"
                                            data-service-price="<?= (int)$initPrice ?>"
                                            data-travel-fee="<?= htmlspecialchars(json_encode($travelFee)) ?>"
                                            data-survey-fee="<?= htmlspecialchars(json_encode($surveyFee)) ?>"
                                        >
                                            <i class="fas fa-calendar-check me-1"></i> Đặt lịch
                                        </button>
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
                                <img src="image/tho-nha-dich-vu-cai-tao-nha-thi-cong.jpg" alt="Khách hàng hài lòng">
                            </div>
                            <div class="gallery-item">
                                <img src="image/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg" alt="Thợ chuyên nghiệp">
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
                        <?php if ($category_travel_fee): ?>
                            <?php
                                $tf_min = (int)($category_travel_fee['min'] ?? $category_travel_fee['fixedAmount'] ?? 0);
                                $tf_max = (int)($category_travel_fee['max'] ?? $category_travel_fee['fixedAmount'] ?? 0);
                                $tf_label = $tf_min === $tf_max
                                    ? number_format($tf_min) . 'đ'
                                    : number_format($tf_min) . 'đ – ' . number_format($tf_max) . 'đ';
                            ?>
                            <div style="font-size:0.82rem;color:rgba(255,255,255,0.85);margin-bottom:4px;">
                                <i class="fas fa-motorcycle me-1"></i>Phí di chuyển: <strong><?= $tf_label ?></strong>
                            </div>
                        <?php endif; ?>
                        <p class="mb-4 mt-2"><small>* Giá thực tế có thể thay đổi theo tình trạng cụ thể</small></p>
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
                            $r_image = $category_images[$related['name']] ?? 'image/tho-nha-hero-banner-tho-sua-chua-chuyen-nghiep.jpg';
                        ?>
                            <div class="col-md-4">
                                <div class="related-service" onclick="window.location.href='service-detail.php?id=<?= $related['id'] ?>'">
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

    <!-- Modal Đặt Lịch — được load từ partials/booking-modal-detail.html -->
    <div id="booking-modal-container"></div>

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
        fetch('../../partials/dau-trang.html')
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
                            window.location.href = '../../index.html' + this.getAttribute('href');
                        }
                    });
                });
            });

        fetch('../../partials/chan-trang.html')
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

    <!-- Booking: lazy-load modal + card brand selection (booking-detail.js) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="../../assets/js/public/map-picker.js"></script>
    <script src="../../assets/js/public/booking-detail.js"></script>

    <script src="../../assets/js/public/order-tracking.js"></script>
    <script src="../../assets/js/shared/auth-nav.js"></script>
    <script src="../../assets/js/public/booking-autofill.js"></script>
</body>
</html>

