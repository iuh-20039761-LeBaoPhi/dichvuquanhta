<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../lib/pricing_config_service.php';
moving_admin_require_login();

$jsonPath = __DIR__ . '/../../public/assets/js/data/bang-gia-minh-bach.json';
$rawJson = @file_get_contents($jsonPath);
$services = [];
if ($rawJson !== false) {
    $services = moving_pricing_service_extract_services(json_decode($rawJson, true));
}

$flash = moving_admin_get_flash();
$pageTitle = 'Quản lý Bảng giá | Admin chuyển dọn';

require_once __DIR__ . '/../includes/header_admin.php';
?>
<section class="hero-card">
    <div>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span class="badge" id="moving-pricing-last-updated-badge"
                style="background: var(--primary-soft); color: var(--primary-deep); font-size: 10px; display: none;">Cập
                nhật lần cuối: <span id="moving-pricing-last-updated-time">--:--</span></span>
            <div id="moving-pricing-source" class="muted" style="font-size: 12px; font-weight: 500;">Đang đồng bộ dữ
                liệu...</div>
        </div>
        <h1>Quản lý Bảng giá & Phụ phí</h1>
        <p>Hệ thống tự động đồng bộ giữa Cơ sở dữ liệu (KRUD) và file hiển thị (JSON). Mọi thay đổi sẽ được cập nhật
            ngay lập tức.</p>
        <div style="margin-top: 16px; display: flex; gap: 12px;">
            <a href="index.php" class="btn btn-outline" style="font-size: 13px; padding: 6px 12px;">
                <i class="fas fa-arrow-left"></i> Quay lại Dashboard
            </a>
            <a href="../../index.html" target="_blank" class="btn btn-outline"
                style="font-size: 13px; padding: 6px 12px;">
                <i class="fas fa-external-link-alt"></i> Xem Website
            </a>
        </div>
    </div>
</section>

<div id="moving-pricing-message"
    class="flash <?php echo is_array($flash) && ($flash['type'] ?? '') === 'error' ? 'flash-error' : 'flash-success'; ?>"
    style="<?php echo is_array($flash) ? '' : 'display:none;'; ?>">
    <?php echo is_array($flash) ? moving_admin_escape($flash['message'] ?? '') : ''; ?></div>


<section class="pricing-tabs-nav" id="moving-pricing-tabs">
    <?php foreach ($services as $idx => $svc): ?>
        <button type="button" class="pricing-tab-btn" data-tab-id="<?php echo moving_admin_escape($svc['id']); ?>"
            onclick="window.__ADMIN_PRICING_TABS__.setActive('<?php echo moving_admin_escape($svc['id']); ?>')">
            <i class="fas fa-truck-moving"></i>
            <?php echo moving_admin_escape($svc['ten_dich_vu'] ?? ''); ?>
            <span class="badge"><?php echo count($svc['bang_gia']['loai_xe'] ?? []); ?> xe</span>
        </button>
    <?php endforeach; ?>
</section>

<div id="moving-pricing-container">
    <?php if (empty($services)): ?>
        <div class="empty-state panel">Không có dữ liệu bảng giá hoặc đường dẫn file sai.</div>
    <?php endif; ?>

    <?php foreach ($services as $idx => $svc):
        $svcId = $svc['id'] ?? ''; ?>
        <section class="pricing-card" data-pricing-service-card="<?php echo moving_admin_escape($svcId); ?>">
            <div class="pricing-card__head">
                <div>
                    <h2 style="color: var(--primary-deep);"><?php echo moving_admin_escape($svc['ten_dich_vu'] ?? ''); ?>
                    </h2>
                    <p class="muted"><?php echo moving_admin_escape($svc['thong_tin_minh_bach']['mo_ta_ngan'] ?? ''); ?></p>
                </div>
                <div class="badge" style="background: var(--primary-soft); color: var(--primary-deep);">Dịch vụ ID:
                    <?php echo moving_admin_escape($svcId); ?></div>
            </div>

            <div class="section-title-bar"
                style="display: flex; justify-content: space-between; align-items: center; margin: 0 0 16px;">
                <h3 style="font-weight: 800; color: var(--slate); font-size: 18px; margin: 0;">1. Bảng giá xe</h3>
                <button type="button" class="pricing-action-btn"
                    onclick="window.__ADMIN_PRICING_MODAL__.openAddVehicle('<?php echo $svcId; ?>')">
                    <i class="fas fa-plus"></i> Thêm loại xe
                </button>
            </div>

            <div class="pricing-table-wrap" style="margin-bottom: 32px;">
                <table class="pricing-table">
                    <thead>
                        <tr>
                            <th style="width: 60px; text-align: center;">Thứ tự</th>
                            <th>Loại xe</th>
                            <th>Mở cửa (5km)</th>
                            <th>6-15km</th>
                            <th>16-30km</th>
                            <th>31km+</th>
                            <th>Xóa</th>
                        </tr>
                    </thead>
                    <tbody data-tbody-vehicles="<?php echo moving_admin_escape($svcId); ?>">
                        <!-- JS renders rows here -->
                    </tbody>
                </table>
            </div>

            <div class="surcharge-grid">
                <!-- Group 2 -->
                <div class="surcharge-section">
                    <div class="surcharge-section__head">
                        <div>
                            <h4>2. Hạng mục chính</h4>
                            <p class="muted">Checkbox không cộng vào giá.</p>
                        </div>
                        <button type="button" class="btn-delete-small"
                            style="background: var(--primary-soft); color: var(--primary);"
                            onclick="window.__ADMIN_PRICING_MODAL__.openAddItem('<?php echo $svcId; ?>', 'checkbox_main')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <table class="compact-table">
                        <tbody data-tbody-items="<?php echo moving_admin_escape($svcId); ?>::checkbox_main"></tbody>
                    </table>
                </div>

                <!-- Group 3 -->
                <div class="surcharge-section">
                    <div class="surcharge-section__head">
                        <div>
                            <h4>3. Phụ phí khảo sát</h4>
                            <p class="muted">Khảo sát trước triển khai.</p>
                        </div>
                        <button type="button" class="btn-delete-small"
                            style="background: var(--primary-soft); color: var(--primary);"
                            onclick="window.__ADMIN_PRICING_MODAL__.openAddItem('<?php echo $svcId; ?>', 'checkbox_surcharge')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <table class="compact-table">
                        <tbody data-tbody-items="<?php echo moving_admin_escape($svcId); ?>::checkbox_surcharge"></tbody>
                    </table>
                </div>

                <!-- Group 4 -->
                <div class="surcharge-section">
                    <div class="surcharge-section__head">
                        <div>
                            <h4>4. Phụ phí khung giờ</h4>
                            <p class="muted">Cộng thêm theo thời gian.</p>
                        </div>
                        <button type="button" class="btn-delete-small"
                            style="background: var(--primary-soft); color: var(--primary);"
                            onclick="window.__ADMIN_PRICING_MODAL__.openAddItem('<?php echo $svcId; ?>', 'khung_gio')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <table class="compact-table">
                        <tbody data-tbody-items="<?php echo moving_admin_escape($svcId); ?>::khung_gio"></tbody>
                    </table>
                </div>

                <!-- Group 5 -->
                <div class="surcharge-section">
                    <div class="surcharge-section__head">
                        <div>
                            <h4>5. Phụ phí thời tiết</h4>
                            <p class="muted">Điều kiện thời tiết đặc biệt.</p>
                        </div>
                        <button type="button" class="btn-delete-small"
                            style="background: var(--primary-soft); color: var(--primary);"
                            onclick="window.__ADMIN_PRICING_MODAL__.openAddItem('<?php echo $svcId; ?>', 'thoi_tiet')">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                    <table class="compact-table">
                        <tbody data-tbody-items="<?php echo moving_admin_escape($svcId); ?>::thoi_tiet"></tbody>
                    </table>
                </div>
            </div>
        </section>
    <?php endforeach; ?>
