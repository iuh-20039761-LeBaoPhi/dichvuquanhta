<?php
session_start();

require_once __DIR__ . '/../lib/pricing_config_service.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

require_once __DIR__ . '/../includes/pricing/admin_pricing_logic.php';
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
                <div class="pricing-grid">
                    <section class="pricing-card" id="section-vung">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Bảng giá dịch vụ chính</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Giá cố định của 3 gói
                                        theo vùng giao hàng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Cước nền của
                                        Tiêu chuẩn, Nhanh và Hỏa tốc.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> <?php echo $serviceCount; ?> gói</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-vung-details">
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--services">
                                    <thead>
                                        <tr>
                                            <th>Dịch vụ</th>
                                            <th>Tên hiển thị</th>
                                            <th><?php echo htmlspecialchars($regionLabels['cung_quan'], ENT_QUOTES, 'UTF-8'); ?>
                                            </th>
                                            <th><?php echo htmlspecialchars($regionLabels['noi_thanh'], ENT_QUOTES, 'UTF-8'); ?>
                                            </th>
                                            <th><?php echo htmlspecialchars($regionLabels['lien_tinh'], ENT_QUOTES, 'UTF-8'); ?>
                                            </th>
                                            <th>Giá bước tiếp</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel): ?>
                                            <?php $config = $serviceConfigs[$serviceKey] ?? []; ?>
                                            <?php $base = $config['coban'] ?? []; ?>
                                            <tr data-pricing-row="service"
                                                data-row-key="<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                <td><strong><?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?></strong>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['cungquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['khacquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['lientinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($config['buoctiep'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-edit-service-<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                            class="fa-solid fa-pen"></i> Sửa</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-instant">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Cấu hình Giao ngay</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Đơn giá gần, ngưỡng xa và
                                        đơn giá xa của xe máy.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Phần cước vận
                                        chuyển chính của dịch vụ Giao ngay.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> 1 cấu hình</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-instant-details">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Cước = <strong>max(phí tối thiểu, km × đơn giá × hệ số xăng)</strong>.
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table">
                                    <thead>
                                        <tr>
                                            <th>Tên hiển thị</th>
                                            <th>Đơn giá gần</th>
                                            <th>Ngưỡng xa</th>
                                            <th>Đơn giá xa</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr data-pricing-row="instant">
                                            <td><?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey]), ENT_QUOTES, 'UTF-8'); ?>
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview($instantNearPrice), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars((string) $instantFarThreshold, ENT_QUOTES, 'UTF-8'); ?>
                                                km</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview($instantFarPrice), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-edit-instant"><i class="fa-solid fa-pen"></i>
                                                    Sửa</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-service-fee">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phụ phí dịch vụ</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Phí cố định và hệ số theo
                                        khung giờ, điều kiện giao.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Phần phụ phí
                                        cộng thêm vào cước vận chuyển.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i>
                                        <?php echo $serviceTimeCount + $weatherCount; ?> phụ phí</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-service-fee-details">
                            <div class="pricing-summary-group">
                                <div class="pricing-summary-group__head">
                                    <h4>Khung giờ</h4>
                                    <span><?php echo count((array) ($serviceFeeConfig['thoigian'] ?? [])); ?> mục</span>
                                    <button type="button" class="pricing-action-btn"
                                        data-open-modal="modal-add-service-time"><i class="fa-solid fa-plus"></i> Thêm</button>
                                </div>
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-summary-table pricing-table--service-fees">
                                        <thead>
                                            <tr>
                                                <th>Tên</th>
                                                <th>Bắt đầu</th>
                                                <th>Kết thúc</th>
                                                <th>Phí cố định</th>
                                                <th>Hệ số</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                                                <tr data-pricing-row="service-time"
                                                    data-row-key="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><span
                                                            class="pricing-value"><?php echo htmlspecialchars(format_money_preview($timeConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><button type="button" class="pricing-action-btn"
                                                            data-open-modal="modal-edit-time-<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                                class="fa-solid fa-pen"></i> Sửa</button></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="pricing-summary-group">
                                <div class="pricing-summary-group__head">
                                    <h4>Điều kiện giao</h4>
                                    <span><?php echo count((array) ($serviceFeeConfig['thoitiet'] ?? [])); ?> mục</span>
                                    <button type="button" class="pricing-action-btn"
                                        data-open-modal="modal-add-weather"><i class="fa-solid fa-plus"></i> Thêm</button>
                                </div>
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-summary-table pricing-table--service-fees">
                                        <thead>
                                            <tr>
                                                <th>Tên</th>
                                                <th>Phí cố định</th>
                                                <th>Hệ số</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                                                <tr data-pricing-row="weather"
                                                    data-row-key="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                    <td><?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><span
                                                            class="pricing-value"><?php echo htmlspecialchars(format_money_preview($weatherConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($weatherConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><button type="button" class="pricing-action-btn"
                                                            data-open-modal="modal-edit-weather-<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                                class="fa-solid fa-pen"></i> Sửa</button></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-cod">
                        <div class="pricing-card__head">
                            <div>
                                <h3>COD / bảo hiểm</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Ngưỡng miễn phí, tỷ lệ và
                                        mức tối thiểu cho COD, bảo hiểm.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Các khoản thu hộ
                                        và bảo hiểm trong breakdown đơn hàng.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> 2 cấu hình</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                                <button type="button" class="btn-secondary pricing-open-btn"
                                    data-open-modal="modal-edit-cod"><i class="fa-solid fa-pen-to-square"></i> Chỉnh chi
                                    tiết</button>
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-cod-details">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Tỷ lệ thập phân (0.012 = 1.2%).
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table">
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Ngưỡng miễn phí</th>
                                            <th>Tỷ lệ</th>
                                            <th>Tối thiểu</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr data-pricing-row="cod" data-row-key="thuho">
                                            <td>COD</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['thuho']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars(number_format(((float) ($codInsuranceConfig['thuho']['kieu'] ?? 0)) * 100, 2), ENT_QUOTES, 'UTF-8'); ?>%
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['thuho']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-edit-cod"><i class="fa-solid fa-pen"></i>
                                                    Sửa</button></td>
                                        </tr>
                                        <tr data-pricing-row="cod" data-row-key="baohiem">
                                            <td>Bảo hiểm</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['baohiem']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars(number_format(((float) ($codInsuranceConfig['baohiem']['kieu'] ?? 0)) * 100, 2), ENT_QUOTES, 'UTF-8'); ?>%
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['baohiem']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-edit-cod"><i class="fa-solid fa-pen"></i>
                                                    Sửa</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card pricing-card--wide" id="section-vehicle">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phương tiện</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Giá cơ bản, hệ số xe, phí
                                        tối thiểu và tải trọng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Giá theo phương
                                        tiện, nhất là xe máy và xe 4 bánh.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> <?php echo $vehicleCount; ?> phương
                                        tiện</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                                <button type="button" class="btn-secondary pricing-open-btn"
                                    data-open-modal="modal-add-vehicle"><i class="fa-solid fa-plus"></i> Thêm phương
                                    tiện mới</button>
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-vehicle-details">
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--vehicles">
                                    <thead>
                                        <tr>
                                            <th>Phương tiện</th>
                                            <th class="text-right">Tải trọng tối đa</th>
                                            <th class="text-right">Đơn giá/km</th>
                                            <th class="text-right">Phí tối thiểu</th>
                                            <th class="text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                                            <?php
                                            $vKey = $vehicle['key'] ?? '';
                                            $donGiaKm = round((float) ($vehicle['gia_co_ban'] ?? 0) * (float) ($vehicle['he_so_xe'] ?? 1));
                                            ?>
                                            <tr data-pricing-row="vehicle"
                                                data-row-key="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                <td>
                                                    <div class="vehicle-info">
                                                        <div class="vehicle-icon">
                                                            <i class="fa-solid <?php echo get_vehicle_icon($vKey); ?>"></i>
                                                        </div>
                                                        <div class="vehicle-detail">
                                                            <span class="vehicle-name"
                                                                data-cell="label"><?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></span>
                                                            <span class="pricing-tag"
                                                                data-cell="key"><?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?></span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="text-right"><strong
                                                        data-cell="weight"><?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></strong>
                                                    <small class="text-muted">kg</small></td>
                                                <td class="text-right"><span class="pricing-value" data-cell="per-km"
                                                        style="font-weight:700; color:#0a2a66;"><?php echo htmlspecialchars(format_money_preview($donGiaKm), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td class="text-right"><span class="pricing-value"
                                                        data-cell="min-fee"><?php echo htmlspecialchars(format_money_preview($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td class="text-center"><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-edit-vehicle-<?php echo htmlspecialchars((string) ($vKey ?: $vehicleIndex), ENT_QUOTES, 'UTF-8'); ?>"><i
                                                            class="fa-solid fa-pen"></i> Sửa</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-goods">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phụ phí loại hàng</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Phụ phí, hệ số và mô tả
                                        của từng loại hàng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Khoản cộng thêm
                                        theo loại hàng trong breakdown cước.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> <?php echo $goodsCount; ?> loại
                                        hàng</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                                <button type="button" class="btn-secondary pricing-open-btn"
                                    data-open-modal="modal-add-goods"><i class="fa-solid fa-plus"></i> Thêm loại hàng
                                    mới</button>
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-goods-details">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Hệ số lớn hơn <strong>1</strong> sẽ cộng thêm theo phần trăm trên cước vận chuyển chính.
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--goods">
                                    <thead>
                                        <tr>
                                            <th>Mã</th>
                                            <th>Tên hiển thị</th>
                                            <th>Phụ phí</th>
                                            <th>Hệ số</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($goodsFees as $goodsKey => $goodsFee): ?>
                                            <tr data-pricing-row="goods"
                                                data-row-key="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                <td><strong><?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?></strong>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($goodsFee), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>

                                                <td><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-edit-goods-<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                            class="fa-solid fa-pen"></i> Sửa</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>

                <div data-pricing-modal-group="section-vung">
                    <!-- Modals sửa từng gói dịch vụ chính -->
                    <?php foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel): ?>
                        <?php
                        $config = $serviceConfigs[$serviceKey] ?? [];
                        $base = $config['coban'] ?? [];
                        $eta = $config['thoigian'] ?? [];
                        ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-service-<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Sửa gói: <?php echo htmlspecialchars($serviceLabel, ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật giá cố định cho vùng giao hàng.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post"
                                        data-confirm-message="Lưu thay đổi cho gói <?php echo htmlspecialchars($serviceLabel, ENT_QUOTES, 'UTF-8'); ?>?">
                                        <input type="hidden" name="action" value="save_services">
                                        <div class="pricing-add-grid">
                                            <div class="form-group" style="grid-column: 1 / -1;">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][ten]"
                                                    value="<?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label><?php echo htmlspecialchars($regionLabels['cung_quan'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][cungquan]"
                                                    value="<?php echo (int) ($base['cungquan'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label><?php echo htmlspecialchars($regionLabels['noi_thanh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][khacquan]"
                                                    value="<?php echo (int) ($base['khacquan'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label><?php echo htmlspecialchars($regionLabels['lien_tinh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][lientinh]"
                                                    value="<?php echo (int) ($base['lientinh'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Giá bước tiếp</label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][buoctiep]"
                                                    value="<?php echo (int) ($config['buoctiep'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Thời gian
                                                    <?php echo htmlspecialchars($regionLabels['cung_quan'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][thoigian][cung_quan]"
                                                    value="<?php echo htmlspecialchars((string) ($eta['cung_quan'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Thời gian
                                                    <?php echo htmlspecialchars($regionLabels['noi_thanh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][thoigian][noi_thanh]"
                                                    value="<?php echo htmlspecialchars((string) ($eta['noi_thanh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Thời gian
                                                    <?php echo htmlspecialchars($regionLabels['lien_tinh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][thoigian][lien_tinh]"
                                                    value="<?php echo htmlspecialchars((string) ($eta['lien_tinh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                        </div>
                                        <div class="pricing-actions">
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>


                <div data-pricing-modal-group="section-instant">
                    <!-- Modal Sửa Giao ngay (Refactored) -->
                    <div class="pricing-modal" data-modal="modal-edit-instant" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Cấu hình Giao ngay</h3>
                                    <p>Thiết lập đơn giá km cho phương tiện xe máy.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Lưu cấu hình dịch vụ Giao ngay?">
                                    <input type="hidden" name="action" value="save_instant_service">
                                    <div class="pricing-add-grid">
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Tên hiển thị dịch vụ</label>
                                            <input class="admin-input" type="text" name="instant_service[ten]"
                                                value="<?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey] ?? 'Giao ngay'), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Đơn giá (dưới ngưỡng xa)</label>
                                            <input class="admin-input" type="number"
                                                name="instant_distance[gia_xe_may_gan]"
                                                value="<?php echo (int) $instantNearPrice; ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Ngưỡng bắt đầu giá xa (km)</label>
                                            <input class="admin-input" type="number" step="0.1"
                                                name="instant_distance[nguong_xe_may_xa]"
                                                value="<?php echo (float) $instantFarThreshold; ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Đơn giá xa (trên ngưỡng)</label>
                                            <input class="admin-input" type="number"
                                                name="instant_distance[gia_xe_may_xa]"
                                                value="<?php echo (int) $instantFarPrice; ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i
                                                class="fa-solid fa-floppy-disk"></i> Lưu cấu hình</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div data-pricing-modal-group="section-service-fee">
                    <!-- Modal Thêm Khung giờ -->
                    <div class="pricing-modal" data-modal="modal-add-service-time" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm khung giờ mới</h3>
                                    <p>Thiết lập phí cố định/hệ số cho khoảng thời gian đặc biệt.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Thêm khung giờ mới?">
                                    <input type="hidden" name="action" value="add_service_time">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã khung giờ</label>
                                            <input class="admin-input" type="text" name="new_time_key"
                                                placeholder="Ví dụ: dem" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_time_label"
                                                placeholder="Ví dụ: Giờ đêm" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Bắt đầu công việc</label>
                                            <input class="admin-input" type="time" name="new_time_start" value="00:00"
                                                required>
                                        </div>
                                        <div class="form-group">
                                            <label>Kết thúc công việc</label>
                                            <input class="admin-input" type="time" name="new_time_end" value="23:59"
                                                required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phí cố định cộng thêm</label>
                                            <input class="admin-input" type="number" step="1000"
                                                name="new_time_fixed_fee" value="0">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số nhân cước</label>
                                            <input class="admin-input" type="number" step="0.01" name="new_time_he_so"
                                                value="1">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            khung giờ</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Thêm Điều kiện giao -->
                    <div class="pricing-modal" data-modal="modal-add-weather" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm điều kiện mới</h3>
                                    <p>Ví dụ: Trời mưa, Đường ngập, Ngày lễ...</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Thêm điều kiện giao mới?">
                                    <input type="hidden" name="action" value="add_weather">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã điều kiện</label>
                                            <input class="admin-input" type="text" name="new_weather_key"
                                                placeholder="Ví dụ: troi_mua" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_weather_label"
                                                placeholder="Ví dụ: Trời mưa" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phí cố định cộng thêm</label>
                                            <input class="admin-input" type="number" step="1000"
                                                name="new_weather_fixed_fee" value="0">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số nhân cước</label>
                                            <input class="admin-input" type="number" step="0.01"
                                                name="new_weather_he_so" value="1">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            điều kiện</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modals Sửa Khung giờ -->
                    <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-time-<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Sửa khung giờ:
                                            <?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật thông số phí cho khung giờ này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post" data-confirm-message="Lưu thay đổi cho khung giờ này?">
                                        <input type="hidden" name="action" value="save_service_time_row">
                                        <input type="hidden" name="original_time_key"
                                            value="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>">
                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã (Slug)</label>
                                                <input class="admin-input" type="text" name="time_row[key]"
                                                    value="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="time_row[ten]"
                                                    value="<?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Bắt đầu</label>
                                                <input class="admin-input" type="time" name="time_row[batdau]"
                                                    value="<?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? '00:00'), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Kết thúc</label>
                                                <input class="admin-input" type="time" name="time_row[ketthuc]"
                                                    value="<?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? '23:59'), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phí cố định</label>
                                                <input class="admin-input" type="number" step="1000"
                                                    name="time_row[phicodinh]"
                                                    value="<?php echo (int) ($timeConfig['phicodinh'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số</label>
                                                <input class="admin-input" type="number" step="0.01" name="time_row[heso]"
                                                    value="<?php echo (float) ($timeConfig['heso'] ?? 1); ?>">
                                            </div>
                                        </div>
                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_service_time"
                                                data-delete-key="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa khung giờ này?">
                                                <i class="fa-solid fa-trash"></i> Xóa
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <!-- Modals Sửa Điều kiện giao -->
                    <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-weather-<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Sửa điều kiện:
                                            <?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật thông số phí cho điều kiện này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post" data-confirm-message="Lưu thay đổi cho điều kiện này?">
                                        <input type="hidden" name="action" value="save_weather_row">
                                        <input type="hidden" name="original_weather_key"
                                            value="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>">
                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã (Slug)</label>
                                                <input class="admin-input" type="text" name="weather_row[key]"
                                                    value="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="weather_row[ten]"
                                                    value="<?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phí cố định</label>
                                                <input class="admin-input" type="number" step="1000"
                                                    name="weather_row[phicodinh]"
                                                    value="<?php echo (int) ($weatherConfig['phicodinh'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số</label>
                                                <input class="admin-input" type="number" step="0.01"
                                                    name="weather_row[heso]"
                                                    value="<?php echo (float) ($weatherConfig['heso'] ?? 1); ?>">
                                            </div>
                                        </div>
                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_weather"
                                                data-delete-key="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa điều kiện giao này?">
                                                <i class="fa-solid fa-trash"></i> Xóa
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div data-pricing-modal-group="section-cod">
                    <!-- Modal Sửa COD & Bảo hiểm (Refactored) -->
                    <div class="pricing-modal" data-modal="modal-edit-cod" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Chỉnh COD và Bảo hiểm</h3>
                                    <p>Thiết lập ngưỡng miễn phí, tỷ lệ và mức tối thiểu.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <p class="pricing-section__hint pricing-section__hint--inline">
                                    Tỷ lệ nhập dưới dạng số thập phân. Ví dụ <strong>0.012</strong> tương đương
                                    <strong>1.2%</strong>.
                                </p>
                                <form method="post" data-confirm-message="Lưu thay đổi COD và bảo hiểm?">
                                    <input type="hidden" name="action" value="save_cod_insurance">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Ngưỡng COD miễn phí</label>
                                            <input class="admin-input" type="number" name="cod_insurance[cod_nguong]"
                                                value="<?php echo (int) ($codInsuranceConfig['thuho']['nguong'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Tỷ lệ COD (thập phân)</label>
                                            <input class="admin-input" type="number" step="0.0001"
                                                name="cod_insurance[cod_kieu]"
                                                value="<?php echo (float) ($codInsuranceConfig['thuho']['kieu'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>COD tối thiểu</label>
                                            <input class="admin-input" type="number" name="cod_insurance[cod_toithieu]"
                                                value="<?php echo (int) ($codInsuranceConfig['thuho']['toithieu'] ?? 0); ?>">
                                        </div>
                                        <div class="pricing-divider" style="grid-column: 1 / -1; margin: 8px 0;"></div>
                                        <div class="form-group">
                                            <label>Ngưỡng Bảo hiểm</label>
                                            <input class="admin-input" type="number"
                                                name="cod_insurance[insurance_nguong]"
                                                value="<?php echo (int) ($codInsuranceConfig['baohiem']['nguong'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Tỷ lệ Bảo hiểm (thập phân)</label>
                                            <input class="admin-input" type="number" step="0.0001"
                                                name="cod_insurance[insurance_kieu]"
                                                value="<?php echo (float) ($codInsuranceConfig['baohiem']['kieu'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Bảo hiểm tối thiểu</label>
                                            <input class="admin-input" type="number"
                                                name="cod_insurance[insurance_toithieu]"
                                                value="<?php echo (int) ($codInsuranceConfig['baohiem']['toithieu'] ?? 0); ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i
                                                class="fa-solid fa-floppy-disk"></i> Lưu cấu hình</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div data-pricing-modal-group="section-vehicle">
                    <!-- Modal Thêm phương tiện mới -->
                    <div class="pricing-modal" data-modal="modal-add-vehicle" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm phương tiện mới</h3>
                                    <p>Tạo cấu hình vận chuyển cho phương tiện mới.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Xác nhận thêm phương tiện mới?">
                                    <input type="hidden" name="action" value="add_vehicle">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã (Slug)</label>
                                            <input class="admin-input" type="text" name="new_vehicle_key"
                                                placeholder="Ví dụ: xe_tai_5t" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_vehicle_label"
                                                placeholder="Ví dụ: Xe tải 5T" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tải trọng tối đa (kg)</label>
                                            <input class="admin-input" type="number" step="0.1"
                                                name="new_vehicle_weight" value="1000" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Giá cơ bản (VNĐ)</label>
                                            <input class="admin-input" type="number" step="500"
                                                name="new_vehicle_base_price" value="15000" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số xe</label>
                                            <input class="admin-input" type="number" step="0.01"
                                                name="new_vehicle_he_so_xe" value="1" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phí tối thiểu (VNĐ)</label>
                                            <input class="admin-input" type="number" step="1000"
                                                name="new_vehicle_min_fee" value="0" required>
                                        </div>
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Mô tả ngắn</label>
                                            <textarea class="admin-input pricing-textarea" rows="2"
                                                name="new_vehicle_description"></textarea>
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            phương tiện</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modals Sửa từng phương tiện -->
                    <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                        <?php $vKey = $vehicle['key'] ?? ''; ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-vehicle-<?php echo htmlspecialchars((string) ($vKey ?: $vehicleIndex), ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Chỉnh sửa:
                                            <?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật cấu hình chi tiết cho phương tiện này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post"
                                        data-confirm-message="Lưu thay đổi cho phương tiện <?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>?">
                                        <input type="hidden" name="action" value="save_vehicle_row">
                                        <input type="hidden" name="original_vehicle_key"
                                            value="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>">

                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã định danh</label>
                                                <input class="admin-input" type="text" name="vehicle_row[key]"
                                                    value="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="vehicle_row[label]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tải trọng tối đa (kg)</label>
                                                <input class="admin-input" type="number" step="0.1"
                                                    name="vehicle_row[trong_luong_toi_da]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Giá cơ bản (VNĐ)</label>
                                                <input class="admin-input" type="number" step="500"
                                                    name="vehicle_row[gia_co_ban]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['gia_co_ban'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số xe</label>
                                                <input class="admin-input" type="number" step="0.01"
                                                    name="vehicle_row[he_so_xe]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['he_so_xe'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phí tối thiểu (VNĐ)</label>
                                                <input class="admin-input" type="number" step="1000"
                                                    name="vehicle_row[phi_toi_thieu]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group" style="grid-column: 1 / -1;">
                                                <label>Mô tả ngắn</label>
                                                <textarea class="admin-input pricing-textarea" rows="2"
                                                    name="vehicle_row[description]"><?php echo htmlspecialchars((string) ($vehicle['description'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                                            </div>
                                        </div>

                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_vehicle"
                                                data-delete-key="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa vĩnh viễn phương tiện này?">
                                                <i class="fa-solid fa-trash"></i> Xóa phương tiện
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>


                <div data-pricing-modal-group="section-goods">
                    <!-- Modal Thêm loại phụ phí mới -->
                    <div class="pricing-modal" data-modal="modal-add-goods" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm loại hàng mới</h3>
                                    <p>Tạo loại hàng kèm theo phí và hệ số riêng.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Xác nhận thêm loại hàng mới?">
                                    <input type="hidden" name="action" value="add_goods_fee">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã loại hàng</label>
                                            <input class="admin-input" type="text" name="new_key"
                                                placeholder="Ví dụ: de_vo" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_label"
                                                placeholder="Ví dụ: Dễ vỡ" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phụ phí cộng thêm (VNĐ)</label>
                                            <input class="admin-input" type="number" step="1000" name="new_fee"
                                                value="0">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số nhân cước</label>
                                            <input class="admin-input" type="number" step="0.01" name="new_he_so"
                                                value="1">
                                        </div>
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Mô tả loại hàng</label>
                                            <textarea class="admin-input pricing-textarea" rows="2"
                                                name="new_description"></textarea>
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            loại hàng</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modals Sửa từng loại hàng -->
                    <?php foreach ($goodsFees as $goodsKey => $goodsFee): ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-goods-<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Cấu hình:
                                            <?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Chỉnh sửa các tham số phí cho loại hàng này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post"
                                        data-confirm-message="Lưu thay đổi cho loại hàng <?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>?">
                                        <input type="hidden" name="action" value="save_goods_fee_row">
                                        <input type="hidden" name="original_goods_key"
                                            value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">

                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã (Slug)</label>
                                                <input class="admin-input" type="text" name="goods_row[key]"
                                                    value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="goods_row[label]"
                                                    value="<?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phụ phí cộng thêm (VNĐ)</label>
                                                <input class="admin-input" type="number" step="1000" name="goods_row[fee]"
                                                    value="<?php echo htmlspecialchars((string) $goodsFee, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số nhân cước</label>
                                                <input class="admin-input" type="number" step="0.01" name="goods_row[he_so]"
                                                    value="<?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group" style="grid-column: 1 / -1;">
                                                <label>Mô tả loại hàng</label>
                                                <textarea class="admin-input pricing-textarea" rows="2"
                                                    name="goods_row[description]"><?php echo htmlspecialchars((string) ($goodsDescriptions[$goodsKey] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                                            </div>
                                        </div>

                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_goods_fee"
                                                data-delete-key="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa vĩnh viễn loại hàng này?">
                                                <i class="fa-solid fa-trash"></i> Xóa loại hàng
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
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
    <script src="assets/js/admin-pricing-krud.js?v=<?php echo time(); ?>"></script>
</body>

</html>