<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_donhang.php';

$admin = admin_require_login();
$id = (int)($_GET['id'] ?? 0);

$detail = get_donhang_by_id($id);
$row = $detail['row'] ?? null;
$error = (string)($detail['error'] ?? '');

$statusText = trim((string)($row['trangthai'] ?? ''));
if ($statusText === '') {
    $statusText = 'N/A';
}

$statusRaw = function_exists('mb_strtolower') ? mb_strtolower($statusText, 'UTF-8') : strtolower($statusText);

// ============================================
// TÍNH TIẾN ĐỘ DỰA VÀO TRẠNG THÁI (ĐÃ SỬA)
// ============================================
$progressValue = 0;

if (strpos($statusRaw, 'hoan thanh') !== false || strpos($statusRaw, 'hoàn thành') !== false || strpos($statusRaw, 'completed') !== false) {
    $progressValue = 100;
} elseif (strpos($statusRaw, 'dang thuc hien') !== false || strpos($statusRaw, 'đang thực hiện') !== false || strpos($statusRaw, 'in progress') !== false) {
    $progressValue = 75;
} elseif (strpos($statusRaw, 'da bat dau') !== false || strpos($statusRaw, 'đã bắt đầu') !== false) {
    $progressValue = 50;
} elseif (strpos($statusRaw, 'da nhan') !== false || strpos($statusRaw, 'đã nhận') !== false || strpos($statusRaw, 'confirmed') !== false) {
    $progressValue = 25;
} elseif (strpos($statusRaw, 'huy') !== false || strpos($statusRaw, 'hủy') !== false || strpos($statusRaw, 'cancel') !== false) {
    $progressValue = 0;
} else {
    // Fallback: tính theo ngày nếu có
    if (!empty($row['ngay_bat_dau_kehoach']) && !empty($row['ngay_ket_thuc_kehoach'])) {
        $start = strtotime($row['ngay_bat_dau_kehoach']);
        $end = strtotime($row['ngay_ket_thuc_kehoach']);
        $now = time();
        if ($now >= $end) {
            $progressValue = 100;
        } elseif ($now <= $start) {
            $progressValue = 0;
        } else {
            $total = $end - $start;
            $elapsed = $now - $start;
            $progressValue = ($elapsed / $total) * 100;
        }
    }
}

$progressValue = max(0, min(100, $progressValue));
$progressText = (string)round($progressValue);
// ============================================

// Xử lý danh sách công việc
$jobItems = [];
$jobsRaw = trim((string)($row['cong_viec'] ?? ''));
if ($jobsRaw !== '') {
    $parts = preg_split('/\s*[\.\x{3002}]\s*/u', $jobsRaw) ?: [];
    foreach ($parts as $part) {
        $text = trim((string)$part);
        $text = preg_replace('/^[,;:\-\s]+/u', '', $text) ?? $text;
        if ($text !== '') {
            $jobItems[] = $text;
        }
    }
}
if (!$jobItems) {
    $jobItems = ['Chưa cập nhật công việc'];
}

$hasStart = trim((string)($row['thoigian_batdau_thucte'] ?? '')) !== '';
$hasEnd = trim((string)($row['thoigian_ketthuc_thucte'] ?? '')) !== '';
$isDone = $hasEnd || strpos($statusRaw, 'hoan thanh') !== false;
$isRunning = !$isDone && (strpos($statusRaw, 'dang') !== false || strpos($statusRaw, 'in progress') !== false);

$driverAssigned = (int)($row['id_taixe'] ?? 0) > 0 || trim((string)($row['ten_taixe'] ?? '')) !== '';

admin_render_layout_start('Chi Tiết Đơn Hàng Thuê Tài Xế', 'orders', $admin);
?>

