<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/admin_api_common.php';

$admin = admin_require_login();

// Lấy danh sách dịch vụ chăm sóc vườn
$data  = admin_api_list_table('cham_soc_vuon');
$rows  = $data['rows'] ?? [];
$error = $data['error'] ?? '';

$flashOk  = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));
$editId   = (int) ($_GET['edit_id'] ?? 0);
$viewId   = (int) ($_GET['view_id'] ?? 0);
$showForm = isset($_GET['them']) || $editId > 0;

// Tìm bản ghi đang sửa
$editRow = [];
if ($editId > 0) {
    foreach ($rows as $r) {
        if ((int) ($r['id'] ?? 0) === $editId) {
            $editRow = $r;
            break;
        }
    }
}

// Tìm bản ghi đang xem
$viewRow = [];
if ($viewId > 0) {
    foreach ($rows as $r) {
        if ((int) ($r['id'] ?? 0) === $viewId) {
            $viewRow = $r;
            break;
        }
    }
}

function pt_val(array $row, string $key, string $default = ''): string
{
    return admin_h((string) ($row[$key] ?? $default));
}

function pt_loai_label(string $loai): string
{
    return $loai === 'dinh_ky' ? 'Định kỳ' : ($loai === 'dot_xuat' ? 'Đột xuất' : $loai);
}

admin_render_layout_start('Quản Lý Chăm Sóc Vườn', 'cham_soc_vuon', $admin);
?>

