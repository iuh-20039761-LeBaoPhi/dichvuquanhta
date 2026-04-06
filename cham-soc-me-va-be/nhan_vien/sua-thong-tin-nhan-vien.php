<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/get-nhan-vien.php';

/** Escape HTML output. */
function esc_edit(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$sessionUser = session_user_require_employee('../login.html', 'nhan_vien/sua-thong-tin-nhan-vien.php');
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

$load = getNhanVienBySessionId($sessionUser['id'] ?? 0);
$loadError = (string)($load['error'] ?? '');
$row = is_array($load['row'] ?? null) ? $load['row'] : [];

$avatar = trim((string)($row['anh_dai_dien'] ?? ''));
$cccdFront = trim((string)($row['cccd_mat_truoc'] ?? ''));
$cccdBack = trim((string)($row['cccd_mat_sau'] ?? ''));

if ($avatar === '') {
    $avatar = '../assets/logomvb.png';
}
if ($cccdFront === '') {
    $cccdFront = '../assets/logomvb.png';
}
if ($cccdBack === '') {
    $cccdBack = '../assets/logomvb.png';
}

$isDisabled = $loadError !== '';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sua Thong Tin Nhan Vien</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <?php render_nhan_vien_header_styles(); ?>
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
        @media (max-width: 991.98px) {
            .preview-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    <style>
        body {
            background: linear-gradient(180deg, #fff4fb 0%, #ffeff8 100%);
            color: #6b3d58;
        }

        .edit-shell {
            border-color: #f1c6dc;
            border-radius: 18px;
            background: #fff9fd;
            box-shadow: 0 18px 44px rgba(156, 65, 113, 0.16);
        }

        .edit-head {
            background: linear-gradient(105deg, #c14b84 0%, #e16ca4 72%, #f39a90 100%);
            border-bottom: 1px solid #f4cade;
        }

        .form-box {
            border-color: #f0c5db;
            border-radius: 14px;
            background: #fff;
            box-shadow: 0 10px 22px rgba(156, 65, 113, 0.1);
        }

        .form-label {
            color: #7f4064;
        }

        .form-control {
            border-color: #efc5db;
            background: #fffbfd;
            color: #6f3c5d;
        }

        .form-control:focus {
            border-color: #e188b7;
            box-shadow: 0 0 0 0.2rem rgba(225, 136, 183, 0.2);
        }

        .tip {
            border-color: #efc4db;
            background: #fff3fa;
            color: #8a5376;
        }

        .preview-card {
            border-color: #f1c7dd;
            background: #fff7fc;
            box-shadow: 0 8px 18px rgba(151, 61, 107, 0.09);
        }

        .preview-card img {
            border-color: #f1c6dc;
            box-shadow: 0 8px 16px rgba(151, 61, 107, 0.12);
        }

        .path-text {
            color: #986482;
        }

        .btn-primary {
            border-color: #ef9fc7;
            background: linear-gradient(135deg, #eb76af, #cd5d94);
            box-shadow: 0 8px 18px rgba(205, 93, 148, 0.24);
        }

        .btn-primary:hover,
        .btn-primary:focus {
            border-color: #e58fb9;
            background: linear-gradient(135deg, #df66a4, #bf4f87);
        }

        .btn-outline-secondary {
            color: #8d335f;
            border-color: #ebb5d2;
            background: #fff9fc;
        }

        .btn-outline-secondary:hover,
        .btn-outline-secondary:focus {
            color: #fff;
            border-color: #cb5f94;
            background: #cb5f94;
        }

        .alert-success {
            color: #1f6148;
            background: #e9f8f1;
            border-color: #9dd9be;
            box-shadow: 0 8px 16px rgba(31, 97, 72, 0.08);
        }

        .alert-warning {
            color: #7d2e53;
            background: #fff1f8;
            border-color: #efbdd7;
            box-shadow: 0 8px 16px rgba(125, 46, 83, 0.08);
        }

        .alert-danger {
            color: #9b355d;
            background: #ffe8f0;
            border-color: #f4bfd2;
            box-shadow: 0 8px 16px rgba(155, 53, 93, 0.1);
        }
    </style>
</head>
<body>
<?php render_nhan_vien_header($sessionUser, 'Sua thong tin nhan vien', 'profile'); ?>
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
            <h1><i class="bi bi-pencil-square me-2"></i>Cap Nhat Thong Tin Nhan Vien</h1>
        </div>
        <div class="edit-body">
            <form class="form-box" method="post" action="xu-ly-sua-thong-tin-nhan-vien.php" enctype="multipart/form-data">
                <input type="hidden" name="existing_anh_dai_dien" value="<?= esc_edit((string)($row['anh_dai_dien'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_truoc" value="<?= esc_edit((string)($row['cccd_mat_truoc'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_sau" value="<?= esc_edit((string)($row['cccd_mat_sau'] ?? '')) ?>">

                <div class="row g-3">
                    <div class="col-12 col-md-6">
                        <label for="hovaten" class="form-label">Ho va ten *</label>
                        <input type="text" class="form-control" id="hovaten" name="hovaten" maxlength="120" required value="<?= esc_edit((string)($row['hovaten'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="sodienthoai" class="form-label">So dien thoai *</label>
                        <input type="text" class="form-control" id="sodienthoai" name="sodienthoai" maxlength="20" required value="<?= esc_edit((string)($row['sodienthoai'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="email" class="form-label">Email *</label>
                        <input type="email" class="form-control" id="email" name="email" maxlength="150" required value="<?= esc_edit((string)($row['email'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12">
                        <label for="diachi" class="form-label">Dia chi *</label>
                        <input type="text" class="form-control" id="diachi" name="diachi" maxlength="255" required value="<?= esc_edit((string)($row['diachi'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="matkhau" class="form-label">Mat khau *</label>
                        <input type="text" class="form-control" id="matkhau" name="matkhau" minlength="6" maxlength="255" required value="<?= esc_edit((string)($row['matkhau'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="ngaysinh" class="form-label">Ngay sinh *</label>
                        <input type="date" class="form-control" id="ngaysinh" name="ngaysinh" required value="<?= esc_edit((string)($row['ngaysinh'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12">
                        <label for="kinh_nghiem" class="form-label">Mo ta kinh nghiem *</label>
                        <textarea class="form-control" id="kinh_nghiem" name="kinh_nghiem" rows="3" required <?= $isDisabled ? 'disabled' : '' ?>><?= esc_edit((string)($row['kinh_nghiem'] ?? '')) ?></textarea>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="anh_dai_dien" class="form-label">Anh dai dien moi</label>
                        <input type="file" class="form-control" id="anh_dai_dien" name="anh_dai_dien" accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="cccd_mat_truoc" class="form-label">CCCD mat truoc moi</label>
                        <input type="file" class="form-control" id="cccd_mat_truoc" name="cccd_mat_truoc" accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-4">
                        <label for="cccd_mat_sau" class="form-label">CCCD mat sau moi</label>
                        <input type="file" class="form-control" id="cccd_mat_sau" name="cccd_mat_sau" accept="image/*" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                </div>

                <div class="preview-grid">
                    <div class="preview-card">
                        <div class="small fw-semibold">Anh dai dien hien tai</div>
                        <img src="../<?= esc_edit($avatar) ?>" alt="anh dai dien">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mat truoc hien tai</div>
                        <img src="../<?= esc_edit($cccdFront) ?>" alt="cccd mat truoc">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mat sau hien tai</div>
                        <img src="../<?= esc_edit($cccdBack) ?>" alt="cccd mat sau">
                    </div>
                </div>

                <div class="d-flex flex-wrap gap-2 mt-4">
                    <button type="submit" class="btn btn-primary btn-soft" <?= $isDisabled ? 'disabled' : '' ?>>
                        <i class="bi bi-check2-circle me-1"></i> Luu thay doi
                    </button>
                    <a class="btn btn-outline-secondary btn-soft" href="thong-tin-nhan-vien.php">
                        <i class="bi bi-arrow-left me-1"></i> Quay lai thong tin
                    </a>
                </div>
            </form>
        </div>
    </section>
</div>
<?php render_nhan_vien_layout_end(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
