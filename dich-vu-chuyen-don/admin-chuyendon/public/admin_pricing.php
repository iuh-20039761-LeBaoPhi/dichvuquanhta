<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

$jsonPath = __DIR__ . '/../../public/assets/js/data/bang-gia-minh-bach.json';
$rawJson = @file_get_contents($jsonPath);
$services = [];
if ($rawJson !== false) {
    $services = json_decode($rawJson, true);
    if (!is_array($services)) {
        $services = [];
    }
}

$flash = moving_admin_get_flash();
$pageTitle = 'Quản lý Bảng giá | Admin chuyển dọn';

require_once __DIR__ . '/../includes/header_admin.php';
?>
<section class="hero-card">
    <div>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <span class="badge" id="moving-pricing-last-updated-badge" style="background: var(--primary-soft); color: var(--primary-deep); font-size: 10px; display: none;">Cập nhật lần cuối: <span id="moving-pricing-last-updated-time">--:--</span></span>
        </div>
        <h1>Quản lý Bảng giá & Phụ phí</h1>
        <p>Trang này lưu bảng giá lên KRUD, sau đó export lại <code>bang-gia-minh-bach.json</code> để frontend tiếp tục dùng cho hiển thị.</p>
    </div>
</section>

<div
    id="moving-pricing-message"
    class="flash <?php echo is_array($flash) && ($flash['type'] ?? '') === 'error' ? 'flash-error' : 'flash-success'; ?>"
    style="<?php echo is_array($flash) ? '' : 'display:none;'; ?>"
><?php echo is_array($flash) ? moving_admin_escape($flash['message'] ?? '') : ''; ?></div>

<section class="panel" style="margin-bottom: 24px;">
    <div class="section-header">
        <div>
            <h2>Trạng thái dữ liệu</h2>
            <p class="muted" id="moving-pricing-source">Đang dùng dữ liệu từ file JSON fallback cho lần tải đầu tiên.</p>
        </div>
    </div>
</section>

