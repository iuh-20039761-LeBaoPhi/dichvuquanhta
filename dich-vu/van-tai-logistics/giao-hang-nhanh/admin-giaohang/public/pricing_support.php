<?php
session_start();

require_once __DIR__ . '/../lib/pricing_config_service.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$fallbackPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'pricing-data.json';
$pricingLoad = pricing_service_load_config($fallbackPath);
$pricingData = is_array($pricingLoad['data'] ?? null) ? $pricingLoad['data'] : [];
$activeVersionId = (int) ($pricingLoad['version_id'] ?? pricing_service_get_active_version_id());
$domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
$cityCount = count((array) ($domestic['danhsachthanhpho'] ?? []));
$districtCount = 0;
foreach (($pricingData['BAOGIACHITIET']['thanhpho'] ?? []) as $districts) {
    $districtCount += count((array) $districts);
}
$regionCount = count((array) ($domestic['tenvung'] ?? []));
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Dữ liệu bảng giá | Admin Giao Hàng</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .pricing-support-hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 20px;
            align-items: center;
            padding: 24px;
            border-radius: 16px;
            background: linear-gradient(135deg, #0a2a66 0%, #163f87 100%);
            color: #fff;
            margin-bottom: 22px;
        }

        .pricing-support-hero h3 {
            margin: 0 0 8px;
            font-size: 26px;
        }

        .pricing-support-hero p {
            margin: 0;
            color: rgba(255, 255, 255, 0.78);
            line-height: 1.6;
        }

        .pricing-support-metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(110px, 1fr));
            gap: 12px;
        }

        .pricing-support-metrics span {
            display: block;
            min-width: 110px;
            padding: 14px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.16);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .pricing-support-metrics strong {
            display: block;
            margin-bottom: 5px;
            font-size: 24px;
        }

        .pricing-support-layout {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(340px, 0.9fr);
            gap: 22px;
            align-items: start;
        }

        .pricing-support-card .admin-card-header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            align-items: flex-start;
        }

        .pricing-support-card .admin-card-header p {
            margin: 5px 0 0;
            color: #64748b;
            line-height: 1.5;
        }

        .pricing-support-stack {
            display: grid;
            gap: 22px;
        }

        .pricing-support-form {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            padding: 16px;
            border: 1px solid #e6edf7;
            border-radius: 14px;
            background: #f8fbff;
            margin-bottom: 18px;
        }

        .pricing-support-form .span-full {
            grid-column: 1 / -1;
        }

        .pricing-support-actions,
        .pricing-support-row-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }

        .pricing-support-icon-btn {
            width: 36px;
            height: 36px;
            border: 1px solid #d9e5ff;
            border-radius: 10px;
            background: #f8fbff;
            color: #0a2a66;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
        }

        .pricing-support-icon-btn.is-danger {
            color: #b91c1c;
            border-color: #fecaca;
            background: #fff5f5;
        }

        .pricing-support-icon-btn:hover {
            border-color: #0a2a66;
        }

        .pricing-support-message {
            padding: 14px 16px;
            border-radius: 12px;
            margin-bottom: 18px;
            border: 1px solid transparent;
            font-weight: 700;
        }

        .pricing-support-message.is-success {
            background: #dcfce7;
            border-color: #bbf7d0;
            color: #166534;
        }

        .pricing-support-message.is-warning {
            background: #fef3c7;
            border-color: #fde68a;
            color: #92400e;
        }

        .pricing-support-message.is-error {
            background: #fee2e2;
            border-color: #fecaca;
            color: #991b1b;
        }

        .pricing-support-message.is-info {
            background: #dbeafe;
            border-color: #bfdbfe;
            color: #1e40af;
        }

        .pricing-support-empty {
            padding: 24px;
            text-align: center;
            color: #64748b;
            font-weight: 700;
        }

        .pricing-support-filter {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 12px;
        }

        .pricing-support-filter .admin-select {
            max-width: 320px;
        }

        .pricing-support-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 999px;
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 800;
        }

        .pricing-support-status.is-active {
            background: #dcfce7;
            color: #166534;
        }

        .pricing-support-status.is-draft {
            background: #e0f2fe;
            color: #075985;
        }

        .pricing-support-status.is-other {
            background: #f1f5f9;
            color: #475569;
        }

        @media (max-width: 1100px) {
            .pricing-support-layout,
            .pricing-support-hero {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 720px) {
            .pricing-support-form,
            .pricing-support-metrics {
                grid-template-columns: 1fr;
            }

            .pricing-support-actions,
            .pricing-support-row-actions {
                justify-content: flex-start;
            }
        }
    </style>
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <div>
                <a href="admin_pricing.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Bảng giá chính</a>
                <h2 class="page-title">Dữ liệu bảng giá</h2>
            </div>
            <button type="button" class="btn-secondary" id="pricing-support-refresh">
                <i class="fa-solid fa-rotate"></i> Tải lại
            </button>
        </div>

        <section class="pricing-support-hero">
            <div>
                <h3>Quản lý dữ liệu phụ trợ cho public calculator</h3>
                <p>Thành phố/quận huyện và nhãn vùng đều lưu theo bảng giá đang áp dụng. Sau mỗi lần lưu, hệ thống export lại <code>pricing-data.json</code> để public nhận dữ liệu mới.</p>
            </div>
            <div class="pricing-support-metrics">
                <span><strong><?php echo $cityCount; ?></strong>Thành phố</span>
                <span><strong><?php echo $districtCount; ?></strong>Quận huyện</span>
                <span><strong><?php echo $regionCount; ?></strong>Vùng</span>
            </div>
        </section>

        <div id="pricing-support-message" class="pricing-support-message" hidden></div>

        <?php if ($activeVersionId <= 0): ?>
            <div class="pricing-support-message is-warning">
                Chưa có bảng giá đang áp dụng. Hãy lưu bảng giá chính một lần trước khi quản lý dữ liệu phụ trợ.
            </div>
        <?php endif; ?>

        <section class="pricing-support-layout">
            <div class="pricing-support-stack">
                <article class="admin-card pricing-support-card">
                    <div class="admin-card-header">
                        <div>
                            <h3>Thành phố</h3>
                            <p>Quản lý danh sách tỉnh/thành dùng cho điểm gửi, điểm nhận và export JSON public.</p>
                        </div>
                    </div>

                    <form id="support-city-form" class="pricing-support-form">
                        <input type="hidden" name="id">
                        <div class="form-group">
                            <label>Mã thành phố</label>
                            <input class="admin-input" name="city_key" placeholder="tu-dong-tao" readonly>
                        </div>
                        <div class="form-group">
                            <label>Tên thành phố</label>
                            <input class="admin-input" name="city_name" required placeholder="TP. Hồ Chí Minh">
                        </div>
                        <div class="form-group">
                            <label>Thứ tự</label>
                            <input class="admin-input" name="sort_order" type="number" min="0" step="1" value="10">
                        </div>
                        <div class="pricing-support-actions">
                            <button type="button" class="btn-secondary" data-reset-form="support-city-form">Làm mới</button>
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu thành phố</button>
                        </div>
                    </form>

                    <div class="table-responsive">
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Tên</th>
                                    <th>Thứ tự</th>
                                    <th style="text-align:right;">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="support-city-rows">
                                <tr><td colspan="4" class="pricing-support-empty">Đang tải thành phố...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </article>

                <article class="admin-card pricing-support-card">
                    <div class="admin-card-header">
                        <div>
                            <h3>Quận huyện</h3>
                            <p>Quận/huyện được gắn theo mã thành phố. Dữ liệu này được export thành <code>BAOGIACHITIET.thanhpho</code>.</p>
                        </div>
                    </div>

                    <form id="support-district-form" class="pricing-support-form">
                        <input type="hidden" name="id">
                        <div class="form-group">
                            <label>Thành phố</label>
                            <select class="admin-select" name="city_key" required></select>
                        </div>
                        <div class="form-group">
                            <label>Tên quận/huyện</label>
                            <input class="admin-input" name="district_name" required placeholder="Quận 1">
                        </div>
                        <div class="form-group">
                            <label>Thứ tự</label>
                            <input class="admin-input" name="sort_order" type="number" min="0" step="1" value="10">
                        </div>
                        <div class="pricing-support-actions">
                            <button type="button" class="btn-secondary" data-reset-form="support-district-form">Làm mới</button>
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu quận huyện</button>
                        </div>
                    </form>

                    <div class="pricing-support-filter">
                        <select id="support-district-filter" class="admin-select">
                            <option value="">Tất cả thành phố</option>
                        </select>
                    </div>

                    <div class="table-responsive">
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Thành phố</th>
                                    <th>Quận/huyện</th>
                                    <th>Thứ tự</th>
                                    <th style="text-align:right;">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="support-district-rows">
                                <tr><td colspan="4" class="pricing-support-empty">Đang tải quận huyện...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </article>
            </div>

            <aside class="pricing-support-stack">
                <article class="admin-card pricing-support-card">
                    <div class="admin-card-header">
                        <div>
                            <h3>Vùng giao hàng</h3>
                            <p>Chỉ sửa nhãn vùng cố định để không làm lệch công thức tính giá.</p>
                        </div>
                    </div>

                    <form id="support-region-form" class="pricing-support-form">
                        <input type="hidden" name="id">
                        <div class="form-group">
                            <label>Mã vùng</label>
                            <input class="admin-input" name="region_key" readonly>
                        </div>
                        <div class="form-group">
                            <label>Nhãn hiển thị</label>
                            <input class="admin-input" name="region_label" required>
                        </div>
                        <div class="form-group">
                            <label>Thứ tự</label>
                            <input class="admin-input" name="sort_order" type="number" min="0" step="1">
                        </div>
                        <div class="pricing-support-actions">
                            <button type="button" class="btn-secondary" data-reset-form="support-region-form">Làm mới</button>
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu vùng</button>
                        </div>
                    </form>

                    <div class="table-responsive">
                        <table class="order-table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Nhãn</th>
                                    <th style="text-align:right;">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody id="support-region-rows">
                                <tr><td colspan="3" class="pricing-support-empty">Đang tải vùng...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </article>

            </aside>
        </section>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script>
        window.GHNAdminPricingSupport = {
            exportUrl: "../api/pricing_export.php",
            activeVersionId: <?php echo json_encode($activeVersionId, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            storageSource: <?php echo json_encode((string) ($pricingLoad['source'] ?? ''), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            username: <?php echo json_encode((string) ($_SESSION['username'] ?? $_SESSION['user_id'] ?? 'admin'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
        };
    </script>
    <script src="assets/js/admin-pricing-krud-client.js?v=<?php echo time(); ?>"></script>
    <script src="assets/js/pricing-support.js?v=<?php echo time(); ?>"></script>
</body>

</html>
