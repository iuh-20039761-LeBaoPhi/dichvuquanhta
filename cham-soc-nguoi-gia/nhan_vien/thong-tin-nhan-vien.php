<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-nhan-vien.php';

$flashOk = isset($_GET['ok']) ? ((string) $_GET['ok'] === '1') : null;
$flashMsg = trim((string) ($_GET['msg'] ?? ''));

/** Escape output for HTML. */
function esc_nv(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$employeeResult = nv_get_employee_info();
$loadError = (string) ($employeeResult['error'] ?? '');
$row = $employeeResult['row'] ?? [];
$services = $employeeResult['services'] ?? [];

$avatar = trim((string) ($row['avatartenfile'] ?? ''));
$cccdFront = trim((string) ($row['cccdmattruoctenfile'] ?? ''));
$cccdBack = trim((string) ($row['cccdmatsautenfile'] ?? ''));
$statusText = trim((string) ($row['trangthai'] ?? ''));

if ($avatar === '') {
    $avatar = '../assets/logong.png';
}
if ($cccdFront === '') {
    $cccdFront = '../assets/logong.png';
}
if ($cccdBack === '') {
    $cccdBack = '../assets/logong.png';
}
if ($statusText === '') {
    $statusText = 'Dang hoat dong';
}

$statusClass = strtolower($statusText) === 'pending' ? ' pending' : '';
?>
<?php
$pageTitle = "Thông tin cá nhân";
include 'layout-header.php';
?>
<style>
    /* Giữ nguyên các style gốc của trang */
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
        font-weight: 700;
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
        font-weight: 700;
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
        .page-wrap { padding: 1px; }
        .profile-shell { margin: 1px; border-radius: 12px; }
        .profile-head { padding: 12px 10px; gap: 8px; }
        .profile-body { padding: 4px 1px; }
        .card-soft .card-body { padding: 4px; }
        .info-grid { grid-template-columns: 1fr; gap: 5px; }
        .info-item { padding: 8px 6px; min-height: auto; }
        .media-item { padding: 2px; }
        .row { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
        .mt-3 { margin-top: 0.25rem !important; }
        .mb-3 { margin-bottom: 0.25rem !important; }
        .g-3 { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
        .g-2 { --bs-gutter-x: 0.25rem; --bs-gutter-y: 0.25rem; }
    }
</style>
<style>
    /* Theme color overrides */
    body {
        background:
            radial-gradient(1200px 500px at 10% -10%, #e8f5e9 0%, transparent 55%),
            radial-gradient(900px 440px at 100% 0%, #f1f8f1 0%, transparent 52%),
            linear-gradient(180deg, #f1f8f1 0%, #f1f8f1 100%);
        color: #2e7d32;
    }

    .profile-shell {
        border-color: #c8e6c9;
        border-radius: 20px;
        box-shadow: 0 18px 45px rgba(46, 125, 50, 0.16);
        background: #f1f8f1;
    }

    .profile-head {
        background: linear-gradient(110deg, #1b5e20 0%, #2e7d32 68%, #66bb6a 100%);
        border-bottom: 1px solid #c8e6c9;
    }

    .card-soft {
        border-color: #c8e6c9;
        background: #fff;
        box-shadow: 0 10px 24px rgba(46, 125, 50, 0.12);
    }

    .avatar {
        border-color: #81c784;
        box-shadow: 0 10px 22px rgba(46, 125, 50, 0.28);
    }

    .name,
    .info-value,
    h2.h5 {
        color: #1b5e20;
    }

    .muted,
    .info-label,
    .path-text {
        color: #388e3c;
    }

    .status-pill {
        border-color: #c8e6c9;
        background: #e8f5e9;
        color: #1b5e20;
    }

    .status-pill.pending {
        border-color: #f2d2bc;
        background: #fff1e7;
        color: #9d5d2a;
    }

    .info-item {
        border-color: #c8e6c9;
        background: #f1f8f1;
        box-shadow: 0 6px 14px rgba(46, 125, 50, 0.08);
    }

    .media-item {
        border-color: #c8e6c9;
        background: #f1f8f1;
    }

    .media-item img {
        border-color: #c8e6c9;
        box-shadow: 0 8px 18px rgba(46, 125, 50, 0.12);
    }

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
        border-color: #2e7d32;
        background: #2e7d32;
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
</style>

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
                <h1><i class="bi bi-person-badge me-2"></i>Thông Tin Nhân Viên</h1>
            </div>
            <a class="btn btn-light btn-soft" href="sua-thong-tin-nhan-vien.php"
                onclick="event.preventDefault(); navigateTo('sua-thong-tin-nhan-vien.php');">
                <i class="bi bi-pencil-square me-1"></i> Sửa thông tin
            </a>
        </div>

        <div class="profile-body">
            <div class="row g-3 align-items-stretch">
                <div class="col-12 col-lg-4">
                    <div class="card-soft">
                        <div class="card-body text-center">
                            <img class="avatar" src="../assets/<?= esc_nv($avatar) ?>" alt="avatar nhan vien">
                            <div class="name"><?= esc_nv((string) ($row['hovaten'] ?? 'Nhan vien')) ?></div>
                            <div class="muted"><?= esc_nv((string) ($row['sodienthoai'] ?? '-')) ?></div>
                            <div class="mt-2">
                                <span
                                    class="status-pill<?= esc_nv($statusClass) ?>"><?= esc_nv($statusText) ?></span>
                            </div>
                            <div class="mt-3 d-grid gap-2">
                                <a class="btn btn-primary btn-soft" href="sua-thong-tin-nhan-vien.php"
                                   onclick="event.preventDefault(); navigateTo('sua-thong-tin-nhan-vien.php');">
                                    <i class="bi bi-sliders2 me-1"></i> Cập nhật ngay
                                </a>
                                <a class="btn btn-outline-secondary btn-soft" href="danh-sach-hoa-don.php"
                                    onclick="event.preventDefault(); navigateTo('danh-sach-hoa-don.php');">
                                    <i class="bi bi-receipt me-1"></i> Danh sách hóa đơn
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-lg-8">
                    <div class="card-soft">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h2 class="h5 mb-0 fw-bold">Chi tiết tài khoản nhân viên</h2>
                            </div>

                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Họ và tên</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['hovaten'] ?? 'Nhan vien')) ?>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số điện thoại</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['sodienthoai'] ?? '-')) ?>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Email</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['email'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Địa chỉ</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['diachi'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item col-12" style="grid-column: 1 / -1;">
                                    <div class="info-label">Dịch vụ cung cấp</div>
                                    <div class="info-value d-flex flex-wrap gap-2 mt-1">
                                        <?php if (empty($services)): ?>
                                            <span class="text-muted small">Chưa đăng ký dịch vụ</span>
                                        <?php else: ?>
                                            <?php foreach ($services as $srv): ?>
                                                <span class="badge d-inline-flex align-items-center gap-1"
                                                    style="background: <?= $srv['color'] ?>15; color: <?= $srv['color'] ?>; border: 1px solid <?= $srv['color'] ?>40; padding: 6px 12px; border-radius: 8px;">
                                                    <i class="<?= $srv['icon'] ?>"></i>
                                                    <?= esc_nv($srv['name']) ?>
                                                </span>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </div>
                                </div>
                            </div>

                            <div class="row g-2 mt-3">
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">Ảnh đại diện</div>
                                        <a href="../assets/<?= esc_nv($avatar) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="../assets/<?= esc_nv($avatar) ?>" alt="anh dai dien">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mặt trước</div>
                                        <a href="../assets/<?= esc_nv($cccdFront) ?>" target="_blank"
                                            rel="noopener noreferrer">
                                            <img src="../assets/<?= esc_nv($cccdFront) ?>" alt="cccd mat truoc">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mặt sau</div>
                                        <a href="../assets/<?= esc_nv($cccdBack) ?>" target="_blank"
                                            rel="noopener noreferrer">
                                            <img src="../assets/<?= esc_nv($cccdBack) ?>" alt="cccd mat sau">
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
<?php include 'layout-footer.php'; ?>