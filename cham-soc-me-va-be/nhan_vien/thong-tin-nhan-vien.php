<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-nhan-vien.php';

$sessionUser = session_user_require_employee('../login.html', 'nhan_vien/thong-tin-nhan-vien.php');
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

/** Escape output for HTML. */
function esc_nv(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$employeeResult = getNhanVienBySessionId($sessionUser['id'] ?? 0);
$loadError = (string)($employeeResult['error'] ?? '');
$row = is_array($employeeResult['row'] ?? null) ? $employeeResult['row'] : [];

$avatar = trim((string)($row['anh_dai_dien'] ?? ''));
$cccdFront = trim((string)($row['cccd_mat_truoc'] ?? ''));
$cccdBack = trim((string)($row['cccd_mat_sau'] ?? ''));
$statusText = trim((string)($row['trangthai'] ?? ''));

if ($avatar === '') {
    $avatar = '../assets/logomvb.png';
}
if ($cccdFront === '') {
    $cccdFront = '../assets/logomvb.png';
}
if ($cccdBack === '') {
    $cccdBack = '../assets/logomvb.png';
}
if ($statusText === '') {
    $statusText = 'Dang hoat dong';
}

$statusClass = strtolower($statusText) === 'pending' ? ' pending' : '';
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thong Tin Nhan Vien</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: linear-gradient(180deg, #eef4ff 0%, #f8fbff 100%);
            color: #0f172a;
            min-height: 100vh;
        }
        .page-wrap {
            max-width: 1180px;
            margin: 0 auto;
            padding: 14px;
        }
        .profile-shell {
            border: 1px solid #dbe7f5;
            border-radius: 20px;
            background: #fff;
            box-shadow: 0 18px 45px rgba(30, 64, 175, 0.12);
            overflow: hidden;
        }
        .profile-head {
            background: linear-gradient(110deg, #1453b8 0%, #1a73e8 65%, #37a1ff 100%);
            color: #fff;
            padding: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            flex-wrap: wrap;
        }
        .profile-head h1 {
            margin: 0;
            font-size: 1.35rem;
            font-weight: 800;
        }
        .profile-sub {
            margin: 4px 0 0;
            opacity: 0.9;
            font-size: 0.93rem;
        }
        .profile-body {
            padding: 22px;
        }
        .card-soft {
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            background: #fff;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
            height: 100%;
        }
        .card-soft .card-body {
            padding: 18px;
        }
        .avatar {
            width: 104px;
            height: 104px;
            border-radius: 999px;
            border: 3px solid #eff6ff;
            box-shadow: 0 10px 22px rgba(59, 130, 246, 0.26);
            object-fit: cover;
            background: #fff;
        }
        .name {
            margin-top: 12px;
            margin-bottom: 4px;
            font-size: 1.2rem;
            font-weight: 800;
            color: #0b2454;
        }
        .muted {
            color: #64748b;
        }
        .status-pill {
            display: inline-flex;
            align-items: center;
            border-radius: 999px;
            font-size: 0.78rem;
            font-weight: 700;
            padding: 4px 10px;
            border: 1px solid #dbeafe;
            background: #eff6ff;
            color: #1d4ed8;
        }
        .status-pill.pending {
            border-color: #fde68a;
            background: #fef9c3;
            color: #92400e;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }
        .info-item {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 12px;
            background: #f8fafc;
            min-height: 84px;
        }
        .info-label {
            color: #64748b;
            font-size: 0.8rem;
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 0.97rem;
            font-weight: 600;
            color: #0f172a;
            word-break: break-word;
        }
        .path-text {
            font-size: 0.8rem;
            color: #64748b;
            word-break: break-all;
        }
        .media-item {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 10px;
            background: #f8fafc;
        }
        .media-item img {
            width: 100%;
            height: 140px;
            object-fit: cover;
            border-radius: 10px;
            border: 1px solid #dbe3ef;
            background: #fff;
        }
        .btn-soft {
            border-radius: 12px;
            font-weight: 600;
            min-height: 40px;
            padding: 8px 14px;
        }
        @media (max-width: 991.98px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
    <style>
        body {
            background:
                radial-gradient(1200px 500px at 10% -10%, #ffe1f1 0%, transparent 55%),
                radial-gradient(900px 440px at 100% 0%, #ffeede 0%, transparent 52%),
                linear-gradient(180deg, #fff4fb 0%, #fff9fc 100%);
            color: #6b3e58;
        }

        .profile-shell {
            border-color: #f1c5dc;
            border-radius: 20px;
            box-shadow: 0 18px 45px rgba(156, 65, 113, 0.16);
            background: #fff9fd;
        }

        .profile-head {
            background: linear-gradient(110deg, #c14b84 0%, #e16ca4 68%, #f39a90 100%);
            border-bottom: 1px solid #f4cade;
        }

        .card-soft {
            border-color: #f1c7dd;
            background: #fff;
            box-shadow: 0 10px 24px rgba(156, 65, 113, 0.12);
        }

        .avatar {
            border-color: #f8cee2;
            box-shadow: 0 10px 22px rgba(195, 75, 132, 0.28);
        }

        .name,
        .info-value,
        h2.h5 {
            color: #7a345a;
        }

        .muted,
        .info-label,
        .path-text {
            color: #95627f;
        }

        .status-pill {
            border-color: #f2bfd9;
            background: #ffe9f4;
            color: #8d2f61;
        }

        .status-pill.pending {
            border-color: #f2d2bc;
            background: #fff1e7;
            color: #9d5d2a;
        }

        .info-item {
            border-color: #f1c8dd;
            background: #fff6fb;
            box-shadow: 0 6px 14px rgba(151, 61, 107, 0.08);
        }

        .media-item {
            border-color: #f1c7dd;
            background: #fff8fc;
        }

        .media-item img {
            border-color: #f0c6dc;
            box-shadow: 0 8px 18px rgba(151, 61, 107, 0.12);
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
<div class="page-wrap">

    <?php if ($flashMsg !== ''): ?>
        <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2" role="alert">
            <?= esc_nv($flashMsg) ?>
        </div>
    <?php endif; ?>

    <?php if ($loadError !== ''): ?>
        <div class="alert alert-danger py-2" role="alert"><?= esc_nv($loadError) ?></div>
    <?php endif; ?>

    <section class="profile-shell">
        <div class="profile-head">
            <div>
                <h1><i class="bi bi-person-badge me-2"></i>Thong Tin Nhan Vien</h1>
            </div>
            <a class="btn btn-light btn-soft" href="sua-thong-tin-nhan-vien.php">
                <i class="bi bi-pencil-square me-1"></i> Sua thong tin
            </a>
        </div>

        <div class="profile-body">
            <div class="row g-3 align-items-stretch">
                <div class="col-12 col-lg-4">
                    <div class="card-soft">
                        <div class="card-body text-center">
                            <img class="avatar" src="../<?= esc_nv($avatar) ?>" alt="avatar nhan vien">
                            <div class="name"><?= esc_nv((string)($row['hovaten'] ?? 'Nhan vien')) ?></div>
                            <div class="muted"><?= esc_nv((string)($row['sodienthoai'] ?? '-')) ?></div>
                            <div class="mt-2">
                                <span class="status-pill<?= esc_nv($statusClass) ?>"><?= esc_nv($statusText) ?></span>
                            </div>
                            <div class="mt-3 d-grid gap-2">
                                <a class="btn btn-primary btn-soft" href="sua-thong-tin-nhan-vien.php">
                                    <i class="bi bi-sliders2 me-1"></i> Cap nhat ngay
                                </a>
                                <a class="btn btn-outline-secondary btn-soft" href="danh-sach-hoa-don.php">
                                    <i class="bi bi-receipt me-1"></i> Danh sach hoa don
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-lg-8">
                    <div class="card-soft">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h2 class="h5 mb-0 fw-bold">Chi tiet tai khoan nhan vien</h2>
                                
                            </div>

                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Ho va ten</div>
                                    <div class="info-value"><?= esc_nv((string)($row['hovaten'] ?? 'Nhan vien')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">So dien thoai</div>
                                    <div class="info-value"><?= esc_nv((string)($row['sodienthoai'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Email</div>
                                    <div class="info-value"><?= esc_nv((string)($row['email'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Dia chi</div>
                                    <div class="info-value"><?= esc_nv((string)($row['diachi'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Ngay sinh</div>
                                    <div class="info-value"><?= esc_nv((string)($row['ngaysinh'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Mo ta kinh nghiem</div>
                                    <div class="info-value"><?= esc_nv((string)($row['kinh_nghiem'] ?? '-')) ?></div>
                                </div>
                            </div>

                            <div class="row g-2 mt-3">
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">Anh dai dien</div>
                                        <a href="<?= esc_nv($avatar) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="../<?= esc_nv($avatar) ?>" alt="anh dai dien">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mat truoc</div>
                                        <a href="<?= esc_nv($cccdFront) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="../<?= esc_nv($cccdFront) ?>" alt="cccd mat truoc">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mat sau</div>
                                        <a href="<?= esc_nv($cccdBack) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="../<?= esc_nv($cccdBack) ?>" alt="cccd mat sau">
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
