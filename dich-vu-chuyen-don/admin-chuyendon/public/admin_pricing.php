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

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_all') {
    // Processing incoming data
    $postServices = $_POST['services'] ?? [];
    
    foreach ($services as $i => &$svc) {
        $svcId = $svc['id'] ?? '';
        if (isset($postServices[$svcId])) {
            $postData = $postServices[$svcId];
            
            // 1. Update loai_xe
            if (isset($postData['loai_xe']) && is_array($postData['loai_xe']) && isset($svc['bang_gia']['loai_xe'])) {
                foreach ($svc['bang_gia']['loai_xe'] as $vIndex => &$vehicle) {
                    $vSlug = $vehicle['slug'] ?? '';
                    if (isset($postData['loai_xe'][$vSlug])) {
                        $pVeh = $postData['loai_xe'][$vSlug];
                        if (isset($pVeh['ten'])) $vehicle['ten'] = trim((string)$pVeh['ten']);
                        if (isset($pVeh['gia_moi_km'])) $vehicle['gia_moi_km'] = (float)$pVeh['gia_moi_km'];
                        if (isset($pVeh['gia_moi_km_duong_dai'])) $vehicle['gia_moi_km_duong_dai'] = (float)$pVeh['gia_moi_km_duong_dai'];
                        if (isset($pVeh['phi_toi_thieu'])) $vehicle['phi_toi_thieu'] = (float)$pVeh['phi_toi_thieu'];
                    }
                }
            }
            
            // 2. Update checkbox
            if (isset($postData['checkbox']) && is_array($postData['checkbox']) && isset($svc['bang_gia']['phu_phi']['checkbox'])) {
                foreach ($svc['bang_gia']['phu_phi']['checkbox'] as $cIndex => &$item) {
                    $cSlug = $item['slug'] ?? '';
                    if (isset($postData['checkbox'][$cSlug])) {
                        $pItem = $postData['checkbox'][$cSlug];
                        if (isset($pItem['ten'])) $item['ten'] = trim((string)$pItem['ten']);
                        if (isset($pItem['don_gia'])) $item['don_gia'] = (float)$pItem['don_gia'];
                    }
                }
            }
            
            // 3. Update khung_gio
            if (isset($postData['khung_gio']) && is_array($postData['khung_gio']) && isset($svc['bang_gia']['phu_phi']['khung_gio'])) {
                foreach ($svc['bang_gia']['phu_phi']['khung_gio'] as $kIndex => &$item) {
                     $kSlug = $item['slug'] ?? '';
                     if (isset($postData['khung_gio'][$kSlug])) {
                        $pItem = $postData['khung_gio'][$kSlug];
                        if (isset($pItem['ten'])) $item['ten'] = trim((string)$pItem['ten']);
                        if (isset($pItem['don_gia'])) $item['don_gia'] = (float)$pItem['don_gia'];
                     }
                }
            }
            
            // 4. Update thoi_tiet
            if (isset($postData['thoi_tiet']) && is_array($postData['thoi_tiet']) && isset($svc['bang_gia']['phu_phi']['thoi_tiet'])) {
                foreach ($svc['bang_gia']['phu_phi']['thoi_tiet'] as $tIndex => &$item) {
                     $tSlug = $item['slug'] ?? '';
                     if (isset($postData['thoi_tiet'][$tSlug])) {
                        $pItem = $postData['thoi_tiet'][$tSlug];
                        if (isset($pItem['ten'])) $item['ten'] = trim((string)$pItem['ten']);
                        if (isset($pItem['don_gia'])) $item['don_gia'] = (float)$pItem['don_gia'];
                     }
                }
            }
        }
    }
    unset($svc); // break reference

    // Backup current file
    $backupPath = $jsonPath . '.' . time() . '.bak';
    @copy($jsonPath, $backupPath);

    // Save changes
    $encoded = json_encode($services, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded !== false) {
        if (@file_put_contents($jsonPath, $encoded, LOCK_EX) !== false) {
            moving_admin_set_flash('success', 'Đã lưu toàn bộ cấu hình bảng giá thành công.');
        } else {
            moving_admin_set_flash('error', 'Lỗi ghi file khi lưu bảng giá minh bạch. Kiểm tra phân quyền truy cập.');
        }
    } else {
        moving_admin_set_flash('error', 'Lỗi định dạng dữ liệu (encode) khi lưu bảng giá.');
    }
    
    moving_admin_redirect('admin_pricing.php');
}

$flash = moving_admin_get_flash();
$pageTitle = 'Quản lý Bảng giá | Admin chuyển dọn';

require_once __DIR__ . '/../includes/header_admin.php';
?>
<section class="hero-card">
    <div>
        <h1>Quản lý Bảng giá & Phụ phí</h1>
        <p>Quản lý toàn bộ cước xe theo km, phí tối thiểu và các phụ phí. Dữ liệu được cấu hình đồng bộ trực tiếp lên giao diện khách hàng thông qua bảng giá minh bạch.</p>
    </div>
</section>

<?php if (is_array($flash)): ?>
    <div class="flash <?php echo $flash['type'] === 'error' ? 'flash-error' : ($flash['type'] === 'warning' ? 'flash-warning' : 'flash-success'); ?>">
        <?php echo moving_admin_escape($flash['message'] ?? ''); ?>
    </div>
<?php endif; ?>