<style>
    .admin-main,
    .admin-main > main {
        background: #f0f9ff !important;
    }

    .od-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
    }

    .od-title {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 800;
        color: #007bff;
    }

    .od-head-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .od-back-btn {
        display: inline-flex;
        align-items: center;
        padding: 0.32rem 0.8rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #007bff, #00b4d8);
        color: #fff;
        border: none;
        font-weight: 600;
        font-size: 0.8rem;
        text-decoration: none;
    }

    .od-back-btn:hover {
        background: linear-gradient(135deg, #0056b3, #0096b8);
        color: #fff;
    }

    .od-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .od-card {
        background: #fff;
        border: 1px solid #d6e3f0;
        border-radius: 11px;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
        overflow: hidden;
    }

    .od-card.wide {
        grid-column: 1 / -1;
    }

    .od-hero {
        padding: 14px 14px 16px;
        border-radius: 16px;
        background: linear-gradient(96deg, #007bff 0%, #00b4d8 100%);
        color: #fff;
    }

    .od-hero-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 18px;
        margin-bottom: 12px;
        flex-wrap: wrap;
    }

    .od-order-id {
        margin: 0;
        font-size: 2rem;
        font-weight: 800;
        line-height: 1.02;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .od-status-pill {
        display: inline-flex;
        align-items: center;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.5);
    }

    .od-service {
        margin: 2px 0 0;
        font-size: 1.45rem;
        font-weight: 700;
        line-height: 1.14;
    }

    .od-progress-ring {
        --p: 0;
        width: 102px;
        height: 102px;
        padding: 6px;
        border-radius: 50%;
        background: conic-gradient(#b7f5d7 calc(var(--p) * 1%), rgba(176, 241, 235, 0.42) 0);
    }

    .od-progress-core {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        display: grid;
        place-content: center;
        text-align: center;
        background: rgba(0, 123, 255, 0.65);
    }

    .od-progress-core strong {
        font-size: 2rem;
        line-height: 1;
    }

    .od-progress-core small {
        font-size: 0.78rem;
        font-weight: 700;
    }

    .od-hero-grid {
        margin-top: 8px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
    }

    .od-box {
        border-radius: 12px;
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.15);
    }

    .od-box-head {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 2px;
    }

    .od-box-icon {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        background: rgba(255, 255, 255, 0.2);
    }

    .od-box-label {
        margin: 0;
        font-size: 0.95rem;
        font-weight: 700;
    }

    .od-box-value {
        margin: 2px 0 0;
        font-size: 1.6rem;
        font-weight: 800;
        word-break: break-word;
    }

    .od-box-value--price {
        font-size: 2rem;
    }

    .od-box-value--address {
        font-size: 1.1rem;
        line-height: 1.35;
    }

    .od-panel-head,
    .od-profile-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 11px 12px;
        border-bottom: 1px solid #e2ebf5;
        background: #f8fbff;
    }

    .od-panel-title,
    .od-profile-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 800;
        color: #007bff;
    }

    .od-job-count {
        display: inline-flex;
        align-items: center;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        background: #e3f2fd;
        color: #007bff;
    }

    .od-jobs-body {
        padding: 12px;
        background: #f0f9ff;
    }

    .od-jobs-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 8px;
        counter-reset: od-job;
    }

    .od-jobs-list li {
        counter-increment: od-job;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px;
        border-radius: 9px;
        background: white;
        border: 1px solid #cce7f0;
        font-weight: 600;
        font-size: 13px;
        color: #2b4a65;
    }

    .od-jobs-list li::before {
        content: counter(od-job);
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 800;
        background: #007bff;
        color: #fff;
        flex: 0 0 22px;
    }

    .od-jobs-foot {
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        border-top: 1px solid #e2ebf5;
        background: #fff;
    }

    .od-mini {
        border: 1px solid #c8d8ea;
        background: #dfe9f7;
        border-radius: 8px;
        padding: 7px 9px;
    }

    .od-mini p {
        margin: 0;
    }

    .od-mini .k {
        font-size: 10px;
        font-weight: 700;
        color: #46627d;
    }

    .od-mini .v {
        font-size: 13px;
        font-weight: 700;
        color: #1e3a58;
    }

    .od-profile-body {
        padding: 12px;
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
    }

    .od-avatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        object-fit: cover;
        background: #d6e4f4;
    }

    .od-name {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 800;
        color: #223e59;
    }

    .od-info-row {
        margin: 4px 0;
        font-size: 13px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 7px;
    }

    .od-info-row i {
        color: #007bff;
        width: 20px;
    }

    @media (max-width: 991px) {
        .od-grid,
        .od-hero-grid,
        .od-jobs-foot {
            grid-template-columns: 1fr;
        }
        .od-order-id { font-size: 1.5rem; }
        .od-service { font-size: 1.1rem; }
        .od-box-value--price { font-size: 1.5rem; }
    }