<style>
    /* Đổi tông màu sang Xanh lá cây & Nâu đất */
    :root {
        --garden-green: #15803d;
        --garden-light-green: #dcfce7;
        --garden-dark: #064e3b;
        --garden-accent: #a16207;
    }
    .pt-page-header { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:14px; }
    table th { white-space:nowrap !important; vertical-align:middle !important; background-color: #f0fdf4 !important; }
    table td { vertical-align:middle !important; }
    .action-buttons { display:flex; gap:0.4rem; justify-content:flex-end; align-items:center; }
    .action-buttons .btn { min-width:32px; padding:0.25rem 0.45rem; display:flex; align-items:center; justify-content:center; }
    
    /* Màu sắc Form và Card */
    .pt-form-card { border-left:4px solid var(--garden-green) !important; }
    .pt-view-card { border-left:4px solid var(--garden-accent) !important; }
    
    .form-label { font-weight:700; color:var(--garden-dark); font-size:0.82rem; text-transform:uppercase; letter-spacing:.4px; margin-bottom:3px; }
    
    /* Badge cho trạng thái/loại hình chăm sóc */
    .loai-badge-dinh_ky  { background:#dcfce7; color:#15803d; border-radius:6px; padding:2px 8px; font-size:.82rem; font-weight:600; }
    .loai-badge-dot_xuat { background:#fef9c3; color:#a16207; border-radius:6px; padding:2px 8px; font-size:.82rem; font-weight:600; }
    
    .info-row { display:flex; gap:8px; align-items:baseline; margin-bottom:4px; }
    .info-label { font-weight:700; color:var(--garden-dark); min-width:130px; font-size:.85rem; }
    .info-val { color:#14532d; font-size:.9rem; }
    
    .view-modal-header { background:linear-gradient(90deg, var(--garden-green), var(--garden-dark)); color:#fff; border-radius:10px 10px 0 0; padding:14px 18px; }
    .percent-badge { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; font-weight:700; border-radius:8px; padding:2px 10px; font-size:.9rem; }
    
    .btn-primary { background-color: var(--garden-green); border-color: var(--garden-green); }
    .btn-primary:hover { background-color: var(--garden-dark); border-color: var(--garden-dark); }
    
    @media(max-width:767px){ .pt-mobile-card{ background:#fff; border-radius:12px; border:1px solid #dcfce7; padding:12px; margin-bottom:10px; box-shadow:0 2px 6px rgba(21,128,61,.06); } }
</style>

<div class="pt-page-header">
    <h2 class="h4 mb-0 fw-bold text-success"><i class="bi bi-tree-fill me-2"></i>Quản lý Dịch Vụ Vườn</h2>
    <?php if (!$showForm): ?>
        <a href="?them=1" class="btn btn-primary"><i class="bi bi-plus-circle me-1"></i>Thêm dịch vụ</a>
    <?php else: ?>
        <a href="quan-ly-phu-thu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lại</a>
    <?php endif; ?>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2 mb-3 border-0 shadow-sm"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<?php if ($showForm): ?>
<div class="card border-0 shadow-sm pt-form-card mb-4">
    <div class="card-header bg-white py-2 border-bottom">
        <h6 class="mb-0 fw-bold">
            <i class="bi bi-<?= $editId > 0 ? 'pencil-square text-warning' : 'plus-circle-fill text-success' ?> me-2"></i>
            <?= $editId > 0 ? 'Chỉnh sửa dịch vụ #' . $editId : 'Đăng ký dịch vụ chăm sóc mới' ?>
        </h6>
    </div>
    <div class="card-body p-3">
        <form method="post" action="xu-ly-phu-thu.php" id="formPhuThu">
            <input type="hidden" name="action" value="<?= $editId > 0 ? 'sua' : 'them' ?>">
            <?php if ($editId > 0): ?>
                <input type="hidden" name="id" value="<?= $editId ?>">
            <?php endif; ?>

            <div class="row g-3">
                <div class="col-md-5">
                    <label class="form-label">Tên dịch vụ <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="ten" required
                        value="<?= pt_val($editRow, 'ten') ?>" placeholder="VD: Cắt cỏ bãi trước, Bón phân...">
                </div>

                <div class="col-md-3">
                    <label class="form-label">Loại hình <span class="text-danger">*</span></label>
                    <select class="form-select" name="loai" id="selLoai" onchange="toggleLoai(this.value)">
                        <option value="dinh_ky"  <?= ($editRow['loai'] ?? 'dinh_ky') === 'dinh_ky'  ? 'selected' : '' ?>>Chăm sóc định kỳ</option>
                        <option value="dot_xuat" <?= ($editRow['loai'] ?? '') === 'dot_xuat' ? 'selected' : '' ?>>Yêu cầu đột xuất</option>
                    </select>
                </div>

                <div class="col-md-2">
                    <label class="form-label">Phí thêm (%)</label>
                    <input type="number" class="form-control" name="phu_thu_percent" min="0" step="0.01"
                        value="<?= pt_val($editRow, 'phu_thu_percent', '0') ?>">
                </div>

                <div class="col-md-2">
                    <label class="form-label">Ghi chú nhanh</label>
                    <input type="text" class="form-control" name="mo_ta"
                        value="<?= pt_val($editRow, 'mo_ta') ?>" placeholder="Yêu cầu riêng...">
                </div>

                <div class="col-12" id="grpNgayLe" style="display:none;">
                    <div class="row g-2">
                        <div class="col-md-4">
                            <div class="alert alert-info py-2 mb-0 small">Thiết lập ngày thực hiện trong tháng (VD: Ngày 15 hàng tháng)</div>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Ngày thực hiện</label>
                            <input type="number" class="form-control" name="ngay" min="1" max="31"
                                value="<?= pt_val($editRow, 'ngay') ?>" placeholder="VD: 5">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Tháng bắt đầu</label>
                            <input type="number" class="form-control" name="thang" min="1" max="12"
                                value="<?= pt_val($editRow, 'thang') ?>" placeholder="1-12">
                        </div>
                    </div>
                </div>

                <div class="col-12" id="grpCaDem" style="display:none;">
                    <div class="row g-2">
                        <div class="col-md-4">
                            <div class="alert alert-warning py-2 mb-0 small">Khung giờ thợ có thể đến xử lý</div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Từ lúc</label>
                            <input type="time" class="form-control" name="gio_bat_dau"
                                value="<?= pt_val($editRow, 'gio_bat_dau') ?>">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Đến lúc</label>
                            <input type="time" class="form-control" name="gio_ket_thuc"
                                value="<?= pt_val($editRow, 'gio_ket_thuc') ?>">
                        </div>
                    </div>
                </div>
            </div>

            <div class="d-flex gap-2 mt-3 justify-content-end">
                <a href="quan-ly-phu-thu.php" class="btn btn-light border">Hủy bỏ</a>
                <button type="submit" class="btn btn-<?= $editId > 0 ? 'warning' : 'success' ?> px-4 fw-bold shadow-sm text-white">
                    <i class="bi bi-<?= $editId > 0 ? 'check2-circle' : 'save' ?> me-1"></i>
                    <?= $editId > 0 ? 'Cập nhật dịch vụ' : 'Lưu thông tin vườn' ?>
                </button>
            </div>
        </form>
    </div>
</div>
<?php endif; ?>

<?php if ($viewId > 0 && !empty($viewRow)): ?>
<div class="card border-0 shadow-sm pt-view-card mb-4">
    <div class="view-modal-header d-flex justify-content-between align-items-center">
        <span class="fw-bold fs-6"><i class="bi bi-search me-2"></i>Chi tiết công việc #<?= $viewId ?></span>
        <a href="quan-ly-phu-thu.php" class="btn btn-sm btn-light py-0 px-2 text-dark">✕ Đóng</a>
    </div>
    <div class="card-body p-3">
        <div class="row g-3">
            <div class="col-md-6">
                <div class="info-row"><span class="info-label">Dịch vụ:</span><span class="info-val fw-bold"><?= pt_val($viewRow, 'ten') ?></span></div>
                <div class="info-row"><span class="info-label">Loại hình:</span>
                    <span class="loai-badge-<?= admin_h((string)($viewRow['loai'] ?? '')) ?>">
                        <?= pt_loai_label((string)($viewRow['loai'] ?? '')) ?>
                    </span>
                </div>
                <div class="info-row"><span class="info-label">Phí bổ sung:</span><span class="percent-badge">+ <?= pt_val($viewRow, 'phu_thu_percent') ?>%</span></div>
                <div class="info-row"><span class="info-label">Mô tả vườn:</span><span class="info-val"><?= pt_val($viewRow, 'mo_ta', '(Trống)') ?></span></div>
            </div>
            <div class="col-md-6">
                <?php if (($viewRow['loai'] ?? '') === 'dinh_ky'): ?>
                    <div class="info-row"><span class="info-label">Ngày hàng tháng:</span><span class="info-val"><?= pt_val($viewRow, 'ngay', 'Chưa chọn') ?></span></div>
                    <div class="info-row"><span class="info-label">Tháng thực hiện:</span><span class="info-val"><?= pt_val($viewRow, 'thang', 'Hàng tháng') ?></span></div>
                <?php else: ?>
                    <div class="info-row"><span class="info-label">Giờ thợ đến:</span><span class="info-val"><?= pt_val($viewRow, 'gio_bat_dau', '--:--') ?></span></div>
                    <div class="info-row"><span class="info-label">Giờ hoàn tất dự kiến:</span><span class="info-val"><?= pt_val($viewRow, 'gio_ket_thuc', '--:--') ?></span></div>
                <?php endif; ?>
            </div>
        </div>
        <div class="d-flex gap-2 mt-3 justify-content-end">
            <a href="?edit_id=<?= $viewId ?>" class="btn btn-warning btn-sm shadow-sm"><i class="bi bi-pencil-square me-1"></i>Chỉnh sửa</a>
            <a href="quan-ly-phu-thu.php" class="btn btn-outline-secondary btn-sm">Quay lại</a>
        </div>
    </div>
</div>
<?php endif; ?>

<div class="card border-0 shadow-sm overflow-hidden" style="border-radius:15px;">
    <div class="card-body p-0 p-md-3">
        <?php if ($error !== ''): ?>
            <div class="alert alert-warning m-3"><?= admin_h($error) ?></div>
        <?php elseif (!$rows): ?>
            <div class="text-center py-5 text-secondary">
                <i class="bi bi-flower1 fs-1 d-block mb-2 text-success" style="opacity: 0.3;"></i>Chưa có lịch chăm sóc vườn nào được tạo.
            </div>
        <?php else: ?>

            <div class="table-responsive d-none d-md-block">
                <table class="table table-hover align-middle mb-0">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Tên Dịch Vụ</th>
                            <th>Loại Hình</th>
                            <th>Lịch Trình / Khung Giờ</th>
                            <th>Phí Thêm (%)</th>
                            <th>Ghi Chú</th>
                            <th class="text-end">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($rows as $row): ?>
                        <tr>
                            <td class="fw-semibold text-success">#<?= (int) ($row['id'] ?? 0) ?></td>
                            <td class="fw-bold text-dark"><?= pt_val($row, 'ten') ?></td>
                            <td>
                                <span class="loai-badge-<?= admin_h((string)($row['loai'] ?? '')) ?>">
                                    <?= pt_loai_label((string)($row['loai'] ?? '')) ?>
                                </span>
                            </td>
                            <td class="small">
                                <?php if (($row['loai'] ?? '') === 'dinh_ky'): ?>
                                    <i class="bi bi-calendar-check me-1"></i>Ngày <?= pt_val($row, 'ngay', '?') ?> tháng <?= pt_val($row, 'thang', '?') ?>
                                <?php else: ?>
                                    <i class="bi bi-clock-history me-1"></i><?= pt_val($row, 'gio_bat_dau', '--') ?> - <?= pt_val($row, 'gio_ket_thuc', '--') ?>
                                <?php endif; ?>
                            </td>
                            <td><span class="percent-badge"><?= pt_val($row, 'phu_thu_percent') ?>%</span></td>
                            <td class="text-secondary small italic">"<?= pt_val($row, 'mo_ta', '...') ?>"</td>
                            <td class="text-end">
                                <div class="action-buttons">
                                    <a href="?view_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-success" title="Xem chi tiết">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                    <a href="?edit_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-warning" title="Sửa">
                                        <i class="bi bi-pencil-square"></i>
                                    </a>
                                    <form method="post" action="xu-ly-phu-thu.php" class="d-inline" style="margin:0;"
                                        onsubmit="return confirm('Bạn chắc chắn muốn hủy dịch vụ này?');">
                                        <input type="hidden" name="action" value="xoa">
                                        <input type="hidden" name="id" value="<?= (int)($row['id'] ?? 0) ?>">
                                        <button type="submit" class="btn btn-sm btn-outline-danger" title="Xóa lịch">
                                            <i class="bi bi-trash"></i>
                                        </button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <div class="d-md-none p-2">
                <?php foreach ($rows as $row): ?>
                <div class="pt-mobile-card">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div>
                            <span class="fw-bold text-success me-1">#<?= (int)($row['id'] ?? 0) ?></span>
                            <span class="fw-bold"><?= pt_val($row, 'ten') ?></span>
                        </div>
                        <span class="loai-badge-<?= admin_h((string)($row['loai'] ?? '')) ?>">
                            <?= pt_loai_label((string)($row['loai'] ?? '')) ?>
                        </span>
                    </div>
                    <div class="small text-secondary mb-2">
                        <?php if (($row['loai'] ?? '') === 'dinh_ky'): ?>
                            Lịch: Ngày <?= pt_val($row, 'ngay', '?') ?>/<?= pt_val($row, 'thang', '?') ?>
                        <?php else: ?>
                            Giờ: <?= pt_val($row, 'gio_bat_dau', '--') ?> → <?= pt_val($row, 'gio_ket_thuc', '--') ?>
                        <?php endif; ?>
                        &nbsp;|&nbsp;<span class="fw-bold text-success">+<?= pt_val($row, 'phu_thu_percent') ?>%</span>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="?view_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-success flex-grow-1"><i class="bi bi-eye me-1"></i>Xem</a>
                        <a href="?edit_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-warning flex-grow-1"><i class="bi bi-pencil me-1"></i>Sửa</a>
                        <form method="post" action="xu-ly-phu-thu.php" style="flex:1;" onsubmit="return confirm('Xóa dịch vụ này?');">
                            <input type="hidden" name="action" value="xoa">
                            <input type="hidden" name="id" value="<?= (int)($row['id'] ?? 0) ?>">
                            <button type="submit" class="btn btn-sm btn-outline-danger w-100"><i class="bi bi-trash me-1"></i>Xóa</button>
                        </form>
                    </div>
                </div>
                <?php endforeach; ?>
            </div>

        <?php endif; ?>
    </div>
</div>

<script>
function toggleLoai(val) {
    // Logic hiển thị phần tử ẩn dựa trên sự lựa chọn
    document.getElementById('grpNgayLe').style.display = (val === 'dinh_ky') ? '' : 'none';
    document.getElementById('grpCaDem').style.display  = (val === 'dot_xuat') ? '' : 'none';
}
// Khởi tạo trạng thái form khi tải trang
(function() {
    var sel = document.getElementById('selLoai');
    if (sel) toggleLoai(sel.value);
})();
</script>

<?php admin_render_layout_end(); ?>