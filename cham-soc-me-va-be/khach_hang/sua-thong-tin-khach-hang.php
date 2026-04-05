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
    <title>Sua Thong Tin Khach Hang</title>
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
</head>
<body>
<?php render_khach_hang_header($sessionUser, 'Sua thong tin khach hang', 'profile'); ?>
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
            <h1><i class="bi bi-pencil-square me-2"></i>Cap Nhat Thong Tin Ca Nhan</h1>
        </div>
        <div class="edit-body">
            <form class="form-box" method="post" action="xu-ly-sua-thong-tin-khach-hang.php" enctype="multipart/form-data">
                <input type="hidden" name="existing_anh_dai_dien" value="<?= esc_edit((string)($customerData['avatar_path'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_truoc" value="<?= esc_edit((string)($customerData['cccd_front_path'] ?? '')) ?>">
                <input type="hidden" name="existing_cccd_mat_sau" value="<?= esc_edit((string)($customerData['cccd_back_path'] ?? '')) ?>">

                <div class="row g-3">
                    <div class="col-12 col-md-6">
                        <label for="hovaten" class="form-label">Ho va ten *</label>
                        <input type="text" class="form-control" id="hovaten" name="hovaten" maxlength="120" required value="<?= esc_edit((string)($customerData['full_name'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="sodienthoai" class="form-label">So dien thoai *</label>
                        <input type="text" class="form-control" id="sodienthoai" name="sodienthoai" maxlength="20" required value="<?= esc_edit((string)($customerData['phone'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="email" class="form-label">Email *</label>
                        <input type="email" class="form-control" id="email" name="email" maxlength="150" required value="<?= esc_edit((string)($customerData['email'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12">
                        <label for="diachi" class="form-label">Dia chi *</label>
                        <input type="text" class="form-control" id="diachi" name="diachi" maxlength="255" required value="<?= esc_edit((string)($customerData['address'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="matkhau" class="form-label">Mat khau *</label>
                        <input type="text" class="form-control" id="matkhau" name="matkhau" minlength="6" maxlength="255" required value="<?= esc_edit((string)($customerData['password'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
                    </div>
                    <div class="col-12 col-md-6">
                        <label for="ngaysinh" class="form-label">Ngay sinh *</label>
                        <input type="date" class="form-control" id="ngaysinh" name="ngaysinh" required value="<?= esc_edit((string)($customerData['birth_date'] ?? '')) ?>" <?= $isDisabled ? 'disabled' : '' ?>>
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
                        <img src="<?= esc_edit((string)($customerData['avatar_url'] ?? '../assets/logomvb.png')) ?>" alt="anh dai dien">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mat truoc hien tai</div>
                        <img src="<?= esc_edit((string)($customerData['cccd_front_url'] ?? '../assets/logomvb.png')) ?>" alt="cccd mat truoc">
                    </div>
                    <div class="preview-card">
                        <div class="small fw-semibold">CCCD mat sau hien tai</div>
                        <img src="<?= esc_edit((string)($customerData['cccd_back_url'] ?? '../assets/logomvb.png')) ?>" alt="cccd mat sau">
                    </div>
                </div>

                <div class="action-buttons">
                    <button type="submit" class="btn btn-primary btn-soft" <?= $isDisabled ? 'disabled' : '' ?>>
                        <i class="bi bi-check2-circle me-1"></i> Lưu
                    </button>
                    <a class="btn btn-outline-secondary btn-soft" href="thong-tin-khach-hang.php">
                        <i class="bi bi-arrow-left me-1"></i> Quay lai
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