</div>

<!-- Modal Templates -->
<div class="modal-overlay" id="modal-moving-pricing-overlay">
    <!-- Vehicle Modal -->
    <div class="modal" id="modal-vehicle-editor" style="display: none;">
        <div class="modal-header">
            <h2 id="vehicle-editor-title">Chỉnh sửa loại xe</h2>
            <button type="button" class="btn-delete-small" onclick="window.__ADMIN_PRICING_MODAL__.close()"><i
                    class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <form id="form-vehicle-editor" class="pricing-modal-form">
                <input type="hidden" name="id_dich_vu">
                <input type="hidden" name="id"> <!-- Database ID -->

                <div class="pricing-modal-grid">
                    <div class="field">
                        <label class="label">Tên hiển thị</label>
                        <input class="input" type="text" name="ten_xe" required>
                    </div>
                    <div class="field">
                        <label class="label">Thứ tự hiển thị</label>
                        <input class="input" type="number" name="thu_tu" placeholder="Ví dụ: 1, 2, 3..." required>
                        <input type="hidden" name="slug_xe">
                    </div>
                </div>

                <div class="pricing-modal-grid">
                    <div class="field">
                        <label class="label">Giá mở cửa (5km)</label>
                        <input class="input" type="number" name="gia_mo_cua" required>
                    </div>
                    <div class="field">
                        <label class="label">Km 6-15</label>
                        <input class="input" type="number" name="don_gia_km_6_15" required>
                    </div>
                </div>

                <div class="pricing-modal-grid">
                    <div class="field">
                        <label class="label">Km 16-30</label>
                        <input class="input" type="number" name="don_gia_km_16_30" required>
                    </div>
                    <div class="field">
                        <label class="label">Km 31 trở lên</label>
                        <input class="input" type="number" name="don_gia_km_31_tro_len" required>
                    </div>
                </div>


            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="window.__ADMIN_PRICING_MODAL__.close()">Hủy</button>
            <button type="button" class="btn btn-primary" onclick="window.__ADMIN_PRICING_MODAL__.saveVehicle()">Lưu
                thay đổi</button>
        </div>
    </div>

    <!-- Item Modal (Checkbox/Khunggio/Thoitiet) -->
    <div class="modal" id="modal-item-editor" style="display: none;">
        <div class="modal-header">
            <h2 id="item-editor-title">Chỉnh sửa hạng mục</h2>
            <button type="button" class="btn-delete-small" onclick="window.__ADMIN_PRICING_MODAL__.close()"><i
                    class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
            <form id="form-item-editor" class="pricing-modal-form">
                <input type="hidden" name="id_dich_vu">
                <input type="hidden" name="id"> <!-- Database ID -->
                <input type="hidden" name="nhom">

                <p class="muted" id="item-editor-group-note" style="margin: 0;"></p>

                <div class="field">
                    <label class="label">Tên hiển thị</label>
                    <input class="input" type="text" name="ten_muc" required>
                </div>
                <div class="pricing-modal-grid">
                    <div class="field">
                        <label class="label">Thứ tự hiển thị</label>
                        <input class="input" type="number" name="thu_tu" placeholder="Ví dụ: 1, 2, 3..." required>
                        <input type="hidden" name="slug_muc">
                    </div>
                </div>
                <div class="field" id="item-editor-price-field">
                    <label class="label">Đơn giá (VNĐ)</label>
                    <input class="input" type="number" name="don_gia">
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-outline" onclick="window.__ADMIN_PRICING_MODAL__.close()">Hủy</button>
            <button type="button" class="btn btn-primary" onclick="window.__ADMIN_PRICING_MODAL__.saveItem()">Lưu thay
                đổi</button>
        </div>
    </div>
