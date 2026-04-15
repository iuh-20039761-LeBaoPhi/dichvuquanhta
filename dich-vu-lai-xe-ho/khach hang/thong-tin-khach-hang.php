<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/header-shared.php';
require_once __DIR__ . '/get-khach-hang.php';

$sessionUser = session_user_require_customer('../login.html', 'khach_hang/thong-tin-khach-hang.php');
$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));

/** Escape output for HTML. */
function esc_profile(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$customerResult = getKhachHangBySessionId($sessionUser['id'] ?? 0);
$customerData = is_array($customerResult['data'] ?? null) ? $customerResult['data'] : [];
$loadError = (string)($customerResult['error'] ?? '');
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông Tin Khách Hàng - Thuê Tài Xế</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <?php render_khach_hang_header_styles(); ?>
    <style>
        :root {
            --bg-a: #eef6ff;
            --bg-b: #f8fbff;
            --ink: #0f172a;
            --sub: #64748b;
            --line: #dbe7f5;
            --card: #ffffff;
            --shadow: 0 18px 45px rgba(30, 64, 175, 0.12);
            --primary: #007bff;
            --primary-2: #00b4d8;
        }
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background:
                radial-gradient(1200px 500px at 10% -10%, #dbeafe 0%, transparent 55%),
                radial-gradient(900px 440px at 100% 0%, #d1fae5 0%, transparent 52%),
                linear-gradient(180deg, var(--bg-a) 0%, var(--bg-b) 100%);
            color: var(--ink);
            min-height: 100vh;
        }
        .page-wrap {
            max-width: 1180px;
            margin: 0 auto;
            padding: 14px;
        }
        .profile-shell {
            border: 1px solid var(--line);
            border-radius: 20px;
            background: var(--card);
            box-shadow: var(--shadow);
            overflow: hidden;
        }
        .profile-head {
            background: linear-gradient(110deg, var(--primary) 0%, var(--primary-2) 65%, #37a1ff 100%);
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
            color: var(--sub);
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
        .password-view {
            min-height: 34px;
            border-radius: 8px;
            border: 1px solid #d5deeb;
            padding: 6px 10px;
            font-size: 0.94rem;
            background: #fff;
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
        :root {
            --bg-a: #e8f4ff;
            --bg-b: #f0f8ff;
            --ink: #2c5282;
            --sub: #4a7fb5;
            --line: #bbdef5;
            --card: #ffffff;
            --shadow: 0 18px 45px rgba(0, 123, 255, 0.16);
            --primary: #007bff;
            --primary-2: #00b4d8;
        }

        body {
            background:
                radial-gradient(1200px 500px at 10% -10%, #dbeafe 0%, transparent 55%),
                radial-gradient(900px 440px at 100% 0%, #d1fae5 0%, transparent 52%),
                linear-gradient(180deg, var(--bg-a) 0%, var(--bg-b) 100%);
            color: var(--ink);
        }

        .profile-shell {
            border-color: var(--line);
            border-radius: 20px;
            box-shadow: var(--shadow);
            background: #ffffff;
        }

        .profile-head {
            background: linear-gradient(110deg, var(--primary) 0%, var(--primary-2) 68%, #37a1ff 100%);
            border-bottom: 1px solid #bbdef5;
        }

        .card-soft {
            border-color: #bbdef5;
            background: #fff;
            box-shadow: 0 10px 24px rgba(0, 123, 255, 0.12);
        }

        .avatar {
            border-color: #bbdef5;
            box-shadow: 0 10px 22px rgba(0, 123, 255, 0.28);
        }

        .name,
        .info-value,
        h2.h5 {
            color: #1a5d9c;
        }

        .muted,
        .info-label,
        .path-text {
            color: #4a7fb5;
        }

        .status-pill {
            border-color: #bbdef5;
            background: #e3f2fd;
            color: #1a5d9c;
        }

        .status-pill.pending {
            border-color: #ffeeba;
            background: #fff3cd;
            color: #856404;
        }

        .info-item {
            border-color: #bbdef5;
            background: #f5faff;
            box-shadow: 0 6px 14px rgba(0, 123, 255, 0.08);
        }

        .password-view {
            border-color: #bbdef5;
            background: #ffffff;
        }

        .media-item {
            border-color: #bbdef5;
            background: #f8fcff;
        }

        .media-item img {
            border-color: #bbdef5;
            box-shadow: 0 8px 18px rgba(0, 123, 255, 0.12);
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
<?php render_khach_hang_header($sessionUser, 'Thông tin khách hàng', 'profile'); ?>
<div class="page-wrap">

    <?php if ($flashMsg !== ''): ?>
        <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> py-2" role="alert">
            <?= esc_profile($flashMsg) ?>
        </div>
    <?php endif; ?>

    <?php if ($loadError !== ''): ?>
        <div class="alert alert-danger py-2" role="alert"><?= esc_profile($loadError) ?></div>
    <?php endif; ?>

    <section class="profile-shell">
        <div class="profile-head">
            <div>
                <h1><i class="bi bi-person-vcard me-2"></i>Thông tin cá nhân</h1>
                <div class="profile-sub">Quản lý thông tin tài khoản của bạn</div>
            </div>
            <a class="btn btn-light btn-soft" href="sua-thong-tin-khach-hang.php">
                <i class="bi bi-pencil-square me-1"></i> Sửa thông tin
            </a>
        </div>

        <div class="profile-body">
            <div class="row g-3 align-items-stretch">
                <div class="col-12 col-lg-4">
                    <div class="card-soft">
                        <div class="card-body text-center">
                            <img class="avatar" src="<?= esc_profile((string)($customerData['avatar_url'] ?? '../assets/logo_main.png')) ?>" alt="Ảnh đại diện">
                            <div class="name"><?= esc_profile((string)($customerData['full_name_text'] ?? 'Khách hàng')) ?></div>
                            <div class="muted"><?= esc_profile((string)($customerData['phone_text'] ?? '-')) ?></div>
                            <div class="mt-2">
                                <span class="status-pill<?= esc_profile((string)($customerData['status_class'] ?? '')) ?>"><?= esc_profile((string)($customerData['status_text'] ?? 'Đang hoạt động')) ?></span>
                            </div>
                            <div class="mt-3 d-grid gap-2">
                                <a class="btn btn-primary btn-soft" href="sua-thong-tin-khach-hang.php">
                                    <i class="bi bi-sliders2 me-1"></i> Cập nhật ngay
                                </a>
                                <a class="btn btn-outline-secondary btn-soft" href="danh-sach-don-hang.php">
                                    <i class="bi bi-receipt me-1"></i> Xem đơn hàng
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-lg-8">
                    <div class="card-soft">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h2 class="h5 mb-0 fw-bold">Chi tiết tài khoản</h2>
                            </div>

                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Họ và tên</div>
                                    <div class="info-value"><?= esc_profile((string)($customerData['full_name_text'] ?? 'Khách hàng')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số điện thoại</div>
                                    <div class="info-value"><?= esc_profile((string)($customerData['phone_text'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Email</div>
                                    <div class="info-value"><?= esc_profile((string)($customerData['email_text'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Địa chỉ</div>
                                    <div class="info-value"><?= esc_profile((string)($customerData['address_text'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Ngày sinh</div>
                                    <div class="info-value"><?= esc_profile((string)($customerData['birth_date_text'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Ngày tạo</div>
                                    <div class="info-value"><?= esc_profile((string)($customerData['created_date_text'] ?? '-')) ?></div>
                                </div>
                            </div>

                            <div class="row g-2 mt-3">
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">Ảnh đại diện</div>
                                        <a href="<?= esc_profile((string)($customerData['avatar_url'] ?? '../assets/logo_main.png')) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="<?= esc_profile((string)($customerData['avatar_url'] ?? '../assets/logo_main.png')) ?>" alt="Ảnh đại diện">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mặt trước</div>
                                        <a href="<?= esc_profile((string)($customerData['cccd_front_url'] ?? '../assets/logo_main.png')) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="<?= esc_profile((string)($customerData['cccd_front_url'] ?? '../assets/logo_main.png')) ?>" alt="CCCD mặt trước">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mặt sau</div>
                                        <a href="<?= esc_profile((string)($customerData['cccd_back_url'] ?? '../assets/logo_main.png')) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="<?= esc_profile((string)($customerData['cccd_back_url'] ?? '../assets/logo_main.png')) ?>" alt="CCCD mặt sau">
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
<?php render_khach_hang_layout_end(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>