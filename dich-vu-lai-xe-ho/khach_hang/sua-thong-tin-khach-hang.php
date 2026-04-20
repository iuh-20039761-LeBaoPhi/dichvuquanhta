<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/get-khach-hang.php';

/** Escape HTML output. */
function esc_edit(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$sessionUser = session_user_require_customer('../login.html', 'khach_hang/sua-thong-tin-khach-hang.php');
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

$load = getKhachHangBySessionId($sessionUser['id'] ?? 0);
$customerData = is_array($load['data'] ?? null) ? $load['data'] : [];
$loadError = (string)($load['error'] ?? '');

$isDisabled = $loadError !== '';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sửa Thông Tin Khách Hàng - Thuê Tài Xế</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <?php render_khach_hang_header_styles(); ?>
    <style>
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: linear-gradient(180deg, #edf4ff 0%, #f4f9ff 100%);
            color: #0f172a;
            min-height: 100vh;
        }
        .page-wrap {
            max-width: 980px;
            margin: 0 auto;
            padding: 14px;
        }
        .edit-shell {
            border: 1px solid #dce9f7;
            border-radius: 18px;
            background: #fff;
            box-shadow: 0 18px 44px rgba(0, 123, 255, 0.12);
            overflow: hidden;
        }
        .edit-head {
            background: linear-gradient(105deg, #007bff 0%, #00b4d8 100%);
            color: #fff;
            padding: 18px 20px;
        }
        .edit-head h1 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 800;
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
        .action-buttons {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 16px;
        }
        .action-buttons .btn-soft {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        @media (max-width: 991.98px) {
            .preview-grid {
                grid-template-columns: 1fr;
            }
        }
        @media (max-width: 575.98px) {
            .action-buttons {
                flex-wrap: nowrap;
            }
            .action-buttons .btn-soft {
                flex: 1 1 0;
                min-width: 0;
                min-height: 44px;
                padding: 8px 10px;
                font-size: 0.92rem;
                white-space: nowrap;
            }
        }
    </style>
    <style>
        body {
            background: linear-gradient(180deg, #e8f4ff 0%, #f0f8ff 100%);
            color: #2c5282;
        }

        .edit-shell {
            border-color: #bbdef5;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 18px 44px rgba(0, 123, 255, 0.16);
        }

        .edit-head {
            background: linear-gradient(105deg, #007bff 0%, #00b4d8 100%);
            border-bottom: 1px solid #bbdef5;
        }

        .form-box {
            border-color: #bbdef5;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 10px 22px rgba(0, 123, 255, 0.1);
        }

        .form-label {
            color: #1a5d9c;
        }

        .form-control {
            border-color: #bbdef5;
            background: #ffffff;
            color: #2c5282;
        }

        .form-control:focus {
            border-color: #64b5f6;
            box-shadow: 0 0 0 0.2rem rgba(33, 150, 243, 0.2);
        }

        .tip {
            border-color: #bbdef5;
            background: #f5faff;
            color: #4a7fb5;
        }

        .preview-card {
            border-color: #bbdef5;
            background: #f8fcff;
            box-shadow: 0 8px 18px rgba(0, 123, 255, 0.09);
        }

        .preview-card img {
            border-color: #bbdef5;
            box-shadow: 0 8px 16px rgba(0, 123, 255, 0.12);
        }

        .path-text {
            color: #5a7fb5;
        }

        .btn-primary {
            border-color: #90caf9;
            background: linear-gradient(135deg, #42a5f5, #1e88e5);
            box-shadow: 0 8px 18px rgba(30, 136, 229, 0.24);
        }

        .btn-primary:hover,
        .btn-primary:focus {
            border-color: #64b5f6;
            background: linear-gradient(135deg, #2196f3, #1976d2);
        }

        .btn-outline-secondary {
            color: #1e88e5;
            border-color: #90caf9;
            background: #f5faff;
        }

        .btn-outline-secondary:hover,
        .btn-outline-secondary:focus {
            color: #fff;
            border-color: #1e88e5;
            background: #1e88e5;
        }

        .alert-success {
            color: #1f6148;
            background: #e9f8f1;
            border-color: #9dd9be;
            box-shadow: 0 8px 16px rgba(31, 97, 72, 0.08);
        }

        .alert-warning {
            color: #856404;
            background: #fff3cd;
            border-color: #ffeeba;
            box-shadow: 0 8px 16px rgba(133, 100, 4, 0.08);
        }

        .alert-danger {
            color: #721c24;
            background: #f8d7da;
            border-color: #f5c6cb;
            box-shadow: 0 8px 16px rgba(114, 28, 36, 0.1);
        }
    </style>
</head>
<body>
<?php render_khach_hang_header($sessionUser, 'Sửa thông tin khách hàng', 'profile'); ?>
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
            <h1><i class="bi bi-pencil-square me-2"></i>Cập nhật thông tin cá nhân</h1>
            <div class="edit-sub">Cập nhật thông tin để nhận nhiều ưu đãi hơn</div>
        </div>
        <div class="edit-body">
            <form class="form-box" method="post" action="xu-ly-sua-thong-tin-khach-hang.php" enctype="multipart/form-data">
                <input type="hidden" name="existing_anh_dai_dien" value="<?= esc_edit((string)($customerData['avatar_path'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_truoc" value="<?= esc_edit((string)($customerData['cccd_front_path'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_sau" value="<?= esc_edit((string)($customerData['cccd_back_path'] ?? '')) ?>">

                <div class="row g-3">
                    <div class="col-12 col-md-6">
                        <label for="hovaten" class="form-label">Họ và tên <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="hovaten" name="hovaten" maxlength="120" required value="<?= esc_edit((string)($customerData['full_name'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="sodienthoai" class="form-label">Số điện thoại <span class="text-danger">*</span></label>
                        <input type="tel" class="form-control" id="sodienthoai" name="sodienthoai" maxlength="20" required value="<?= esc_edit((string)($customerData['phone'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="email" class="form-label">Email <span class="text-danger">*</span></label>
                        <input type="email" class="form-control" id="email" name="email" maxlength="150" required value="<?= esc_edit((string)($customerData['email'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12">
                        <label for="diachi" class="form-label">Địa chỉ <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="diachi" name="diachi" maxlength="255" required value="<?= esc_edit((string)($customerData['address'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="matkhau" class="form-label">Mật khẩu <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" id="matkhau" name="matkhau" minlength="6" maxlength="255" required value="<?= esc_edit((string)($customerData['password'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                        <div class="form-text text-muted">Mật khẩu tối thiểu 6 ký tự</div>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="ngaysinh" class="form-label">Ngày sinh <span class="text-danger">*</span></label>
                        <input type="date" class="form-control" id="ngaysinh" name="ngaysinh" required value="<?= esc_edit((string)($customerData['birth_date'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="anh_dai_dien" class="form-label">Ảnh đại diện mới</label>
                        <input type="file" class="form-control" id="anh_dai_dien" name="anh_dai_dien" accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                        <div class="form-text text-muted">Chọn ảnh mới để thay đổi (PNG, JPG, JPEG)</div>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="cccd_mat_truoc" class="form-label">CCCD mặt trước mới</label>
                        <input type="file" class="form-control" id="cccd_mat_truoc" name="cccd_mat_truoc" accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="cccd_mat_sau" class="form-label">CCCD mặt sau mới</label>
                        <input type="file" class="form-control" id="cccd_mat_sau" name="cccd_mat_sau" accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                </div>

                <div class="preview-grid">
                    <div class="preview-card">
                        <div class="small fw-semibold">Ảnh đại diện hiện tại</div>
                        <img src="<?= esc_edit((string)($customerData['avatar_url'] ?? '../assets/logo_main.png')) ?>" alt="Ảnh đại diện">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mặt trước hiện tại</div>
                        <img src="<?= esc_edit((string)($customerData['cccd_front_url'] ?? '../assets/logo_main.png')) ?>" alt="CCCD mặt trước">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mặt sau hiện tại</div>
                        <img src="<?= esc_edit((string)($customerData['cccd_back_url'] ?? '../assets/logo_main.png')) ?>" alt="CCCD mặt sau">
                    </div>
                </div>

                <div class="action-buttons">
                    <button type="submit" class="btn btn-primary btn-soft" <?= $isDisabled ? 'disabled' : '' ?>>
                        <i class="bi bi-check2-circle me-1"></i> Lưu thay đổi
                    </button>
                    <a class="btn btn-outline-secondary btn-soft" href="thong-tin-khach-hang.php">
                        <i class="bi bi-arrow-left me-1"></i> Quay lại
                    </a>
                </div>
            </form>
        </div>
    </section>
</div>
<?php render_khach_hang_layout_end(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>