</style>

<div class="od-head">
    <div class="od-head-actions">
        <a href="quan-ly-don-hang.php" class="od-back-btn"><i class="bi bi-arrow-left-circle me-1"></i>Quay lại</a>
    </div>
</div>

<?php if ($error !== '' || !is_array($row)): ?>
    <div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Không tìm thấy đơn hàng.') ?></div>
<?php else: ?>

    <section class="od-grid">
        <article class="od-card od-hero wide">
            <div class="od-hero-top">
                <div>
                    <h3 class="od-order-id">
                        Đơn #<?= admin_h(str_pad((string)($row['id'] ?? ''), 7, '0', STR_PAD_LEFT)) ?>
                        <span class="od-status-pill"><?= admin_h($statusText) ?></span>
                    </h3>
                    <p class="od-service"><?= admin_h(trim((string)($row['dich_vu'] ?? '')) ?: 'N/A') ?></p>
                </div>
                <div class="od-progress-ring" style="--p:<?= admin_h($progressText) ?>;">
                    <div class="od-progress-core">
                        <strong><?= admin_h($progressText) ?>%</strong>
                        <small>Tiến độ</small>
                    </div>
                </div>
            </div>
            <div class="od-hero-grid">
                <div class="od-box">
                    <div class="od-box-head">
                        <span class="od-box-icon"><i class="bi bi-currency-dollar"></i></span>
                        <p class="od-box-label">Tổng tiền</p>
                    </div>
                    <p class="od-box-value od-box-value--price"><?= admin_h(number_format((float)($row['tong_tien'] ?? 0), 0, ',', '.') . ' đ') ?></p>
                </div>
                <div class="od-box">
                    <div class="od-box-head">
                        <span class="od-box-icon"><i class="bi bi-geo-alt"></i></span>
                        <p class="od-box-label">Điểm đón</p>
                    </div>
                    <p class="od-box-value od-box-value--address"><?= admin_h(trim((string)($row['diemdon'] ?? '')) ?: 'N/A') ?></p>
                </div>
                <div class="od-box">
                    <div class="od-box-head">
                        <span class="od-box-icon"><i class="bi bi-flag"></i></span>
                        <p class="od-box-label">Điểm đến</p>
                    </div>
                    <p class="od-box-value od-box-value--address"><?= admin_h(trim((string)($row['diemden'] ?? '')) ?: 'N/A') ?></p>
                </div>
            </div>
        </article>

        <article class="od-card">
            <div class="od-panel-head">
                <h4 class="od-panel-title">Thông tin chuyến đi</h4>
            </div>
            <div class="od-jobs-body">
                <div class="od-mini" style="margin-bottom: 10px;">
                    <p class="k">Quãng đường</p>
                    <p class="v"><?= admin_h(trim((string)($row['quangduong_dukien'] ?? '')) ?: 'N/A') ?> km</p>
                </div>
                <div class="od-mini" style="margin-bottom: 10px;">
                    <p class="k">Thời gian dự kiến</p>
                    <p class="v"><?= admin_h(trim((string)($row['gio_bat_dau_kehoach'] ?? '')) ?: '--:--') ?> - <?= admin_h(trim((string)($row['gio_ket_thuc_kehoach'] ?? '')) ?: '--:--') ?></p>
                </div>
                <div class="od-mini">
                    <p class="k">Ngày thực hiện</p>
                    <p class="v"><?= admin_h(trim((string)($row['ngay_bat_dau_kehoach'] ?? '')) ?: '---') ?> → <?= admin_h(trim((string)($row['ngay_ket_thuc_kehoach'] ?? '')) ?: '---') ?></p>
                </div>
            </div>
            <div class="od-jobs-foot">
                <div class="od-mini">
                    <p class="k">Gói dịch vụ</p>
                    <p class="v"><?= admin_h(trim((string)($row['goi_dich_vu'] ?? '')) ?: 'N/A') ?></p>
                </div>
                <div class="od-mini">
                    <p class="k">Yêu cầu khác</p>
                    <p class="v"><?= admin_h(trim((string)($row['yeu_cau_khac'] ?? '')) ?: 'Không có') ?></p>
                </div>
                <div class="od-mini" style="grid-column:1/-1;">
                    <p class="k">Ghi chú</p>
                    <p class="v"><?= admin_h(trim((string)($row['ghi_chu'] ?? '')) ?: 'Không có') ?></p>
                </div>
            </div>
        </article>

        <article class="od-card">
            <div class="od-profile-head">
                <h4 class="od-profile-title">Khách hàng</h4>
                <span class="od-job-count">Thông tin</span>
            </div>
            <div class="od-profile-body">
                <div>
                    <p class="od-name"><?= admin_h(trim((string)($row['tenkhachhang'] ?? '')) ?: 'N/A') ?></p>
                    <p class="od-info-row"><i class="bi bi-envelope"></i><?= admin_h(trim((string)($row['emailkhachhang'] ?? '')) ?: 'N/A') ?></p>
                    <p class="od-info-row"><i class="bi bi-telephone"></i><?= admin_h(trim((string)($row['sdtkhachhang'] ?? '')) ?: 'N/A') ?></p>
                    <p class="od-info-row"><i class="bi bi-geo-alt"></i><?= admin_h(trim((string)($row['diachikhachhang'] ?? '')) ?: 'N/A') ?></p>
                </div>
            </div>
            <div class="od-profile-foot" style="padding: 12px;">
                <span class="od-job-count">Ngày đặt: <?= admin_h(trim((string)($row['ngaydat'] ?? '')) ?: 'N/A') ?></span>
            </div>
        </article>

        <article class="od-card">
            <div class="od-profile-head">
                <h4 class="od-profile-title">Tài xế phụ trách</h4>
                <span class="od-job-count" style="<?= $driverAssigned ? 'background:#d4edda;color:#155724;' : 'background:#fff3cd;color:#856404;' ?>">
                    <?= $driverAssigned ? 'Đã phân công' : 'Chưa phân công' ?>
                </span>
            </div>
            <div class="od-profile-body">
                <div>
                    <p class="od-name"><?= admin_h(trim((string)($row['ten_taixe'] ?? '')) ?: 'Chưa phân công') ?></p>
                    <p class="od-info-row"><i class="bi bi-telephone"></i><?= admin_h(trim((string)($row['sdt_taixe'] ?? '')) ?: 'N/A') ?></p>
                    <p class="od-info-row"><i class="bi bi-card-list"></i>Kinh nghiệm: <?= admin_h(trim((string)($row['kinh_nghiem_taixe'] ?? '')) ?: 'N/A') ?> năm</p>
                </div>
            </div>
        </article>
    </section>
