<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-nhan-vien.php';

/** Escape HTML output. */
function esc_edit(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));

$employeeResult = nv_get_employee_info();
if ($employeeResult['error'] === 'Chưa đăng nhập') {
    header('Location: ../login.html');
    exit;
}

$loadError = (string) ($employeeResult['error'] ?? '');
$row = $employeeResult['row'] ?? [];

$avatar = trim((string) ($row['avatartenfile'] ?? ''));
$cccdFront = trim((string) ($row['cccdmattruoctenfile'] ?? ''));
$cccdBack = trim((string) ($row['cccdmatsautenfile'] ?? ''));

if ($avatar === '') {
    $avatar = '../assets/logong.png';
}
if ($cccdFront === '') {
    $cccdFront = '../assets/logong.png';
}
if ($cccdBack === '') {
    $cccdBack = '../assets/logong.png';
}

$isDisabled = $loadError !== '';
?>
<?php
$pageTitle = "Cập nhật thông tin";
include 'layout-header.php';
?>
<style>
    /* Style gốc của trang */
    .page-wrap {
        max-width: 980px;
        margin: 0 auto;
        padding: 14px;
    }

    .edit-shell {
        border: 1px solid #dce9f7;
        border-radius: 18px;
        background: #fff;
        box-shadow: 0 18px 44px rgba(2, 32, 71, 0.12);
        overflow: hidden;
    }

    .edit-head {
        background: linear-gradient(105deg, #0f4ca8 0%, #1a73e8 72%, #31a0ff 100%);
        color: #fff;
        padding: 18px 20px;
    }

    .edit-head h1 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
    }

    .edit-sub {
        margin: 4px 0 0;
        opacity: 0.92;
        font-size: 0.92rem;
    }

    .edit-body {
        padding: 18px;
    }

    .form-box {
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        background: #fff;
        padding: 16px;
    }

    .form-label {
        font-weight: 600;
    }

    .form-control {
        border-radius: 10px;
        min-height: 42px;
    }

    .tip {
        border-radius: 10px;
        border: 1px dashed #cbd5e1;
        background: #f8fbff;
        padding: 10px 12px;
        color: #334155;
        font-size: 0.92rem;
    }

    .preview-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 14px;
    }

    .preview-card {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 10px;
        background: #f8fafc;
    }

    .preview-card img {
        width: 100%;
        height: 120px;
        object-fit: cover;
        border: 1px solid #dbe3ef;
        border-radius: 10px;
        background: #fff;
    }

    .path-text {
        font-size: 0.76rem;
        color: #64748b;
        word-break: break-all;
        margin-top: 6px;
    }

    .btn-soft {
        border-radius: 10px;
        min-height: 42px;
        font-weight: 600;
        padding: 8px 14px;
    }

    @media (max-width: 991.98px) {
        .page-wrap { padding: 1px; }
        .edit-shell { margin: 1px; border-radius: 12px; }
        .edit-head { padding: 12px 10px; }
        .edit-body { padding: 4px 1px; }
        .form-box { padding: 8px 4px; }
        .preview-grid { grid-template-columns: 1fr; gap: 5px; }
        .preview-card { padding: 4px; }
        .row { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
        .mt-4 { margin-top: 0.5rem !important; }
        .g-3 { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
    }
</style>
<style>
    /* Theme color overrides */
    body {
        background: linear-gradient(180deg, #f1f8f1 0%, #e8f5e9 100%);
        color: #2e7d32;
    }

    .edit-shell {
        border-color: #c8e6c9;
        border-radius: 18px;
        background: #f1f8f1;
        box-shadow: 0 18px 44px rgba(46, 125, 50, 0.16);
    }

    .edit-head {
        background: linear-gradient(105deg, #1b5e20 0%, #2e7d32 72%, #66bb6a 100%);
        border-bottom: 1px solid #c8e6c9;
    }

    .form-box {
        border-color: #c8e6c9;
        border-radius: 14px;
        background: #fff;
        box-shadow: 0 10px 22px rgba(46, 125, 50, 0.1);
    }

    .form-label {
        color: #1b5e20;
    }

    .form-control {
        border-color: #c8e6c9;
        background: #f1f8f1;
        color: #1b5e20;
    }

    .form-control:focus {
        border-color: #4caf50;
        box-shadow: 0 0 0 0.2rem rgba(76, 175, 80, 0.2);
    }

    .tip {
        border-color: #c8e6c9;
        background: #e8f5e9;
        color: #1b5e20;
    }

    .preview-card {
        border-color: #c8e6c9;
        background: #f1f8f1;
        box-shadow: 0 8px 18px rgba(46, 125, 50, 0.09);
    }

    .preview-card img {
        border-color: #c8e6c9;
        box-shadow: 0 8px 16px rgba(46, 125, 50, 0.12);
    }

    .path-text { color: #388e3c; }

    .btn-primary {
        border-color: #81c784;
        background: linear-gradient(135deg, #66bb6a, #2e7d32);
        box-shadow: 0 8px 18px rgba(46, 125, 50, 0.24);
    }

    .btn-primary:hover,
    .btn-primary:focus {
        border-color: #4caf50;
        background: linear-gradient(135deg, #4caf50, #1b5e20);
    }

    .btn-outline-secondary {
        color: #2e7d32;
        border-color: #c8e6c9;
        background: #f1f8f1;
    }

    .btn-outline-secondary:hover,
    .btn-outline-secondary:focus {
        color: #fff;
        border-color: #1b5e20;
        background: #1b5e20;
    }

    .alert-success {
        color: #1b5e20;
        background: #e8f5e9;
        border-color: #81c784;
        box-shadow: 0 8px 16px rgba(46, 125, 50, 0.08);
    }

    .alert-warning {
        color: #1b5e20;
        background: #e8f5e9;
        border-color: #c8e6c9;
        box-shadow: 0 8px 16px rgba(46, 125, 50, 0.08);
    }

    .alert-danger {
        color: #1b5e20;
        background: #e8f5e9;
        border-color: #c8e6c9;
        box-shadow: 0 8px 16px rgba(46, 125, 50, 0.1);
    }
    
    /* Phục hồi giao diện desktop cho iPad (768px - 991px) */
    @media (min-width: 768px) and (max-width: 991.98px) {
        .page-wrap { padding: 14px; }
        .edit-shell { margin: 0; border-radius: 18px; }
        .edit-head { padding: 18px 20px; }
        .edit-body { padding: 18px; }
        .form-box { padding: 16px; }
        .preview-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .preview-card { padding: 10px; }
        
        /* Khôi phục khoảng cách (gutters) */
        .edit-body .row { --bs-gutter-x: 1.5rem !important; }
        .edit-body .g-3 { --bs-gutter-x: 1rem !important; --bs-gutter-y: 1rem !important; }
        .mt-4 { margin-top: 1.5rem !important; }
    }
</style>

<div class="page-wrap">
    <?php if ($flashMsg !== ''): ?>
        <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2" role="alert">
            <?= esc_edit($flashMsg) ?>
        </div>
    <?php endif; ?>

    <?php if ($loadError !== ''): ?>
        <div class="alert alert-danger py-2" role="alert"><?= esc_edit($loadError) ?></div>
    <?php endif; ?>

    <section class="edit-shell">
        <div class="edit-head">
            <h1><i class="bi bi-pencil-square me-2"></i>Cập Nhật Thông Tin Tài Khoản</h1>
        </div>
        <div class="edit-body">
            <form class="form-box" method="post" action="xu-ly-sua-thong-tin-nhan-vien.php"
                enctype="multipart/form-data">
                <input type="hidden" name="existing_anh_dai_dien"
                    value="<?= esc_edit((string) ($row['avatartenfile'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_truoc"
                    value="<?= esc_edit((string) ($row['cccdmattruoctenfile'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_sau"
                    value="<?= esc_edit((string) ($row['cccdmatsautenfile'] ?? '')) ?>">

                <div class="row g-3">
                    <div class="col-12 col-md-6">
                        <label for="hovaten" class="form-label">Họ và tên *</label>
                        <input type="text" class="form-control" id="hovaten" name="hovaten" maxlength="120" required
                            value="<?= esc_edit((string) ($row['hovaten'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="sodienthoai" class="form-label">Số điện thoại *</label>
                        <input type="text" class="form-control" id="sodienthoai" name="sodienthoai" maxlength="20"
                            required value="<?= esc_edit((string) ($row['sodienthoai'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="email" class="form-label">Email *</label>
                        <input type="email" class="form-control" id="email" name="email" maxlength="150" required
                            value="<?= esc_edit((string) ($row['email'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="matkhau" class="form-label">Mật khẩu *</label>
                        <input type="text" class="form-control" id="matkhau" name="matkhau" minlength="6"
                            maxlength="255" required value="<?= esc_edit((string) ($row['matkhau'] ?? '')) ?>"
                            <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12">
                        <label for="diachi" class="form-label">Địa chỉ *</label>
                        <input type="text" class="form-control" id="diachi" name="diachi" maxlength="255" required
                            value="<?= esc_edit((string) ($row['diachi'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    

                    <div class="col-12">
                        <div class="card border-0 shadow-sm"
                            style="border-radius: 12px; background: #f8fbff; border: 1px solid #e1e9f1 !important;">
                            <div class="card-header bg-transparent border-0 d-flex align-items-center py-3">
                                <i class="bi bi-briefcase text-primary me-2"></i>
                                <h6 class="mb-0 fw-bold">Chọn các dịch vụ bạn cung cấp</h6>
                            </div>
                            <div class="card-body pt-0">
                                <div class="row g-2">
                                    <?php
                                    $currentServiceIds = explode(',', (string) ($row['id_dichvu'] ?? ''));
                                    $serviceMap = nv_get_service_map();
                                    foreach ($serviceMap as $id => $srv):
                                        $isChecked = in_array((string) $id, $currentServiceIds);
                                        ?>
                                        <div class="col-12 col-sm-6 col-lg-4">
                                            <div class="service-item d-flex align-items-center p-2 border rounded-3 bg-white h-100"
                                                style="transition: all 0.2s;">
                                                <div class="srv-icon d-flex align-items-center justify-content-center rounded-3 me-2"
                                                    style="width: 36px; height: 36px; background: <?= $srv['color'] ?>15; color: <?= $srv['color'] ?>;">
                                                    <i class="<?= $srv['icon'] ?> small"></i>
                                                </div>
                                                <div class="flex-grow-1 small fw-semibold text-truncate">
                                                    <?= $srv['name'] ?>
                                                </div>
                                                <div class="form-check m-0 px-2">
                                                    <input class="form-check-input" type="checkbox" name="services[]"
                                                        value="<?= $id ?>" id="srv-<?= $id ?>" <?= $isChecked ? 'checked' : '' ?>>
                                                </div>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="col-12 col-md-4">
                        <label for="anh_dai_dien" class="form-label">Ảnh đại diện mới</label>
                        <input type="file" class="form-control" id="anh_dai_dien" name="anh_dai_dien"
                            accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="cccd_mat_truoc" class="form-label">CCCD mặt trước mới</label>
                        <input type="file" class="form-control" id="cccd_mat_truoc" name="cccd_mat_truoc"
                            accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="cccd_mat_sau" class="form-label">CCCD mặt sau mới</label>
                        <input type="file" class="form-control" id="cccd_mat_sau" name="cccd_mat_sau"
                            accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                </div>

                <div class="preview-grid">
                    <div class="preview-card">
                        <div class="small fw-semibold">Ảnh đại diện hiện tại</div>
                        <img src="../assets/<?= esc_edit($avatar) ?>" alt="anh dai dien">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mặt trước hiện tại</div>
                        <img src="../assets/<?= esc_edit($cccdFront) ?>" alt="cccd mat truoc">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mặt sau hiện tại</div>
                        <img src="../assets/<?= esc_edit($cccdBack) ?>" alt="cccd mat sau">
                    </div>
                </div>

                <div class="d-flex flex-wrap gap-2 mt-4">
                    <button type="submit" class="btn btn-primary btn-soft" <?= $isDisabled ? 'disabled' : '' ?>>
                        <i class="bi bi-check2-circle me-1"></i> Lưu thay đổi
                    </button>
                    <a class="btn btn-outline-secondary btn-soft" href="thong-tin-nhan-vien.php"
                       onclick="event.preventDefault(); navigateTo('thong-tin-nhan-vien.php');">
                        <i class="bi bi-arrow-left me-1"></i> Quay lại
                    </a>
                </div>
            </form>
        </div>
    </section>
</div>
<?php include 'layout-footer.php'; ?>