</div>


<script>
    window.__MOVING_PRICING_FALLBACK__ = <?php echo json_encode($services, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
    // Khởi tạo stub để tránh lỗi khi người dùng click quá nhanh trước khi script load xong
    window.__ADMIN_PRICING_TABS__ = { setActive: function () { }, init: function () { } };
    window.__ADMIN_PRICING_MODAL__ = { openAddVehicle: function () { }, openEditVehicle: function () { }, openAddItem: function () { }, openEditItem: function () { }, close: function () { }, deleteVehicle: function () { }, deleteItem: function () { }, saveVehicle: function () { }, saveItem: function () { } };
</script>
<script src="assets/js/admin-api.js"></script>
<script>
    (function () {
        // --- State ---
        let state = {
            vehicles: [],
            items: [],
            isBusy: false
        };

        const SVG_ICONS = {
            xe_may_cho_hang: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"></path><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path></svg>',
            ba_gac_may: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H6v7"></path><rect x="2" y="17" width="20" height="4" rx="2"></rect><circle cx="6" cy="14" r="3"></circle><circle cx="18" cy="14" r="3"></circle></svg>',
            xe_van_500kg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
            xe_van_1000kg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
            xe_tai_750kg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><path d="M16 8h4l3 3v5h-7V8z"></path><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
            xe_tai_1_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18h6a1 1 0 0 0 1-1V10l-3-3h-4v11z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg>',
            xe_tai_1_5_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18h6a1 1 0 0 0 1-1V10l-3-3h-4v11z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg>',
            xe_tai_2_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"></path><path d="M17 18h4a1 1 0 0 0 1-1V10l-3-3h-2"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg>',
            xe_tai_2_5_tan: '<i class="fa-solid fa-truck"></i>',
            xe_tai_3_5_tan: '<i class="fa-solid fa-truck"></i>',
            xe_tai_5_tan: '<i class="fa-solid fa-truck-moving"></i>',
            xe_tai_8_tan: '<i class="fa-solid fa-truck-moving"></i>',
            xe_tai_15_tan: '<i class="fa-solid fa-truck-moving"></i>',
            default: '<i class="fa-solid fa-truck"></i>'
        };

        const getVehicleIcon = (slug) => {
            if (!slug) return SVG_ICONS.default;
            const normalized = slug.trim().toLowerCase();
            return SVG_ICONS[normalized] || SVG_ICONS.default;
        };

        // --- Dom Refs ---
        const overlay = document.getElementById('modal-moving-pricing-overlay');
        const vehicleModal = document.getElementById('modal-vehicle-editor');
        const itemModal = document.getElementById('modal-item-editor');
        const sourceBox = document.getElementById('moving-pricing-source');
        const lastUpdatedBadge = document.getElementById('moving-pricing-last-updated-badge');
        const lastUpdatedTime = document.getElementById('moving-pricing-last-updated-time');
        const fallbackServices = Array.isArray(window.__MOVING_PRICING_FALLBACK__)
            ? window.__MOVING_PRICING_FALLBACK__
            : [];
        const ITEM_VIEW_CONFIG = {
            checkbox_main: {
                actualGroup: 'checkbox',
                title: 'Hạng mục chính',
                note: 'Các checkbox này chỉ để nhà cung cấp biết việc cần làm, không cộng vào giá.',
                showPrice: false
            },
            checkbox_surcharge: {
                actualGroup: 'checkbox',
                title: 'Phụ phí khảo sát',
                note: 'Giữ cho các checkbox phụ phí có giá, hiện tại chủ yếu dùng cho khảo sát trước.',
                showPrice: true,
                defaultSlug: 'khao_sat_truoc',
                defaultName: 'Khảo sát trước khi triển khai'
            },
            khung_gio: {
                actualGroup: 'khung_gio',
                title: 'Phụ phí khung giờ',
                note: 'Các khoản cộng thêm theo thời gian thực hiện.',
                showPrice: true
            },
            thoi_tiet: {
                actualGroup: 'thoi_tiet',
                title: 'Phụ phí thời tiết',
                note: 'Các khoản cộng thêm theo điều kiện thời tiết.',
                showPrice: true
            }
        };

        // --- Logic ---
        function formatMoney(val) {
            return new Intl.NumberFormat('vi-VN').format(val || 0) + 'đ';
        }

        function toNumber(val) {
            const num = Number(val);
            return Number.isFinite(num) ? num : 0;
        }

        function getBandPrice(bands, fromKm) {
            if (!Array.isArray(bands)) return 0;
            const band = bands.find((entry) => Number(entry?.tu_km) === Number(fromKm));
            return toNumber(band?.don_gia);
        }

        function getItemViewKey(row) {
            const groupKey = String(row?.nhom || '').trim();
            const slug = String(row?.slug_muc || '').trim();
            if (groupKey === 'checkbox') {
                return slug === 'khao_sat_truoc' ? 'checkbox_surcharge' : 'checkbox_main';
            }
            if (groupKey === 'khung_gio' || groupKey === 'thoi_tiet') {
                return groupKey;
            }
            return '';
        }

        function getItemViewConfig(viewKey) {
            return ITEM_VIEW_CONFIG[viewKey] || ITEM_VIEW_CONFIG.checkbox_main;
        }

        function getCanonicalItemName(row) {
            const groupKey = String(row?.nhom || '').trim();
            const slug = String(row?.slug_muc || '').trim();
            const fallbackName = String(row?.ten_muc || '').trim();

            if (groupKey === 'khung_gio') {
                if (slug === 'buoi_toi') return 'Buổi tối';
                if (slug === 'ban_dem') return 'Ca đêm';
            }

            return fallbackName;
        }

        function buildFallbackRows(services) {
            const vehicles = [];
            const items = [];

            (Array.isArray(services) ? services : []).forEach((service) => {
                const serviceId = String(service?.id || '').trim();
                if (!serviceId) return;

                (Array.isArray(service?.bang_gia?.loai_xe) ? service.bang_gia.loai_xe : []).forEach((vehicle) => {
                    const slug = String(vehicle?.slug || '').trim();
                    if (!slug) return;

                    vehicles.push({
                        id_dich_vu: serviceId,
                        slug_xe: slug,
                        ten_xe: String(vehicle?.ten || '').trim(),
                        gia_mo_cua: toNumber(vehicle?.gia_mo_cua),
                        don_gia_km_6_15: getBandPrice(vehicle?.bang_gia_km, 6),
                        don_gia_km_16_30: getBandPrice(vehicle?.bang_gia_km, 16),
                        don_gia_km_31_tro_len: getBandPrice(vehicle?.bang_gia_km, 31)
                    });
                });

                ['checkbox', 'khung_gio', 'thoi_tiet'].forEach((groupKey) => {
                    (Array.isArray(service?.bang_gia?.phu_phi?.[groupKey]) ? service.bang_gia.phu_phi[groupKey] : []).forEach((item) => {
                        const slug = String(item?.slug || '').trim();
                        if (!slug) return;

                        items.push({
                            id_dich_vu: serviceId,
                            nhom: groupKey,
                            slug_muc: slug,
                            ten_muc: getCanonicalItemName({
                                nhom: groupKey,
                                slug_muc: slug,
                                ten_muc: String(item?.ten || '').trim()
                            }),
                            don_gia: groupKey === 'checkbox' && slug !== 'khao_sat_truoc'
                                ? 0
                                : toNumber(item?.don_gia)
                        });
                    });
                });
            });

            return { vehicles, items };
        }

        function applyState(vehicles, items) {
            state.vehicles = Array.isArray(vehicles) ? vehicles : [];
            state.items = Array.isArray(items)
                ? items.map((item) => ({
                    ...item,
                    ten_muc: getCanonicalItemName(item)
                }))
                : [];
            renderAll();
        }

        async function seedKrudFromFallback(fallbackRows) {
            const vehicleRows = Array.isArray(fallbackRows?.vehicles) ? fallbackRows.vehicles : [];
            const itemRows = Array.isArray(fallbackRows?.items) ? fallbackRows.items : [];

            if (!vehicleRows.length && !itemRows.length) {
                return false;
            }

            await Promise.all([
                ...vehicleRows.map((row) => window.adminApi.saveMovingPricingVehicle(row)),
                ...itemRows.map((row) => window.adminApi.saveMovingPricingItem(row))
            ]);

            return true;
        }

        async function normalizeLegacyCheckboxPricing(itemRows) {
            const rows = Array.isArray(itemRows) ? itemRows : [];
            const legacyRows = rows.filter((row) => {
                const groupKey = String(row?.nhom || '').trim();
                const slug = String(row?.slug_muc || '').trim();
                return groupKey === 'checkbox' && slug !== 'khao_sat_truoc' && toNumber(row?.don_gia) !== 0;
            });

            if (!legacyRows.length) {
                return { rows, changed: false };
            }

            await Promise.all(legacyRows.map((row) => window.adminApi.saveMovingPricingItem({
                ...row,
                don_gia: 0
            }, { id: row.id })));

            return {
                changed: true,
                rows: rows.map((row) => {
                    const groupKey = String(row?.nhom || '').trim();
                    const slug = String(row?.slug_muc || '').trim();
                    if (groupKey === 'checkbox' && slug !== 'khao_sat_truoc') {
                        return { ...row, don_gia: 0 };
                    }
                    return row;
                })
            };
        }

        async function backfillMissingPricingRows(vehicleRows, itemRows, fallbackRows) {
            const currentVehicles = Array.isArray(vehicleRows) ? vehicleRows : [];
            const currentItems = Array.isArray(itemRows) ? itemRows : [];
            const fallbackVehicleRows = Array.isArray(fallbackRows?.vehicles) ? fallbackRows.vehicles : [];
            const fallbackItemRows = Array.isArray(fallbackRows?.items) ? fallbackRows.items : [];

            const vehicleKeySet = new Set(
                currentVehicles
                    .map((row) => window.adminApi.getMovingPricingVehicleKey(row))
                    .filter(Boolean)
            );
            const itemKeySet = new Set(
                currentItems
                    .map((row) => window.adminApi.getMovingPricingItemKey(row))
                    .filter(Boolean)
            );

            const missingVehicles = fallbackVehicleRows.filter((row) => {
                const key = window.adminApi.getMovingPricingVehicleKey(row);
                return key && !vehicleKeySet.has(key);
            });
            const missingItems = fallbackItemRows.filter((row) => {
                const key = window.adminApi.getMovingPricingItemKey(row);
                return key && !itemKeySet.has(key);
            });

            if (!missingVehicles.length && !missingItems.length) {
                return false;
            }

            await Promise.all([
                ...missingVehicles.map((row) => window.adminApi.saveMovingPricingVehicle(row)),
                ...missingItems.map((row) => window.adminApi.saveMovingPricingItem(row))
            ]);

            return true;
        }

        function configureItemEditor(viewKey, row = null) {
            const form = document.getElementById('form-item-editor');
            const title = document.getElementById('item-editor-title');
            const note = document.getElementById('item-editor-group-note');
            const priceField = document.getElementById('item-editor-price-field');
            const priceInput = form?.don_gia;
            const config = getItemViewConfig(viewKey);

            if (!form || !title || !note || !priceField || !priceInput) {
                return config;
            }

            form.dataset.itemView = viewKey;
            form.nhom.value = config.actualGroup;
            const itemName = row ? getCanonicalItemName(row) : '';
            title.textContent = row
                ? `Chỉnh sửa ${config.title.toLowerCase()}: ${itemName}`
                : `Thêm ${config.title.toLowerCase()}`;
            note.textContent = config.note || '';
            priceField.hidden = !config.showPrice;
            priceInput.required = config.showPrice;

            if (!config.showPrice) {
                priceInput.value = '0';
            } else if (!row && config.defaultSlug && !form.slug_muc.value) {
                form.slug_muc.value = config.defaultSlug;
                form.ten_muc.value = config.defaultName || '';
            }

            if (row) {
                form.id.value = row.id;
                form.thu_tu.value = row.thu_tu || 0;
                form.ten_muc.value = itemName;
                priceInput.value = config.showPrice ? toNumber(row.don_gia) : '0';
            }

            return config;
        }

        const modalManager = {
            open: (modalEl) => {
                overlay.style.display = 'flex';
                modalEl.style.display = 'block';
                document.body.classList.add('pricing-modal-open');
            },
            close: () => {
                overlay.style.display = 'none';
                vehicleModal.style.display = 'none';
                itemModal.style.display = 'none';
                document.body.classList.remove('pricing-modal-open');
            },
            openAddVehicle: (svcId) => {
                const form = document.getElementById('form-vehicle-editor');
                form.reset();
                form.id.value = '';
                form.id_dich_vu.value = svcId;
                document.getElementById('vehicle-editor-title').textContent = 'Thêm loại xe mới';
                modalManager.open(vehicleModal);
            },
            openEditVehicle: (id) => {
                const row = state.vehicles.find(v => v.id == id);
                if (!row) return;
                const form = document.getElementById('form-vehicle-editor');
                document.getElementById('vehicle-editor-title').textContent = 'Chỉnh sửa loại xe: ' + row.ten_xe;

                form.id.value = row.id;
                form.id_dich_vu.value = row.id_dich_vu;
                form.ten_xe.value = row.ten_xe;
                form.thu_tu.value = row.thu_tu || 0;
                form.slug_xe.value = row.slug_xe || '';
                form.gia_mo_cua.value = row.gia_mo_cua;
                form.don_gia_km_6_15.value = row.don_gia_km_6_15;
                form.don_gia_km_16_30.value = row.don_gia_km_16_30;
                form.don_gia_km_31_tro_len.value = row.don_gia_km_31_tro_len;

                modalManager.open(vehicleModal);
            },
            openAddItem: (svcId, viewKey) => {
                const form = document.getElementById('form-item-editor');
                form.reset();
                form.id.value = '';
                form.id_dich_vu.value = svcId;
                form.slug_muc.value = '';
                form.ten_muc.value = '';
                form.don_gia.value = '';
                form.thu_tu.value = '0';
                configureItemEditor(viewKey);
                modalManager.open(itemModal);
            },
            openEditItem: (id) => {
                const row = state.items.find(i => i.id == id);
                if (!row) return;
                const form = document.getElementById('form-item-editor');
                const viewKey = getItemViewKey(row);

                form.id.value = row.id;
                form.id_dich_vu.value = row.id_dich_vu;
                form.nhom.value = row.nhom;
                form.ten_muc.value = getCanonicalItemName(row);
                form.slug_muc.value = row.slug_muc;
                form.don_gia.value = row.don_gia;
                configureItemEditor(viewKey, row);

                modalManager.open(itemModal);
            },

            saveVehicle: async () => {
                if (state.isBusy) return;
                const form = document.getElementById('form-vehicle-editor');
                if (!form.reportValidity()) return;

                setBusy(true);
                const data = Object.fromEntries(new FormData(form));
                try {
                    const res = await window.adminApi.saveMovingPricingVehicle(data, { id: data.id });
                    if (res) {
                        const savedRow = await resolveSavedVehicleRow(data);
                        if (savedRow) {
                            applyState(
                                upsertCollectionRow(state.vehicles, savedRow, window.adminApi.getMovingPricingVehicleKey),
                                state.items
                            );
                        } else {
                            await refreshData({ allowBootstrap: false, exportAfterLoad: false });
                        }
                        modalManager.close();
                        await finalizePricingMutation('Đã lưu dữ liệu xe thành công.');
                    }
                } catch (e) {
                    alert('Lỗi: ' + e.message);
                } finally {
                    setBusy(false);
                }
            },

            saveItem: async () => {
                if (state.isBusy) return;
                const form = document.getElementById('form-item-editor');
                if (!form.reportValidity()) return;

                setBusy(true);
                const data = Object.fromEntries(new FormData(form));
                const viewKey = String(form.dataset.itemView || '').trim();
                const config = getItemViewConfig(viewKey);
                if (!config.showPrice) {
                    data.don_gia = 0;
                } else {
                    data.don_gia = toNumber(data.don_gia);
                }
                try {
                    const res = await window.adminApi.saveMovingPricingItem(data, { id: data.id });
                    if (res) {
                        const savedRow = await resolveSavedItemRow(data);
                        if (savedRow) {
                            applyState(
                                state.vehicles,
                                upsertCollectionRow(state.items, savedRow, window.adminApi.getMovingPricingItemKey)
                            );
                        } else {
                            await refreshData({ allowBootstrap: false, exportAfterLoad: false });
                        }
                        modalManager.close();
                        await finalizePricingMutation('Đã lưu hạng mục thành công.');
                    }
                } catch (e) {
                    alert('Lỗi: ' + e.message);
                } finally {
                    setBusy(false);
                }
            },

            deleteVehicle: async (id) => {
                if (!confirm('Bạn có chắc chắn muốn xóa loại xe này?')) return;
                setBusy(true);
                try {
                    await window.adminApi.deleteMovingPricingVehicle(id);
                    // Tối ưu: Cập nhật state cục bộ ngay lập tức
                    state.vehicles = state.vehicles.filter(v => String(v.id) !== String(id));
                    renderAll();
                    // Export JSON dựa trên state mới đã xóa
                    await finalizePricingMutation('Đã xóa loại xe.');
                } catch (e) {
                    alert('Lỗi: ' + e.message);
                } finally {
                    setBusy(false);
                }
            },

            deleteItem: async (id) => {
                if (!confirm('Bạn có chắc chắn muốn xóa hạng mục này?')) return;
                setBusy(true);
                try {
                    await window.adminApi.deleteMovingPricingItem(id);
                    // Tối ưu: Cập nhật state cục bộ ngay lập tức
                    state.items = state.items.filter(i => String(i.id) !== String(id));
                    renderAll();
                    // Export JSON dựa trên state mới đã xóa
                    await finalizePricingMutation('Đã xóa hạng mục.');
                } catch (e) {
                    alert('Lỗi: ' + e.message);
                } finally {
                    setBusy(false);
                }
            }
        };

        window.__ADMIN_PRICING_MODAL__ = modalManager;

        const tabManager = {
            setActive: (tabId) => {
                // Update Tab Buttons
                document.querySelectorAll('#moving-pricing-tabs .pricing-tab-btn').forEach(btn => {
                    btn.classList.toggle('is-active', btn.dataset.tabId === tabId);
                });
                // Update Cards
                document.querySelectorAll('#moving-pricing-container .pricing-card').forEach(card => {
                    card.classList.toggle('is-active', card.dataset.pricingServiceCard === tabId);
                });
                // Persist to session/local storage if needed
                localStorage.setItem('moving_pricing_active_tab', tabId);
            },
            init: () => {
                const savedTab = localStorage.getItem('moving_pricing_active_tab');
                const firstTab = document.querySelector('#moving-pricing-tabs .pricing-tab-btn')?.dataset.tabId;
                if (savedTab && document.querySelector(`[data-tab-id="${savedTab}"]`)) {
                    tabManager.setActive(savedTab);
                } else if (firstTab) {
                    tabManager.setActive(firstTab);
                }
            }
        };
        window.__ADMIN_PRICING_TABS__ = tabManager;

        const fallbackRows = buildFallbackRows(fallbackServices);

        function setSourceStatus(message) {
            if (sourceBox) {
                sourceBox.textContent = message;
            }
        }

        function updateLastUpdatedBadge(rawValue) {
            if (!lastUpdatedBadge || !lastUpdatedTime) {
                return;
            }

            const parsed = new Date(rawValue || '');
            if (!Number.isFinite(parsed.getTime())) {
                lastUpdatedBadge.style.display = 'none';
                lastUpdatedBadge.removeAttribute('title');
                lastUpdatedTime.textContent = '--:--';
                return;
            }

            lastUpdatedTime.textContent = parsed.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            lastUpdatedBadge.title = parsed.toLocaleString('vi-VN');
            lastUpdatedBadge.style.display = 'inline-flex';
        }

        function showMessage(msg, type = 'success', durationMs = 3000) {
            const msgBox = document.getElementById('moving-pricing-message');
            if (!msgBox) {
                return;
            }

            msgBox.textContent = msg;
            msgBox.className = `flash ${type === 'success' ? 'flash-success' : 'flash-error'}`;
            msgBox.style.display = 'block';
            window.clearTimeout(showMessage.hideTimer);
            showMessage.hideTimer = window.setTimeout(() => {
                msgBox.style.display = 'none';
            }, durationMs);
        }

        function buildVehicleDraft(row = {}) {
            return {
                id: String(row?.id || '').trim(),
                id_dich_vu: String(row?.id_dich_vu || '').trim(),
                slug_xe: String(row?.slug_xe || '').trim(),
                ten_xe: String(row?.ten_xe || '').trim(),
                gia_mo_cua: toNumber(row?.gia_mo_cua),
                don_gia_km_6_15: toNumber(row?.don_gia_km_6_15),
                don_gia_km_16_30: toNumber(row?.don_gia_km_16_30),
                don_gia_km_31_tro_len: toNumber(row?.don_gia_km_31_tro_len)
            };
        }

        function buildItemDraft(row = {}) {
            return {
                id: String(row?.id || '').trim(),
                id_dich_vu: String(row?.id_dich_vu || '').trim(),
                nhom: String(row?.nhom || '').trim(),
                slug_muc: String(row?.slug_muc || '').trim(),
                ten_muc: String(row?.ten_muc || '').trim(),
                don_gia: toNumber(row?.don_gia)
            };
        }

        function upsertCollectionRow(collection, nextRow, keyResolver) {
            const nextId = String(nextRow?.id || '').trim();
            const nextKey = typeof keyResolver === 'function' ? keyResolver(nextRow) : '';
            let hasMatch = false;

            const updatedRows = (Array.isArray(collection) ? collection : []).map((row) => {
                const currentId = String(row?.id || '').trim();
                const currentKey = typeof keyResolver === 'function' ? keyResolver(row) : '';
                if ((nextId && currentId === nextId) || (nextKey && currentKey === nextKey)) {
                    hasMatch = true;
                    return { ...row, ...nextRow };
                }
                return row;
            });

            if (!hasMatch) {
                updatedRows.push(nextRow);
            }

            return updatedRows;
        }

        async function resolveSavedVehicleRow(rawRow) {
            const draft = buildVehicleDraft(rawRow);
            const nowIso = new Date().toISOString();
            if (draft.id) {
                const currentRow = state.vehicles.find((row) => String(row?.id || '') === draft.id);
                return {
                    ...(currentRow || {}),
                    ...draft,
                    updated_at: nowIso
                };
            }

            const targetKey = window.adminApi.getMovingPricingVehicleKey(draft);
            const rows = await window.adminApi.listMovingPricingVehicles(draft.id_dich_vu);
            return rows.find((row) => window.adminApi.getMovingPricingVehicleKey(row) === targetKey) || null;
        }

        async function resolveSavedItemRow(rawRow) {
            const draft = buildItemDraft(rawRow);
            const nowIso = new Date().toISOString();
            if (draft.id) {
                const currentRow = state.items.find((row) => String(row?.id || '') === draft.id);
                return {
                    ...(currentRow || {}),
                    ...draft,
                    updated_at: nowIso
                };
            }

            const targetKey = window.adminApi.getMovingPricingItemKey(draft);
            const rows = await window.adminApi.listMovingPricingItems(draft.id_dich_vu);
            return rows.find((row) => window.adminApi.getMovingPricingItemKey(row) === targetKey) || null;
        }

        async function finalizePricingMutation(successMessage) {
            try {
                await triggerExport();
                setSourceStatus('Dữ liệu đang đồng bộ trực tiếp với KRUD và JSON public đã được cập nhật.');
                showMessage(successMessage);
            } catch (error) {
                console.error('Export error', error);
                setSourceStatus('Đã lưu vào KRUD nhưng export JSON public thất bại: ' + error.message);
                showMessage(`${successMessage} Tuy nhiên export JSON public thất bại: ${error.message}`, 'error', 9000);
            }
        }

        async function refreshData(options = {}) {
            const allowBootstrap = options.allowBootstrap !== false;
            const exportAfterLoad = options.exportAfterLoad === true;
            let shouldExportAfterCleanup = false;
            let shouldReloadAfterBackfill = false;

            setSourceStatus('Đang đồng bộ dữ liệu...');

            try {
                await window.adminApi.ensureMovingPricingTables();

                let [vehicles, items] = await Promise.all([
                    window.adminApi.listMovingPricingVehicles(),
                    window.adminApi.listMovingPricingItems()
                ]);

                {
                    const normalized = await normalizeLegacyCheckboxPricing(items);
                    items = normalized.rows;
                    shouldExportAfterCleanup = shouldExportAfterCleanup || normalized.changed;
                }

                let hasKrudData = vehicles.length > 0 || items.length > 0;
                if (allowBootstrap && !hasKrudData && (fallbackRows.vehicles.length || fallbackRows.items.length)) {
                    if (sourceBox) {
                        sourceBox.textContent = 'KRUD đang trống, đang nạp dữ liệu từ JSON fallback...';
                    }
                    await seedKrudFromFallback(fallbackRows);
                    [vehicles, items] = await Promise.all([
                        window.adminApi.listMovingPricingVehicles(),
                        window.adminApi.listMovingPricingItems()
                    ]);
                    const normalized = await normalizeLegacyCheckboxPricing(items);
                    items = normalized.rows;
                    shouldExportAfterCleanup = true;
                    hasKrudData = true;
                }

                const hasData = vehicles.length > 0 || items.length > 0;
                if (hasData) {
                    applyState(vehicles, items);

                    if (exportAfterLoad || shouldExportAfterCleanup) {
                        await triggerExport();
                    }

                    setSourceStatus(
                        shouldReloadAfterBackfill
                            ? 'Đã bổ sung các dòng còn thiếu từ JSON fallback vào KRUD.'
                            : hasKrudData
                                ? 'Dữ liệu đang đồng bộ trực tiếp với KRUD.'
                                : 'Đã nạp dữ liệu JSON vào KRUD để bắt đầu quản trị.'
                    );
                    return;
                }

                applyState(fallbackRows.vehicles, fallbackRows.items);
                setSourceStatus(
                    fallbackRows.vehicles.length || fallbackRows.items.length
                        ? 'KRUD chưa có dữ liệu, đang hiển thị tạm từ JSON fallback.'
                        : 'Không tìm thấy dữ liệu bảng giá.'
                );
            } catch (e) {
                console.error('Refresh error', e);
                applyState(fallbackRows.vehicles, fallbackRows.items);
                setSourceStatus('Lỗi đồng bộ: ' + e.message);
            }
        }

        async function triggerExport() {
            const response = await fetch('../api/pricing_export.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vehicleRows: state.vehicles, itemRows: state.items })
            });
            const raw = await response.text();
            let payload = null;

            try {
                payload = raw ? JSON.parse(raw) : null;
            } catch (error) {
                payload = null;
            }

            if (!response.ok) {
                throw new Error(
                    payload?.message ||
                    `Không export được bang-gia-minh-bach.json (HTTP ${response.status}).`
                );
            }

            if (!payload || typeof payload !== 'object') {
                throw new Error('API export trả về dữ liệu không hợp lệ.');
            }

            if (payload.success === false) {
                throw new Error(payload.message || 'Không export được bang-gia-minh-bach.json.');
            }

            updateLastUpdatedBadge(payload.updated_at || '');
            return payload;
        }

        function setBusy(val) {
            state.isBusy = val;
            document.body.style.cursor = val ? 'wait' : '';
            document.querySelectorAll('button').forEach(btn => btn.disabled = val);
            if (val) {
                setSourceStatus('Đang xử lý...');
            }
        }

        function renderAll() {
            document.querySelectorAll('[data-tbody-vehicles]').forEach(tbody => {
                const svcId = tbody.dataset.tbodyVehicles;
                const rows = state.vehicles
                    .filter(v => v.id_dich_vu == svcId)
                    .sort((a, b) => (Number(a.thu_tu) || 0) - (Number(b.thu_tu) || 0));
                tbody.innerHTML = rows.map(v => `
                <tr>
                    <td style="text-align: center; font-weight: 800; color: var(--primary-deep);">
                        ${v.thu_tu || 0}
                    </td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="vehicle-icon-circle" style="width: 32px; height: 32px; flex-shrink: 0;">
                                ${getVehicleIcon(v.slug_xe)}
                            </div>
                             <div>
                                <div style="font-weight: 700; color: var(--slate);">${v.ten_xe}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="pricing-value">${formatMoney(v.gia_mo_cua)}</span></td>
                    <td><span class="pricing-value">${formatMoney(v.don_gia_km_6_15)}</span></td>
                    <td><span class="pricing-value">${formatMoney(v.don_gia_km_16_30)}</span></td>
                    <td><span class="pricing-value">${formatMoney(v.don_gia_km_31_tro_len)}</span></td>
                    <td style="text-align: center;">
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            <button type="button" class="btn-edit-small" onclick="window.__ADMIN_PRICING_MODAL__.openEditVehicle('${v.id}')"><i class="fas fa-edit"></i></button>
                            <button type="button" class="btn-delete-small" onclick="window.__ADMIN_PRICING_MODAL__.deleteVehicle('${v.id}')" style="color: var(--danger);"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('') || '<tr><td colspan="7" class="muted" style="text-align: center; padding: 24px;">Chưa có loại xe nào.</td></tr>';
            });

            document.querySelectorAll('[data-tbody-items]').forEach(tbody => {
                const [svcId, viewKey] = String(tbody.dataset.tbodyItems || '').split('::');
                const config = getItemViewConfig(viewKey);
                const rows = state.items
                    .filter((item) => (
                        item.id_dich_vu == svcId && getItemViewKey(item) === viewKey
                    ))
                    .sort((a, b) => (Number(a.thu_tu) || 0) - (Number(b.thu_tu) || 0));

                if (!rows.length) {
                    tbody.innerHTML = `<tr><td colspan="${config.showPrice ? 3 : 2}" class="muted" style="text-align: center; padding: 12px;">Chưa có.</td></tr>`;
                    return;
                }

                tbody.innerHTML = rows.map(i => {
                    const actions = `
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="btn-delete-small" onclick="window.__ADMIN_PRICING_MODAL__.openEditItem('${i.id}')"><i class="fas fa-edit"></i></button>
                        <button type="button" class="btn-delete-small" onclick="window.__ADMIN_PRICING_MODAL__.deleteItem('${i.id}')" style="color: var(--danger);"><i class="fas fa-trash"></i></button>
                    </div>
                `;

                    if (!config.showPrice) {
                        return `
                        <tr>
                            <td>
                                <div style="font-weight: 600;">${i.ten_muc}</div>
                            </td>
                            <td>${actions}</td>
                        </tr>
                    `;
                    }

                    return `
                    <tr>
                        <td>
                            <div style="font-weight: 600;">${i.ten_muc}</div>
                        </td>
                        <td><span class="pricing-value">${formatMoney(i.don_gia)}</span></td>
                        <td>${actions}</td>
                    </tr>
                `;
                }).join('');
            });
        }

        // --- Init ---
        document.addEventListener('DOMContentLoaded', () => {
            setSourceStatus('Đang kiểm tra dữ liệu...');
            refreshData({ exportAfterLoad: true }).then(() => {
                if (window.__ADMIN_PRICING_TABS__) {
                    window.__ADMIN_PRICING_TABS__.init();
                }
            });
        });

    })();
</script>


<?php require_once __DIR__ . '/../includes/footer_admin.php'; ?>