<?php endif; ?>


<!-- ============================================ -->
<!-- PHẦN QUẢN LÝ: PHÂN CÔNG & CẬP NHẬT TRẠNG THÁI -->
<!-- ============================================ -->
<?php if ($error === '' && is_array($row)): ?>
<div class="card border-0 shadow-sm mt-4">
    <div class="card-header bg-white fw-semibold">
        <i class="bi bi-gear me-2"></i>Quản lý đơn hàng
    </div>
    <div class="card-body">
        <div class="row g-4">
            
            <!-- Cột 1: Phân công tài xế -->
            <div class="col-md-6">
                <h5 class="fw-bold mb-3"><i class="bi bi-person-check me-2"></i>Phân công tài xế</h5>
                
                <?php
                $taixeResult = admin_api_list_table('nguoidung');
                $allUsers = $taixeResult['rows'] ?? [];
                $taixeList = array_filter($allUsers, function($user) {
                    $idDichvu = (string)($user['id_dichvu'] ?? '');
                    return !empty($idDichvu);
                });
                $taixeList = array_values($taixeList);
                
                $currentDriverId = (int)($row['id_taixe'] ?? 0);
                $currentDriverName = trim((string)($row['ten_taixe'] ?? ''));
                ?>
                
                <?php if ($currentDriverId > 0 && $currentDriverName !== ''): ?>
                    <div class="alert alert-success mb-3">
                        <strong>Tài xế hiện tại:</strong> <?= admin_h($currentDriverName) ?> 
                        (ID: <?= $currentDriverId ?>)
                    </div>
                <?php else: ?>
                    <div class="alert alert-warning mb-3">
                        <i class="bi bi-exclamation-triangle me-1"></i>Đơn hàng chưa được phân công tài xế.
                    </div>
                <?php endif; ?>
                
                <form method="post" action="xu-ly-phan-cong-tai-xe.php">
                    <input type="hidden" name="donhang_id" value="<?= (int)$id ?>">
                    <input type="hidden" name="return" value="chi-tiet-don-hang.php?id=<?= (int)$id ?>">
                    
                    <div class="mb-3">
                        <label class="form-label">Chọn tài xế mới</label>
                        <select name="taixe_id" class="form-select" required>
                            <option value="">-- Chọn tài xế --</option>
                            <?php foreach ($taixeList as $tx): ?>
                                <option value="<?= $tx['id'] ?>" <?= (int)($tx['id'] ?? 0) === $currentDriverId ? 'selected' : '' ?>>
                                    <?= admin_h($tx['hovaten'] ?? 'N/A') ?> - <?= admin_h($tx['sodienthoai'] ?? '') ?> 
                                    (K.nghiệm: <?= $tx['kinh_nghiem_nam'] ?? 0 ?> năm)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-check-circle me-1"></i>Cập nhật tài xế
                    </button>
                </form>
            </div>
            
            <!-- Cột 2: Cập nhật trạng thái -->
            <div class="col-md-6">
                <h5 class="fw-bold mb-3"><i class="bi bi-arrow-repeat me-2"></i>Cập nhật trạng thái</h5>
                
                <?php
                $currentStatus = trim((string)($row['trangthai'] ?? ''));
                $statusKey = donhang_status_key($currentStatus);
                ?>
                
                <div class="alert alert-info mb-3">
                    <strong>Trạng thái hiện tại:</strong> <?= admin_h($currentStatus) ?>
                </div>
                
                <form method="post" action="xu-ly-cap-nhat-trang-thai-don.php">
                    <input type="hidden" name="donhang_id" value="<?= (int)$id ?>">
                    <input type="hidden" name="return" value="chi-tiet-don-hang.php?id=<?= (int)$id ?>">
                    
                    <div class="mb-3">
                        <label class="form-label">Trạng thái mới</label>
                        <select name="trangthai" class="form-select" required>
                            <option value="">-- Chọn trạng thái --</option>
                            <option value="Đang xác nhận" <?= $statusKey === 'pending' ? 'selected' : '' ?>>Đang xác nhận</option>
                            <option value="Đã nhận" <?= $statusKey === 'confirmed' ? 'selected' : '' ?>>Đã nhận</option>
                            <option value="Đã bắt đầu" <?= $statusKey === 'in_progress' ? 'selected' : '' ?>>Đã bắt đầu</option>
                            <option value="Đã hoàn thành" <?= $statusKey === 'completed' ? 'selected' : '' ?>>Đã hoàn thành</option>
                            <option value="Đã hủy" <?= $statusKey === 'cancelled' ? 'selected' : '' ?>>Đã hủy</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-success">
                        <i class="bi bi-check-circle me-1"></i>Cập nhật trạng thái
                    </button>
                </form>
            </div>
            
        </div>
    </div>
</div>
<?php endif; ?>
<?php admin_render_layout_end(); ?>