<form id="moving-pricing-form" action="javascript:void(0);">
    <div class="form-actions" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
        <button type="submit" class="button button-primary" data-save-moving-pricing>Lưu toàn bộ bảng giá</button>
    </div>

    <?php if (empty($services)): ?>
        <div class="empty-state panel">Không có dữ liệu bảng giá hoặc đường dẫn file sai.</div>
    <?php endif; ?>

    <?php foreach ($services as $svc): $svcId = $svc['id'] ?? ''; ?>
        <section class="panel" style="margin-bottom: 32px;" data-pricing-service-section="<?php echo moving_admin_escape($svcId); ?>">
            <div class="section-header">
                <div>
                    <h2><?php echo moving_admin_escape($svc['ten_dich_vu'] ?? ''); ?></h2>
                    <p class="muted"><?php echo moving_admin_escape($svc['thong_tin_minh_bach']['mo_ta_ngan'] ?? ''); ?></p>
                </div>
                <button type="button" class="button btn-outline" data-save-section="<?php echo moving_admin_escape($svcId); ?>" style="gap: 8px;">
                    <i class="fas fa-save"></i> <span>Lưu dịch vụ này</span>
                </button>
            </div>

            <?php if (isset($svc['bang_gia']['loai_xe']) && is_array($svc['bang_gia']['loai_xe'])): ?>
                <h3 style="margin-top: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">1. Bảng xe</h3>
                <p class="muted" style="margin-top: 12px;">Giá mở cửa đang cố định cho 5km đầu. Admin chỉ chỉnh các mức giá cần thiết để export JSON và nuôi form hiện tại.</p>
                <div style="overflow-x: auto; margin-top: 16px;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 12px; font-weight: 600; width: 60px;">#</th>
                                <th style="padding: 12px; font-weight: 600;">Loại xe</th>
                                <th style="padding: 12px; font-weight: 600;">Giá mở cửa 5km</th>
                                <th style="padding: 12px; font-weight: 600;">Km 6-15</th>
                                <th style="padding: 12px; font-weight: 600;">Km 16-30</th>
                                <th style="padding: 12px; font-weight: 600;">Km 31+</th>
                                <th style="padding: 12px; font-weight: 600;">Giá/km form</th>
                                <th style="padding: 12px; font-weight: 600;">Giá đường dài form</th>
                                <th style="padding: 12px; font-weight: 600;">Phí tối thiểu form</th>
                                <th style="padding: 12px; font-weight: 600; text-align: center; width: 60px;">Xóa</th>
                            </tr>
                        </thead>
                        <tbody data-vehicle-list="<?php echo moving_admin_escape($svcId); ?>">
                            <?php foreach ($svc['bang_gia']['loai_xe'] as $veh): $vSlug = $veh['slug'] ?? ''; $bandMap = []; foreach (($veh['bang_gia_km'] ?? []) as $band) { $bandMap[(string)($band['tu_km'] ?? '')] = $band; } ?>
                                <tr style="border-bottom: 1px dashed #e2e8f0;">
                                    <td style="padding: 12px; text-align: center;">
                                        <div class="vehicle-icon-circle" data-vehicle-slug="<?php echo $vSlug; ?>">
                                            <i class="icon-truck"></i>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <input class="input" style="width: 100%; min-width: 150px; font-weight: 700;" type="text" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][ten]" value="<?php echo moving_admin_escape($veh['ten'] ?? ''); ?>" required>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][gia_mo_cua]" value="<?php echo moving_admin_escape((string)($veh['gia_mo_cua'] ?? 0)); ?>" required>
                                            <span class="muted">đ</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][bang_gia_km][6][don_gia]" value="<?php echo moving_admin_escape((string)($bandMap['6']['don_gia'] ?? 0)); ?>" required>
                                            <span class="muted">đ</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][bang_gia_km][16][don_gia]" value="<?php echo moving_admin_escape((string)($bandMap['16']['don_gia'] ?? 0)); ?>" required>
                                            <span class="muted">đ</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][bang_gia_km][31][don_gia]" value="<?php echo moving_admin_escape((string)($bandMap['31']['don_gia'] ?? 0)); ?>" required>
                                            <span class="muted">đ</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <input class="input" style="width: 120px;" type="number" step="100" min="0" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][gia_moi_km]" value="<?php echo moving_admin_escape((string)($veh['gia_moi_km'] ?? 0)); ?>" required>
                                            <span class="muted">đ</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <input class="input" style="width: 120px;" type="number" step="100" min="0" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][gia_moi_km_duong_dai]" value="<?php echo moving_admin_escape((string)($veh['gia_moi_km_duong_dai'] ?? 0)); ?>" required>
                                            <span class="muted">đ</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px;">
                                        <div style="display: flex; align-items: center; gap: 4px;">
                                            <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][phi_toi_thieu]" value="<?php echo moving_admin_escape((string)($veh['phi_toi_thieu'] ?? 0)); ?>" required>
                                            <span class="muted">đ</span>
                                        </div>
                                    </td>
                                    <td style="padding: 12px; text-align: center;">
                                        <button type="button" class="btn-delete" onclick="this.closest('tr').remove()" title="Xóa loại xe này"><i class="fas fa-trash"></i></button>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="10" style="padding: 16px;">
                                    <button type="button" class="button btn-add-inline" onclick="window.__ADMIN_PRICING__.addNewVehicle('<?php echo $svcId; ?>')" style="width: 100%;">
                                        <i class="fas fa-plus"></i> Thêm loại xe mới cho <?php echo moving_admin_escape($svc['ten_dich_vu'] ?? ''); ?>
                                    </button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            <?php endif; ?>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; margin-top: 32px;">
                <?php if (isset($svc['bang_gia']['phu_phi']['checkbox']) && is_array($svc['bang_gia']['phu_phi']['checkbox'])): ?>
                    <div>
                        <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">2. Hạng mục dịch vụ</h3>
                        <p class="muted" style="margin-top: 12px;">Tên hạng mục ở đây sẽ được đồng bộ sang card và phần hiển thị tương ứng trong JSON export.</p>
                        <ul style="list-style: none; padding: 0; margin-top: 16px;">
                            <?php foreach ($svc['bang_gia']['phu_phi']['checkbox'] as $item): $cSlug = $item['slug'] ?? ''; ?>
                                <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <input class="input" style="flex: 1;" type="text" name="services[<?php echo $svcId; ?>][checkbox][<?php echo $cSlug; ?>][ten]" value="<?php echo moving_admin_escape($item['ten'] ?? ''); ?>" required>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][checkbox][<?php echo $cSlug; ?>][don_gia]" value="<?php echo moving_admin_escape((string)($item['don_gia'] ?? 0)); ?>" required>
                                        <span class="muted">đ</span>
                                    </div>
                                    <button type="button" class="btn-delete-small" onclick="this.closest('li').remove()"><i class="fas fa-times"></i></button>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <button type="button" class="button btn-add-inline" onclick="window.__ADMIN_PRICING__.addNewItem('<?php echo $svcId; ?>', 'checkbox')" style="margin-top: 8px; width: 100%;">
                            <i class="fas fa-plus"></i> Thêm hạng mục
                        </button>
                    </div>
                <?php endif; ?>

                <div>
                    <?php if (isset($svc['bang_gia']['phu_phi']['khung_gio']) && is_array($svc['bang_gia']['phu_phi']['khung_gio'])): ?>
                        <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">3. Điều kiện thời gian</h3>
                        <ul style="list-style: none; padding: 0; margin-top: 16px; margin-bottom: 24px;">
                            <?php foreach ($svc['bang_gia']['phu_phi']['khung_gio'] as $item): $kSlug = $item['slug'] ?? ''; ?>
                                <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <input class="input" style="flex: 1;" type="text" name="services[<?php echo $svcId; ?>][khung_gio][<?php echo $kSlug; ?>][ten]" value="<?php echo moving_admin_escape($item['ten'] ?? ''); ?>" required>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][khung_gio][<?php echo $kSlug; ?>][don_gia]" value="<?php echo moving_admin_escape((string)($item['don_gia'] ?? 0)); ?>" required>
                                        <span class="muted">đ</span>
                                    </div>
                                    <button type="button" class="btn-delete-small" onclick="this.closest('li').remove()"><i class="fas fa-times"></i></button>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <button type="button" class="button btn-add-inline" onclick="window.__ADMIN_PRICING__.addNewItem('<?php echo $svcId; ?>', 'khung_gio')" style="margin-top: 8px; width: 100%;">
                            <i class="fas fa-plus"></i> Thêm điều kiện
                        </button>
                    <?php endif; ?>

                    <?php if (isset($svc['bang_gia']['phu_phi']['thoi_tiet']) && is_array($svc['bang_gia']['phu_phi']['thoi_tiet'])): ?>
                        <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">4. Điều kiện thời tiết</h3>
                        <ul style="list-style: none; padding: 0; margin-top: 16px;">
                            <?php foreach ($svc['bang_gia']['phu_phi']['thoi_tiet'] as $item): $tSlug = $item['slug'] ?? ''; ?>
                                <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <input class="input" style="flex: 1;" type="text" name="services[<?php echo $svcId; ?>][thoi_tiet][<?php echo $tSlug; ?>][ten]" value="<?php echo moving_admin_escape($item['ten'] ?? ''); ?>" required>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][thoi_tiet][<?php echo $tSlug; ?>][don_gia]" value="<?php echo moving_admin_escape((string)($item['don_gia'] ?? 0)); ?>" required>
                                        <span class="muted">đ</span>
                                    </div>
                                    <button type="button" class="btn-delete-small" onclick="this.closest('li').remove()"><i class="fas fa-times"></i></button>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                        <button type="button" class="button btn-add-inline" onclick="window.__ADMIN_PRICING__.addNewItem('<?php echo $svcId; ?>', 'thoi_tiet')" style="margin-top: 8px; width: 100%;">
                            <i class="fas fa-plus"></i> Thêm điều kiện
                        </button>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    <?php endforeach; ?>

    <?php if (!empty($services)): ?>
        <div class="form-actions" style="margin-top: 24px; padding: 16px; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); position: sticky; bottom: 20px; z-index: 10;">
            <button type="submit" class="button button-primary" data-save-moving-pricing style="width: 100%; font-size: 1.1rem; padding: 16px;">Lưu bảng giá cho tất cả dịch vụ</button>
        </div>
    <?php endif; ?>