<form method="post" action="admin_pricing.php">
    <input type="hidden" name="action" value="save_all">
    <div class="form-actions" style="margin-bottom: 20px; display: flex; justify-content: flex-end;">
        <button type="submit" class="button button-primary">Lưu toàn bộ bảng giá</button>
    </div>

    <?php if (empty($services)): ?>
        <div class="empty-state panel">Không có dữ liệu bảng giá hoặc đường dẫn file sai.</div>
    <?php endif; ?>

    <?php foreach ($services as $svc): $svcId = $svc['id'] ?? ''; ?>
        <section class="panel" style="margin-bottom: 32px;">
            <div class="section-header">
                <div>
                    <h2><?php echo moving_admin_escape($svc['ten_dich_vu'] ?? ''); ?></h2>
                    <p class="muted"><?php echo moving_admin_escape($svc['thong_tin_minh_bach']['mo_ta_ngan'] ?? ''); ?></p>
                </div>
            </div>

            <!-- Cước xe -->
            <?php if (isset($svc['bang_gia']['loai_xe']) && is_array($svc['bang_gia']['loai_xe'])): ?>
                <h3 style="margin-top: 1rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">1. Cước xe theo loại xe và quãng đường</h3>
                <div style="overflow-x: auto; margin-top: 16px;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <th style="padding: 12px; font-weight: 600;">Loại xe</th>
                                <th style="padding: 12px; font-weight: 600;">Giá mỗi km</th>
                                <th style="padding: 12px; font-weight: 600;">Giá km > 20km</th>
                                <th style="padding: 12px; font-weight: 600;">Phí / Cước tối thiểu</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($svc['bang_gia']['loai_xe'] as $veh): $vSlug = $veh['slug'] ?? ''; ?>
                                <tr style="border-bottom: 1px dashed #e2e8f0;">
                                    <td style="padding: 12px;">
                                        <input class="input" style="width: 100%; min-width: 150px;" type="text" name="services[<?php echo $svcId; ?>][loai_xe][<?php echo $vSlug; ?>][ten]" value="<?php echo moving_admin_escape($veh['ten'] ?? ''); ?>" required>
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
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; margin-top: 32px;">
                <!-- Phụ phí chọn thêm -->
                <?php if (isset($svc['bang_gia']['phu_phi']['checkbox']) && is_array($svc['bang_gia']['phu_phi']['checkbox'])): ?>
                    <div>
                        <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">2. Phụ phí dịch vụ hỗ trợ ngoài</h3>
                        <ul style="list-style: none; padding: 0; margin-top: 16px;">
                            <?php foreach ($svc['bang_gia']['phu_phi']['checkbox'] as $idx => $item): $cSlug = $item['slug'] ?? ''; ?>
                                <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <input class="input" style="flex: 1;" type="text" name="services[<?php echo $svcId; ?>][checkbox][<?php echo $cSlug; ?>][ten]" value="<?php echo moving_admin_escape($item['ten'] ?? ''); ?>" required>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][checkbox][<?php echo $cSlug; ?>][don_gia]" value="<?php echo moving_admin_escape((string)($item['don_gia'] ?? 0)); ?>" required>
                                        <span class="muted">đ</span>
                                    </div>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    </div>
                <?php endif; ?>

                <div>
                    <!-- Phụ phí thời điểm -->
                    <?php if (isset($svc['bang_gia']['phu_phi']['khung_gio']) && is_array($svc['bang_gia']['phu_phi']['khung_gio'])): ?>
                        <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">3. Điều Kiện Thời Gian</h3>
                        <ul style="list-style: none; padding: 0; margin-top: 16px; margin-bottom: 24px;">
                            <?php foreach ($svc['bang_gia']['phu_phi']['khung_gio'] as $item): $kSlug = $item['slug'] ?? ''; ?>
                                <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <input class="input" style="flex: 1;" type="text" name="services[<?php echo $svcId; ?>][khung_gio][<?php echo $kSlug; ?>][ten]" value="<?php echo moving_admin_escape($item['ten'] ?? ''); ?>" required>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][khung_gio][<?php echo $kSlug; ?>][don_gia]" value="<?php echo moving_admin_escape((string)($item['don_gia'] ?? 0)); ?>" required>
                                        <span class="muted">đ</span>
                                    </div>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>

                    <!-- Phụ phí thời tiết -->
                    <?php if (isset($svc['bang_gia']['phu_phi']['thoi_tiet']) && is_array($svc['bang_gia']['phu_phi']['thoi_tiet'])): ?>
                        <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">4. Điều Kiện Thời Tiết</h3>
                        <ul style="list-style: none; padding: 0; margin-top: 16px;">
                            <?php foreach ($svc['bang_gia']['phu_phi']['thoi_tiet'] as $item): $tSlug = $item['slug'] ?? ''; ?>
                                <li style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                                    <input class="input" style="flex: 1;" type="text" name="services[<?php echo $svcId; ?>][thoi_tiet][<?php echo $tSlug; ?>][ten]" value="<?php echo moving_admin_escape($item['ten'] ?? ''); ?>" required>
                                    <div style="display: flex; align-items: center; gap: 4px;">
                                        <input class="input" style="width: 140px;" type="number" step="1000" min="0" name="services[<?php echo $svcId; ?>][thoi_tiet][<?php echo $tSlug; ?>][don_gia]" value="<?php echo moving_admin_escape((string)($item['don_gia'] ?? 0)); ?>" required>
                                        <span class="muted">đ</span>
                                    </div>
                                </li>
                            <?php endforeach; ?>
                        </ul>
                    <?php endif; ?>
                </div>
            </div>
        </section>
    <?php endforeach; ?>

    <?php if (!empty($services)): ?>
        <div class="form-actions" style="margin-top: 24px; padding: 16px; background: #fff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); position: sticky; bottom: 20px; z-index: 10;">
            <button type="submit" class="button button-primary" style="width: 100%; font-size: 1.1rem; padding: 16px;">Lưu bảng giá cho tất cả dịch vụ</button>
        </div>
    <?php endif; ?>
</form>

<?php require_once __DIR__ . '/../includes/footer_admin.php'; ?>
