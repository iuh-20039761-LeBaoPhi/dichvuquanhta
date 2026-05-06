<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/admin_api_common.php';

$admin = admin_require_login();

// Lấy danh sách phụ thu
$data  = admin_api_list_table('phu_thu_dac_biet');
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
    return $loai === 'le' ? 'Ngày lễ' : ($loai === 'dem' ? 'Ca đêm' : $loai);
}

admin_render_layout_start('Quản Lý Phụ Thu', 'phu_thu', $admin);
?>

<style>
    .admin-main, .admin-main > main { background: var(--white) !important; }

    .pt-page-header {
        display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
        gap: 12px; margin-bottom: 20px;
        background: #fff; padding: 20px 24px; border-radius: 20px;
        border: 1px solid var(--border); box-shadow: 0 2px 8px rgba(26,77,46,.05);
    }
    .pt-page-header h2 { font-family: 'Playfair Display', serif; color: var(--pg); font-size: 1.4rem; font-weight: 700; margin: 0; }

    table th { white-space: nowrap !important; vertical-align: middle !important; }
    table td { vertical-align: middle !important; }
    .action-buttons { display: flex; gap: .4rem; justify-content: flex-end; align-items: center; }
    .action-buttons .btn { min-width: 34px; padding: .3rem .5rem; display: flex; align-items: center; justify-content: center; border-radius: 10px; }

    .pt-form-card { border-left: 4px solid var(--accent) !important; }
    .pt-view-card { border-left: 4px solid var(--pg) !important; }

    .form-label { font-weight: 700; color: var(--pg); font-size: .82rem; text-transform: uppercase; letter-spacing: .4px; margin-bottom: 3px; }

    .loai-badge-le  { background: var(--lime); color: var(--pg); border-radius: 20px; padding: 3px 10px; font-size: .82rem; font-weight: 700; }
    .loai-badge-dem { background: #f1f8e9; color: #33691e; border-radius: 20px; padding: 3px 10px; font-size: .82rem; font-weight: 700; }

    .info-row { display: flex; gap: 8px; align-items: baseline; margin-bottom: 6px; }
    .info-label { font-weight: 700; color: var(--pg); min-width: 130px; font-size: .85rem; }
    .info-val { color: var(--text); font-size: .9rem; }

    .view-modal-header { background: linear-gradient(90deg, var(--sidebar-b), var(--pg)); color: #fff; border-radius: 14px 14px 0 0; padding: 14px 18px; }

    .percent-badge { background: var(--lime); border: 1px solid var(--border); color: var(--pg); font-weight: 700; border-radius: 20px; padding: 3px 12px; font-size: .9rem; }

    .table thead th { background: var(--lime); color: var(--pg); font-weight: 700; text-transform: uppercase; font-size: .72rem; letter-spacing: .8px; padding: 12px 14px; border-bottom: 1px solid var(--border); }
    .table tbody td { padding: 12px 14px; border-color: #f0f4f0; }
    .table-hover tbody tr:hover { background: #f9fdf9; }

    @media(max-width: 767px) {
        .pt-mobile-card { background: #fff; border-radius: 14px; border: 1px solid var(--border); padding: 14px; margin-bottom: 10px; box-shadow: 0 2px 6px rgba(26,77,46,.06); }
    }
</style>

<div class="pt-page-header">
    <h2 class="h4 mb-0 fw-bold">Quản lý Phụ phí Đặc Biệt</h2>
    <?php if (!$showForm): ?>
        <a href="?them=1" class="btn btn-primary"><i class="bi bi-plus-circle me-1"></i>Thêm phụ thu</a>
    <?php else: ?>
        <a href="quan-ly-phu-thu.php" class="btn btn-outline-secondary btn-sm"><i class="bi bi-arrow-left me-1"></i>Quay lại</a>
    <?php endif; ?>
</div>

<?php if ($flashMsg !== ''): ?>
    <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2 mb-3"><?= admin_h($flashMsg) ?></div>
<?php endif; ?>

<!-- ===================== FORM THÊM / SỬA ===================== -->
<?php if ($showForm): ?>
<div class="card border-0 shadow-sm pt-form-card mb-4">
    <div class="card-header bg-white py-2 border-bottom">
        <h6 class="mb-0 fw-bold">
            <i class="bi bi-<?= $editId > 0 ? 'pencil-square text-warning' : 'plus-circle-fill text-success' ?> me-2"></i>
            <?= $editId > 0 ? 'Chỉnh sửa Phụ phí #' . $editId : 'Thêm Phụ phí mới' ?>
        </h6>
    </div>
    <div class="card-body p-3">
        <form method="post" action="xu-ly-phu-thu.php" id="formPhuThu">
            <input type="hidden" name="action" value="<?= $editId > 0 ? 'sua' : 'them' ?>">
            <?php if ($editId > 0): ?>
                <input type="hidden" name="id" value="<?= $editId ?>">
            <?php endif; ?>

            <div class="row g-3">
                <!-- Tên -->
                <div class="col-md-5">
                    <label class="form-label">Tên <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="ten" required
                        value="<?= pt_val($editRow, 'ten') ?>" placeholder="VD: Quốc khánh, Ca đêm...">
                </div>

                <!-- Loại -->
                <div class="col-md-3">
                    <label class="form-label">Loại <span class="text-danger">*</span></label>
                    <select class="form-select" name="loai" id="selLoai" onchange="toggleLoai(this.value)">
                        <option value="le"  <?= ($editRow['loai'] ?? 'le') === 'le'  ? 'selected' : '' ?>>Ngày lễ</option>
                        <option value="dem" <?= ($editRow['loai'] ?? '') === 'dem' ? 'selected' : '' ?>>Ca đêm</option>
                    </select>
                </div>

                <!-- % Phụ phí -->
                <div class="col-md-2">
                    <label class="form-label">Phụ phí (%)</label>
                    <input type="number" class="form-control" name="phu_thu_percent" min="0" step="0.01"
                        value="<?= pt_val($editRow, 'phu_thu_percent', '0') ?>">
                </div>

                <!-- Mô tả -->
                <div class="col-md-2">
                    <label class="form-label">Mô tả</label>
                    <input type="text" class="form-control" name="mo_ta"
                        value="<?= pt_val($editRow, 'mo_ta') ?>" placeholder="Ghi chú...">
                </div>

                <!-- Nhóm Ngày lễ -->
                <div class="col-12" id="grpNgayLe" style="display:none;">
                    <div class="row g-2">
                        <div class="col-md-2">
                            <label class="form-label">Ngày</label>
                            <input type="number" class="form-control" name="ngay" min="1" max="31"
                                value="<?= pt_val($editRow, 'ngay') ?>" placeholder="VD: 2">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Tháng</label>
                            <input type="number" class="form-control" name="thang" min="1" max="12"
                                value="<?= pt_val($editRow, 'thang') ?>" placeholder="VD: 9">
                        </div>
                        <div class="col-md-2">
                            <label class="form-label">Năm (tùy chọn)</label>
                            <input type="number" class="form-control" name="nam" min="2000" max="2100"
                                value="<?= pt_val($editRow, 'nam') ?>" placeholder="NULL = mọi năm">
                        </div>
                    </div>
                </div>

                <!-- Nhóm Ca đêm -->
                <div class="col-12" id="grpCaDem" style="display:none;">
                    <div class="row g-2">
                        <div class="col-md-3">
                            <label class="form-label">Giờ bắt đầu</label>
                            <input type="time" class="form-control" name="gio_bat_dau"
                                value="<?= pt_val($editRow, 'gio_bat_dau') ?>">
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Giờ kết thúc</label>
                            <input type="time" class="form-control" name="gio_ket_thuc"
                                value="<?= pt_val($editRow, 'gio_ket_thuc') ?>">
                        </div>
                    </div>
                </div>
            </div>

            <div class="d-flex gap-2 mt-3 justify-content-end">
                <a href="quan-ly-phu-thu.php" class="btn btn-light border">Hủy</a>
                <button type="submit" class="btn btn-<?= $editId > 0 ? 'warning' : 'success' ?> px-4 fw-bold">
                    <i class="bi bi-<?= $editId > 0 ? 'check2-circle' : 'plus-circle-fill' ?> me-1"></i>
                    <?= $editId > 0 ? 'Cập nhật' : 'Lưu phụ thu' ?>
                </button>
            </div>
        </form>
    </div>
</div>
<?php endif; ?>

<!-- ===================== MODAL XEM CHI TIẾT ===================== -->
<?php if ($viewId > 0 && !empty($viewRow)): ?>
<div class="card border-0 shadow-sm pt-view-card mb-4">
    <div class="view-modal-header d-flex justify-content-between align-items-center">
        <span class="fw-bold fs-6"><i class="bi bi-eye-fill me-2"></i>Chi tiết Phụ phí #<?= $viewId ?></span>
        <a href="quan-ly-phu-thu.php" class="btn btn-sm btn-light py-0 px-2">✕ Đóng</a>
    </div>
    <div class="card-body p-3">
        <div class="row g-3">
            <div class="col-md-6">
                <div class="info-row"><span class="info-label">Tên:</span><span class="info-val fw-bold"><?= pt_val($viewRow, 'ten') ?></span></div>
                <div class="info-row"><span class="info-label">Loại:</span>
                    <span class="loai-badge-<?= admin_h((string)($viewRow['loai'] ?? '')) ?>">
                        <?= pt_loai_label((string)($viewRow['loai'] ?? '')) ?>
                    </span>
                </div>
                <div class="info-row"><span class="info-label">Phụ thu:</span><span class="percent-badge"><?= pt_val($viewRow, 'phu_thu_percent') ?>%</span></div>
                <div class="info-row"><span class="info-label">Mô tả:</span><span class="info-val"><?= pt_val($viewRow, 'mo_ta', '(Không có)') ?></span></div>
            </div>
            <div class="col-md-6">
                <?php if (($viewRow['loai'] ?? '') === 'le'): ?>
                    <div class="info-row"><span class="info-label">Ngày:</span><span class="info-val"><?= pt_val($viewRow, 'ngay', 'NULL') ?></span></div>
                    <div class="info-row"><span class="info-label">Tháng:</span><span class="info-val"><?= pt_val($viewRow, 'thang', 'NULL') ?></span></div>
                    <div class="info-row"><span class="info-label">Năm:</span><span class="info-val"><?= pt_val($viewRow, 'nam', 'NULL (mọi năm)') ?></span></div>
                <?php else: ?>
                    <div class="info-row"><span class="info-label">Giờ bắt đầu:</span><span class="info-val"><?= pt_val($viewRow, 'gio_bat_dau', 'NULL') ?></span></div>
                    <div class="info-row"><span class="info-label">Giờ kết thúc:</span><span class="info-val"><?= pt_val($viewRow, 'gio_ket_thuc', 'NULL') ?></span></div>
                <?php endif; ?>
            </div>
        </div>
        <div class="d-flex gap-2 mt-3 justify-content-end">
            <a href="?edit_id=<?= $viewId ?>" class="btn btn-warning btn-sm"><i class="bi bi-pencil-square me-1"></i>Sửa</a>
            <a href="quan-ly-phu-thu.php" class="btn btn-outline-secondary btn-sm">Đóng</a>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- ===================== BẢNG DANH SÁCH ===================== -->
<div class="card border-0 shadow-sm">
    <div class="card-body p-0 p-md-3">
        <?php if ($error !== ''): ?>
            <div class="alert alert-warning m-3"><?= admin_h($error) ?></div>
        <?php elseif (!$rows): ?>
            <div class="text-center py-5 text-secondary">
                <i class="bi bi-inbox fs-2 d-block mb-2"></i>Chưa có Phụ phí nào.
            </div>
        <?php else: ?>

            <!-- Desktop table -->
            <div class="table-responsive d-none d-md-block">
                <table class="table table-hover align-middle mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>ID</th>
                            <th>Tên</th>
                            <th>Loại</th>
                            <th>Ngày/Giờ áp dụng</th>
                            <th>Phụ phí (%)</th>
                            <th>Mô tả</th>
                            <th class="text-end">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($rows as $row): ?>
                        <tr>
                            <td class="fw-semibold text-primary">#<?= (int) ($row['id'] ?? 0) ?></td>
                            <td class="fw-semibold"><?= pt_val($row, 'ten') ?></td>
                            <td>
                                <span class="loai-badge-<?= admin_h((string)($row['loai'] ?? '')) ?>">
                                    <?= pt_loai_label((string)($row['loai'] ?? '')) ?>
                                </span>
                            </td>
                            <td class="small text-secondary">
                                <?php if (($row['loai'] ?? '') === 'le'): ?>
                                    Ngày <?= pt_val($row, 'ngay', '?') ?>/<?= pt_val($row, 'thang', '?') ?>
                                    <?= ($row['nam'] ?? '') ? '/' . pt_val($row, 'nam') : '' ?>
                                <?php else: ?>
                                    <?= pt_val($row, 'gio_bat_dau', '--') ?> → <?= pt_val($row, 'gio_ket_thuc', '--') ?>
                                <?php endif; ?>
                            </td>
                            <td><span class="percent-badge"><?= pt_val($row, 'phu_thu_percent') ?>%</span></td>
                            <td class="text-secondary small"><?= pt_val($row, 'mo_ta', '—') ?></td>
                            <td class="text-end">
                                <div class="action-buttons">
                                    <a href="?view_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-primary" title="Xem">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                    <a href="?edit_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-warning" title="Sửa">
                                        <i class="bi bi-pencil-square"></i>
                                    </a>
                                    <form method="post" action="xu-ly-phu-thu.php" class="d-inline" style="margin:0;"
                                        onsubmit="return showConfirmDelete(this);">
                                        <input type="hidden" name="action" value="xoa">
                                        <input type="hidden" name="id" value="<?= (int)($row['id'] ?? 0) ?>">
                                        <button type="submit" class="btn btn-sm btn-outline-danger" title="Xóa">
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

            <!-- Mobile cards -->
            <div class="d-md-none p-2">
                <?php foreach ($rows as $row): ?>
                <div class="pt-mobile-card">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <div>
                            <span class="fw-bold text-primary me-1">#<?= (int)($row['id'] ?? 0) ?></span>
                            <span class="fw-semibold"><?= pt_val($row, 'ten') ?></span>
                        </div>
                        <span class="loai-badge-<?= admin_h((string)($row['loai'] ?? '')) ?>">
                            <?= pt_loai_label((string)($row['loai'] ?? '')) ?>
                        </span>
                    </div>
                    <div class="small text-secondary mb-2">
                        <?php if (($row['loai'] ?? '') === 'le'): ?>
                            Ngày <?= pt_val($row, 'ngay', '?') ?>/<?= pt_val($row, 'thang', '?') ?>
                            <?= ($row['nam'] ?? '') ? '/' . pt_val($row, 'nam') : '' ?>
                        <?php else: ?>
                            <?= pt_val($row, 'gio_bat_dau', '--') ?> → <?= pt_val($row, 'gio_ket_thuc', '--') ?>
                        <?php endif; ?>
                        &nbsp;|&nbsp;<span class="percent-badge"><?= pt_val($row, 'phu_thu_percent') ?>%</span>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="?view_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-primary flex-grow-1"><i class="bi bi-eye me-1"></i>Xem</a>
                        <a href="?edit_id=<?= (int)($row['id'] ?? 0) ?>" class="btn btn-sm btn-outline-warning flex-grow-1"><i class="bi bi-pencil me-1"></i>Sửa</a>
                        <form method="post" action="xu-ly-phu-thu.php" style="flex:1;" onsubmit="return showConfirmDelete(this);">
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

<div id="confirmOverlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:9999; justify-content:center; align-items:center;">
    <div style="background:#fff; padding:24px; border-radius:12px; box-shadow:0 10px 40px rgba(0,0,0,0.2); max-width:380px; width:90%; text-align:center;">
        <div style="width:60px; height:60px; background:#fff1f2; color:#c62828; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:30px; margin-bottom:16px;">
            <i class="bi bi-exclamation-triangle"></i>
        </div>
        <h5 style="margin-bottom:8px; color:#1f2937; font-weight:700;">Xác nhận xóa</h5>
        <p style="color:#6b7280; margin-bottom:24px; font-size:0.95rem;">Bạn có chắc chắn muốn xóa Phụ phí này không? Hành động này không thể hoàn tác.</p>
        <div style="display:flex; gap:12px;">
            <button type="button" class="btn btn-light" onclick="closeConfirm()" style="flex:1; border:1px solid #e5e7eb; font-weight:600; padding:10px;">Hủy</button>
            <button type="button" class="btn btn-danger" onclick="doConfirm()" style="flex:1; background:#c62828; border:none; font-weight:600; padding:10px;">Xác nhận xóa</button>
        </div>
    </div>
</div>

<script>
function toggleLoai(val) {
    document.getElementById('grpNgayLe').style.display = (val === 'le') ? '' : 'none';
    document.getElementById('grpCaDem').style.display  = (val === 'dem') ? '' : 'none';
}

let pendingDeleteForm = null;
function showConfirmDelete(form) {
    pendingDeleteForm = form;
    document.getElementById('confirmOverlay').style.display = 'flex';
    return false;
}
function closeConfirm() {
    document.getElementById('confirmOverlay').style.display = 'none';
    pendingDeleteForm = null;
}
function doConfirm() {
    if (pendingDeleteForm) pendingDeleteForm.submit();
    closeConfirm();
}

// Init on load
(function() {
    var sel = document.getElementById('selLoai');
    if (sel) toggleLoai(sel.value);
})();
</script>

<?php admin_render_layout_end(); ?>