</form>

<script>
window.__MOVING_PRICING_FALLBACK__ = <?php echo json_encode($services, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;
</script>
<script src="assets/js/admin-api.js"></script>
<script>
(function () {
    const form = document.getElementById('moving-pricing-form');
    const messageBox = document.getElementById('moving-pricing-message');
    const sourceBox = document.getElementById('moving-pricing-source');
    const saveButtons = Array.from(document.querySelectorAll('[data-save-moving-pricing]'));
    const vehicleTable = 'bang_gia_chuyen_don_xe';
    const itemTable = 'bang_gia_chuyen_don_muc';

    if (!form || !window.adminApi) {
        return;
    }

    const SVG_ICONS = {
        xe_may_cho_hang: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"></path><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"></path></svg>',
        ba_gac_may: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 17h4V5H6v7"></path><rect x="2" y="17" width="20" height="4" rx="2"></rect><circle cx="6" cy="14" r="3"></circle><circle cx="18" cy="14" r="3"></circle></svg>',
        xe_van_500kg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>',
        xe_tai_750kg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><path d="M16 8h4l3 3v5h-7V8z"></path><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle><line x1="8" y1="8" x2="8" y2="8"></line></svg>',
        xe_tai_1_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18h6a1 1 0 0 0 1-1V10l-3-3h-4v11z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg>',
        xe_tai_1_5_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18h6a1 1 0 0 0 1-1V10l-3-3h-4v11z"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle><line x1="8" y1="10" x2="11" y2="10"></line></svg>',
        xe_tai_2_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"></path><path d="M17 18h4a1 1 0 0 0 1-1V10l-3-3h-2"></path><circle cx="7" cy="18" r="2"></circle><circle cx="17" cy="18" r="2"></circle><path d="M7 8h5"></path></svg>',
        xe_tai_3_5_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="14" height="13"></rect><path d="M16 7h5l2 3v6h-7V7z"></path><circle cx="6" cy="19" r="3"></circle><circle cx="18" cy="19" r="3"></circle></svg>',
        xe_tai_5_tan: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11h20"></path><path d="M2 15h20"></path><rect x="4" y="3" width="16" height="18" rx="2"></rect></svg>',
        default: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>'
    };

    function renderIcons() {
        document.querySelectorAll('.vehicle-icon-circle').forEach(el => {
            const slug = el.dataset.vehicleSlug;
            el.innerHTML = SVG_ICONS[slug] || SVG_ICONS.default;
        });
    }

    const helpers = {
        generateSlug: (text) => {
            return text.toLowerCase()
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/(^_|_$)/g, '');
        },

        addNewVehicle: (serviceId) => {
            const name = prompt('Nhập tên loại xe mới (ví dụ: Xe nâng 5 tấn):');
            if (!name) return;

            const slug = prompt('Nhập mã định danh (slug) - chỉ chữ cái, số và gạch dưới:', helpers.generateSlug(name));
            if (!slug) return;

            const tbody = document.querySelector(`tbody[data-vehicle-list="${serviceId}"]`);
            if (!tbody) return;

            const row = document.createElement('tr');
            row.style.borderBottom = '1px dashed #e2e8f0';
            row.innerHTML = `
                <td style="padding: 12px; text-align: center;">
                    <div class="vehicle-icon-circle" data-vehicle-slug="${slug}"></div>
                </td>
                <td style="padding: 12px;">
                    <input class="input" style="width: 100%; min-width: 150px; font-weight: 700;" type="text" name="services[${serviceId}][loai_xe][${slug}][ten]" value="${name}" required>
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[${serviceId}][loai_xe][${slug}][gia_mo_cua]" value="0" required>
                        <span class="muted">đ</span>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[${serviceId}][loai_xe][${slug}][bang_gia_km][6][don_gia]" value="0" required>
                        <span class="muted">đ</span>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[${serviceId}][loai_xe][${slug}][bang_gia_km][16][don_gia]" value="0" required>
                        <span class="muted">đ</span>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input class="input" style="width: 120px;" type="number" step="1000" min="0" name="services[${serviceId}][loai_xe][${slug}][bang_gia_km][31][don_gia]" value="0" required>
                        <span class="muted">đ</span>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input class="input" style="width: 120px;" type="number" step="100" min="0" name="services[${serviceId}][loai_xe][${slug}][gia_moi_km]" value="0" required>
                        <span class="muted">đ</span>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input class="input" style="width: 120px;" type="number" step="100" min="0" name="services[${serviceId}][loai_xe][${slug}][gia_moi_km_duong_dai]" value="0" required>
                        <span class="muted">đ</span>
                    </div>
                </td>
                <td style="padding: 12px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                        <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[${serviceId}][loai_xe][${slug}][phi_toi_thieu]" value="0" required>
                        <span class="muted">đ</span>
                    </div>
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button type="button" class="btn-delete" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(row);
            renderIcons();
        },

        addNewItem: (serviceId, groupKey) => {
            const name = prompt('Nhập tên hạng mục mới:');
            if (!name) return;

            const slug = prompt('Nhập mã định danh (slug):', helpers.generateSlug(name));
            if (!slug) return;

            const section = document.querySelector(`[data-pricing-service-section="${serviceId}"]`);
            if (!section) return;

            const list = section.querySelector(`ul[name$="[${groupKey}]"], ul`); // fallback
            // More specific selector:
            const targetUl = Array.from(section.querySelectorAll('ul')).find(ul => {
                const firstInput = ul.querySelector('input');
                return firstInput && firstInput.name.includes(`[${groupKey}]`);
            });

            if (!targetUl) return;

            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.alignItems = 'center';
            li.style.gap = '12px';
            li.style.marginBottom = '12px';
            li.innerHTML = `
                <input class="input" style="flex: 1;" type="text" name="services[${serviceId}][${groupKey}][${slug}][ten]" value="${name}" required>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[${serviceId}][${groupKey}][${slug}][don_gia]" value="0" required>
                    <span class="muted">đ</span>
                </div>
                <button type="button" class="btn-delete-small" onclick="this.closest('li').remove()"><i class="fas fa-times"></i></button>
            `;
            targetUl.appendChild(li);
        }
    };

    window.__ADMIN_PRICING__ = helpers;

    function normalizeText(value) {
        return String(value || '').trim();
    }

    function toNumber(value) {
        const parsed = Number(String(value || '').replace(',', '.').replace(/[^\d.-]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function setBusyState(isBusy) {
        saveButtons.forEach((button) => {
            if (!button.dataset.defaultLabel) {
                button.dataset.defaultLabel = button.textContent || 'Lưu bảng giá';
            }
            button.disabled = isBusy;
            button.textContent = isBusy ? 'Đang xử lý...' : button.dataset.defaultLabel;
        });

        if (isBusy) {
            document.body.style.cursor = 'wait';
            form.style.opacity = '0.6';
            form.style.pointerEvents = 'none';
        } else {
            document.body.style.cursor = '';
            form.style.opacity = '';
            form.style.pointerEvents = '';
        }
    }

    function setMessage(type, text) {
        if (!messageBox) return;
        const safeType = type === 'error' ? 'flash-error' : 'flash-success';
        messageBox.className = 'flash ' + safeType;
        messageBox.textContent = text || '';
        messageBox.style.display = text ? '' : 'none';
    }

    function setFieldValue(name, value) {
        const field = form.elements.namedItem(name);
        if (!field || typeof field.value === 'undefined') return;
        field.value = String(value ?? '');
    }

    function hydrateForm(vehicleRows, itemRows) {
        vehicleRows.forEach((row) => {
            const serviceId = normalizeText(row?.id_dich_vu);
            const slug = normalizeText(row?.slug_xe);
            if (!serviceId || !slug) return;

            setFieldValue(`services[${serviceId}][loai_xe][${slug}][ten]`, row?.ten_xe || '');
            setFieldValue(`services[${serviceId}][loai_xe][${slug}][gia_mo_cua]`, row?.gia_mo_cua || 0);
            setFieldValue(`services[${serviceId}][loai_xe][${slug}][bang_gia_km][6][don_gia]`, row?.don_gia_km_6_15 || 0);
            setFieldValue(`services[${serviceId}][loai_xe][${slug}][bang_gia_km][16][don_gia]`, row?.don_gia_km_16_30 || 0);
            setFieldValue(`services[${serviceId}][loai_xe][${slug}][bang_gia_km][31][don_gia]`, row?.don_gia_km_31_tro_len || 0);
            setFieldValue(`services[${serviceId}][loai_xe][${slug}][gia_moi_km]`, row?.gia_moi_km_form || 0);
            setFieldValue(`services[${serviceId}][loai_xe][${slug}][gia_moi_km_duong_dai]`, row?.gia_moi_km_duong_dai_form || 0);
            setFieldValue(`services[${serviceId}][loai_xe][${slug}][phi_toi_thieu]`, row?.phi_toi_thieu_form || 0);
        });

        itemRows.forEach((row) => {
            const serviceId = normalizeText(row?.id_dich_vu);
            const groupKey = normalizeText(row?.nhom);
            const slug = normalizeText(row?.slug_muc);
            if (!serviceId || !groupKey || !slug) return;

            setFieldValue(`services[${serviceId}][${groupKey}][${slug}][ten]`, row?.ten_muc || '');
            setFieldValue(`services[${serviceId}][${groupKey}][${slug}][don_gia]`, row?.don_gia || 0);
        });
    }

    function collectVehicleRows() {
        const formData = new FormData(form);
        const rows = new Map();

        formData.forEach((value, name) => {
            const match = String(name || '').match(/^services\[([^\]]+)\]\[loai_xe\]\[([^\]]+)\]\[([^\]]+)\](?:\[([^\]]+)\])?$/);
            if (!match) return;

            const serviceId = normalizeText(match[1]);
            const slug = normalizeText(match[2]);
            const field = normalizeText(match[3]);
            const bandKey = normalizeText(match[4] || '');
            const rowKey = `${serviceId}::${slug}`;

            if (!rows.has(rowKey)) {
                rows.set(rowKey, {
                    id_dich_vu: serviceId,
                    slug_xe: slug,
                    ten_xe: '',
                    gia_mo_cua: 0,
                    don_gia_km_6_15: 0,
                    don_gia_km_16_30: 0,
                    don_gia_km_31_tro_len: 0,
                    gia_moi_km_form: 0,
                    gia_moi_km_duong_dai_form: 0,
                    phi_toi_thieu_form: 0,
                });
            }

            const row = rows.get(rowKey);
            if (field === 'ten') row.ten_xe = normalizeText(value);
            if (field === 'gia_mo_cua') row.gia_mo_cua = toNumber(value);
            if (field === 'gia_moi_km') row.gia_moi_km_form = toNumber(value);
            if (field === 'gia_moi_km_duong_dai') row.gia_moi_km_duong_dai_form = toNumber(value);
            if (field === 'phi_toi_thieu') row.phi_toi_thieu_form = toNumber(value);
            if (field === 'bang_gia_km' && bandKey === '6') row.don_gia_km_6_15 = toNumber(value);
            if (field === 'bang_gia_km' && bandKey === '16') row.don_gia_km_16_30 = toNumber(value);
            if (field === 'bang_gia_km' && bandKey === '31') row.don_gia_km_31_tro_len = toNumber(value);
        });

        return Array.from(rows.values()).filter((row) => row.id_dich_vu && row.slug_xe && row.ten_xe);
    }

    function collectItemRows() {
        const formData = new FormData(form);
        const rows = new Map();

        formData.forEach((value, name) => {
            const match = String(name || '').match(/^services\[([^\]]+)\]\[(checkbox|khung_gio|thoi_tiet)\]\[([^\]]+)\]\[(ten|don_gia)\]$/);
            if (!match) return;

            const serviceId = normalizeText(match[1]);
            const groupKey = normalizeText(match[2]);
            const slug = normalizeText(match[3]);
            const field = normalizeText(match[4]);
            const rowKey = `${serviceId}::${groupKey}::${slug}`;

            if (!rows.has(rowKey)) {
                rows.set(rowKey, {
                    id_dich_vu: serviceId,
                    nhom: groupKey,
                    slug_muc: slug,
                    ten_muc: '',
                    don_gia: 0,
                });
            }

            const row = rows.get(rowKey);
            if (field === 'ten') row.ten_muc = normalizeText(value);
            if (field === 'don_gia') row.don_gia = toNumber(value);
        });

        return Array.from(rows.values()).filter((row) => row.id_dich_vu && row.nhom && row.slug_muc && row.ten_muc);
    }

    async function syncRows(tableName, currentRows, nextRows, buildKey) {
        const currentMap = new Map();
        (Array.isArray(currentRows) ? currentRows : []).forEach((row) => {
            const key = buildKey(row);
            if (!key) return;
            currentMap.set(key, row);
        });

        const nextKeys = new Set();
        const tasks = [];

        for (const row of nextRows) {
            const key = buildKey(row);
            if (!key) continue;
            nextKeys.add(key);
            const currentRow = currentMap.get(key);
            
            // Check if data actually changed to avoid redundant updates
            const hasChanged = !currentRow || JSON.stringify(row) !== JSON.stringify({ ...row, id: currentRow.id });

            if (currentRow && currentRow.id) {
                if (hasChanged) {
                    tasks.push(window.adminApi.update(tableName, { ...row, id: currentRow.id }, currentRow.id));
                }
            } else {
                tasks.push(window.adminApi.insert(tableName, row));
            }
        }

        for (const row of currentRows) {
            const key = buildKey(row);
            if (!key || nextKeys.has(key) || !row?.id) continue;
            tasks.push(window.adminApi.delete(tableName, row.id));
        }

        if (tasks.length > 0) {
            await Promise.all(tasks);
        }
    }

    async function loadKrudPricing() {
        await window.adminApi.ensureMovingPricingTables();
        const [vehicleRows, itemRows] = await Promise.all([
            window.adminApi.listMovingPricingVehicles(),
            window.adminApi.listMovingPricingItems(),
        ]);

        if (vehicleRows.length || itemRows.length) {
            hydrateForm(vehicleRows, itemRows);
            if (sourceBox) {
                sourceBox.textContent = 'Dữ liệu đang được đồng bộ trực tiếp với KRUD và tự động export JSON.';
            }
        } else if (sourceBox) {
            sourceBox.textContent = 'Chưa có dữ liệu KRUD, đang hiển thị từ JSON fallback hiện tại.';
        }

        // Try to fetch metadata from JSON to show last updated
        try {
            const response = await fetch('../../public/assets/js/data/bang-gia-minh-bach.json', { cache: 'no-cache' });
            const data = await response.json();
            if (data.metadata?.updated_at) {
                const date = new Date(data.metadata.updated_at);
                const badge = document.getElementById('moving-pricing-last-updated-badge');
                const timeStr = document.getElementById('moving-pricing-last-updated-time');
                if (badge && timeStr) {
                    timeStr.textContent = date.toLocaleString('vi-VN');
                    badge.style.display = 'inline-flex';
                }
            }
        } catch (e) {
            console.warn('Cannot fetch pricing metadata', e);
        }
    }

    async function savePricing(targetServiceId = null) {
        setBusyState(true);
        setMessage('success', '');

        try {
            await window.adminApi.ensureMovingPricingTables();

            let vehicleRows = collectVehicleRows();
            let itemRows = collectItemRows();

            if (targetServiceId) {
                vehicleRows = vehicleRows.filter(r => r.id_dich_vu === targetServiceId);
                itemRows = itemRows.filter(r => r.id_dich_vu === targetServiceId);
            }

            const [currentVehicleRows, currentItemRows] = await Promise.all([
                window.adminApi.listMovingPricingVehicles(targetServiceId),
                window.adminApi.listMovingPricingItems(targetServiceId),
            ]);

            await syncRows(
                vehicleTable,
                currentVehicleRows,
                vehicleRows,
                (row) => `${normalizeText(row?.id_dich_vu)}::${normalizeText(row?.slug_xe)}`
            );
            await syncRows(
                itemTable,
                currentItemRows,
                itemRows,
                (row) => `${normalizeText(row?.id_dich_vu)}::${normalizeText(row?.nhom)}::${normalizeText(row?.slug_muc)}`
            );

            // Re-collect ALL rows for full JSON export even if we only synced one service to DB
            const allVehicleRows = collectVehicleRows();
            const allItemRows = collectItemRows();

            const exportResponse = await fetch('../api/pricing_export.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ vehicleRows: allVehicleRows, itemRows: allItemRows }),
            });

            const exportPayload = await exportResponse.json().catch(() => null);
            if (!exportResponse.ok || !exportPayload?.success) {
                throw new Error(exportPayload?.message || 'Không export được bang-gia-minh-bach.json.');
            }

            if (sourceBox) {
                sourceBox.textContent = 'Đã lưu KRUD và export lại bang-gia-minh-bach.json thành công.';
            }
            setMessage('success', exportPayload.message || 'Đã lưu bảng giá thành công.');
        } catch (error) {
            console.error('Cannot save moving pricing:', error);
            setMessage('error', error?.message || 'Không thể lưu bảng giá lên KRUD.');
        } finally {
            setBusyState(false);
        }
    }

    form.addEventListener('submit', function (event) {
        event.preventDefault();
        savePricing();
    });

    document.querySelectorAll('[data-save-section]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const sid = btn.dataset.saveSection;
            if (sid) savePricing(sid);
        });
    });

    loadKrudPricing().catch((error) => {
        console.error('Cannot load moving pricing from KRUD:', error);
        setMessage('error', error?.message || 'Không thể tải dữ liệu bảng giá từ KRUD.');
    }).finally(() => {
        renderIcons();
    });
})();
</script>

<?php require_once __DIR__ . '/../includes/footer_admin.php'; ?>
