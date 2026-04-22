<?php
session_start();

require_once __DIR__ . '/../lib/pricing_config_service.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

require_once __DIR__ . '/../includes/pricing/admin_pricing_logic.php';
// Sơ đồ bảo trì bảng giá: ../includes/pricing/README-pricing-admin.md
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý bảng giá | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin/pricing.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="../../public/assets/css/components/notifications.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý bảng giá</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <div class="pricing-shell"
            data-active-version-id="<?php echo htmlspecialchars((string) $pricingActiveVersionId, ENT_QUOTES, 'UTF-8'); ?>">
            <div class="pricing-content">
                <?php
                $instantConfig = $serviceConfigs[$instantServiceKey] ?? [];
                $zoneLabelsSource = is_array($domestic['tenvung'] ?? null) ? $domestic['tenvung'] : [];
                $regionLabels = [
                    'cung_quan' => (string) ($zoneLabelsSource['cung_quan'] ?? 'Nội quận/huyện'),
                    'noi_thanh' => (string) ($zoneLabelsSource['noi_thanh'] ?? 'Nội thành'),
                    'lien_tinh' => (string) ($zoneLabelsSource['lien_tinh'] ?? 'Liên tỉnh'),
                ];
                $serviceCount = count((array) $scheduledServiceMeta);
                $serviceTimeCount = count((array) ($serviceFeeConfig['thoigian'] ?? []));
                $weatherCount = count((array) ($serviceFeeConfig['thoitiet'] ?? []));
                $vehicleCount = count((array) $vehicleConfigs);
                $goodsCount = count((array) $goodsFees);
                $pricingStatusLabel = htmlspecialchars($pricingSourceLabel, ENT_QUOTES, 'UTF-8');
                ?>
                <section class="pricing-admin-overview">
                    <div>
                        <p class="pricing-admin-overview__eyebrow">Quản trị bảng giá</p>
                        <h3>Điều phối cấu hình giá giao hàng</h3>
                        <p>Kiểm soát và cập nhật cấu hình giá theo từng nhóm, theo dõi đồng bộ JSON public.</p>
                    </div>
                    <div class="pricing-admin-overview__metrics">
                        <span><strong><?php echo $serviceCount; ?></strong>Gói chính</span>
                        <span><strong><?php echo $vehicleCount; ?></strong>Phương tiện</span>
                        <span><strong><?php echo $goodsCount; ?></strong>Loại hàng</span>
                    </div>
                </section>

                <div class="pricing-control-grid">
                    <div
                        class="pricing-source-panel <?php echo $pricingStorageSource === 'krud' ? 'is-krud' : 'is-cache'; ?>">
                        <div>
                            <div class="pricing-source-panel__title">Nguồn bảng giá:
                                <?php echo htmlspecialchars($pricingSourceLabel, ENT_QUOTES, 'UTF-8'); ?></div>
                            <p class="pricing-source-panel__desc">
                                <?php echo htmlspecialchars($pricingSourceDescription, ENT_QUOTES, 'UTF-8'); ?></p>
                        </div>
                    </div>
                    <div class="pricing-sync-panel" data-pricing-sync-panel>
                        <div>
                            <div class="pricing-sync-panel__title">Đồng bộ public JSON</div>
                            <p class="pricing-sync-panel__status" data-pricing-sync-status>
                                Chưa kiểm tra. Dùng nút này để so sánh dữ liệu active KRUD với JSON cache
                                public/data/pricing-data.json.
                            </p>
                        </div>
                        <div class="pricing-sync-panel__actions">
                            <button type="button" class="pricing-action-btn pricing-action-btn--primary"
                                data-pricing-sync-check>
                                <i class="fa-solid fa-rotate"></i> Kiểm tra đồng bộ
                            </button>
                            <button type="button" class="pricing-action-btn" data-pricing-sync-export>
                                <i class="fa-solid fa-file-export"></i> Export lại JSON
                            </button>
                        </div>
                    </div>
                </div>

                <div class="pricing-tabs">
                    <div class="pricing-tabs__label">Mục chỉnh giá</div>
                    <nav class="pricing-nav pricing-nav--tabs">
                        <a href="#section-vung" data-pricing-tab="section-vung"><i class="fa-solid fa-layer-group"></i>
                            Ba gói chính</a>
                        <a href="#section-instant" data-pricing-tab="section-instant"><i class="fa-solid fa-bolt"></i>
                            Giao ngay</a>
                        <a href="#section-service-fee" data-pricing-tab="section-service-fee"><i
                                class="fa-solid fa-sliders"></i> Phụ phí dịch vụ</a>
                        <a href="#section-cod" data-pricing-tab="section-cod"><i class="fa-solid fa-shield-halved"></i>
                            COD và bảo hiểm</a>
                        <a href="#section-vehicle" data-pricing-tab="section-vehicle"><i
                                class="fa-solid fa-truck-fast"></i> Phương tiện</a>
                        <a href="#section-goods" data-pricing-tab="section-goods"><i class="fa-solid fa-box"></i> Phụ
                            phí loại hàng</a>
                    </nav>
                </div>
                <?php
                // View được tách để file chính chỉ giữ bootstrap/layout; các partial dùng chung biến đã chuẩn bị phía trên.
                include __DIR__ . '/../includes/pricing/admin_pricing_sections.php';
                include __DIR__ . '/../includes/pricing/admin_pricing_modals.php';
                ?>
            </div>
        </div>

    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script>
        window.GHNAdminPricing = {
            pageUrl: "admin_pricing.php",
            exportUrl: "../api/pricing_export.php",
            publicPricingJsonUrl: "../../public/data/pricing-data.json",
            username: <?php echo json_encode((string) ($_SESSION['username'] ?? $_SESSION['user_id'] ?? 'admin'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            activeVersionId: <?php echo json_encode((int) $pricingActiveVersionId, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            storageSource: <?php echo json_encode((string) $pricingStorageSource, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            canEdit: <?php echo json_encode((bool) $pricingCanEdit, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            currentPricingData: <?php echo json_encode($pricingData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
        };
    </script>
    <script src="../../public/assets/js/modules/core/app-core.js?v=<?php echo time(); ?>"></script>
    <script src="assets/js/admin-pricing-utils.js?v=<?php echo time(); ?>"></script>
    <script src="assets/js/admin-pricing-krud-client.js?v=<?php echo time(); ?>"></script>
    <script src="assets/js/admin-pricing-feedback.js?v=<?php echo time(); ?>"></script>
    <script src="assets/js/admin-pricing-krud.js?v=<?php echo time(); ?>"></script>
</body>

</html>
