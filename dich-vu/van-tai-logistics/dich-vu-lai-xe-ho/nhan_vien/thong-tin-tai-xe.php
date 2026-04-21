<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-tai-xe.php';

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
$licenseImage = trim((string) ($row['giaypheplaixetenfile'] ?? ''));
$statusText = trim((string) ($row['trangthai'] ?? ''));

if ($avatar === '') {
    $avatar = '../assets/logo_main.png';
}
if ($cccdFront === '') {
    $cccdFront = '../assets/logo_main.png';
}
if ($cccdBack === '') {
    $cccdBack = '../assets/logo_main.png';
}
if ($licenseImage === '') {
    $licenseImage = '../assets/logo_main.png';
}
if ($statusText === '') {
    $statusText = 'Đang hoạt động';
}

$statusClass = strtolower($statusText) === 'pending' ? ' pending' : '';

// Lấy thông tin bổ sung cho tài xế
$soBangLai = trim((string) ($row['so_bang_lai'] ?? 'Chưa cập nhật'));
$hangBangLai = trim((string) ($row['hang_bang_lai'] ?? 'Chưa cập nhật'));
$kinhNghiemNam = trim((string) ($row['kinh_nghiem_nam'] ?? '0'));
$kinhNghiemMoTa = trim((string) ($row['kinh_nghiem_mota'] ?? 'Chưa có mô tả'));
?>
<?php
$pageTitle = "Thông tin tài xế";
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
        box-shadow: 0 18px 45px rgba(0, 123, 255, 0.12);
        overflow: hidden;
    }

    .profile-head {
        background: linear-gradient(110deg, #007bff 0%, #00b4d8 100%);
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
        box-shadow: 0 10px 22px rgba(0, 123, 255, 0.26);
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

    /* Phục hồi giao diện desktop cho iPad (768px - 991px) */
    @media (min-width: 768px) and (max-width: 991.98px) {
        .page-wrap { padding: 14px; }
        .profile-shell { margin: 0; border-radius: 20px; }
        .profile-head { padding: 24px; gap: 14px; }
        .profile-body { padding: 22px; }
        .card-soft .card-body { padding: 18px; }
        .info-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .info-item { padding: 12px; min-height: 84px; }
        .media-item { padding: 10px; }
        
        /* Cấu trúc cột side-by-side cho iPad */
        .profile-body .row > .col-12.col-lg-4 {
            flex: 0 0 auto;
            width: 33.33333333%;
        }
        .profile-body .row > .col-12.col-lg-8 {
            flex: 0 0 auto;
            width: 66.66666667%;
        }
        
        /* Khôi phục khoảng cách (gutters) */
        .profile-body .row { --bs-gutter-x: 1.5rem !important; --bs-gutter-y: 0 !important; }
        .profile-body .g-3 { --bs-gutter-x: 1rem !important; --bs-gutter-y: 1rem !important; }
        .profile-body .g-2 { --bs-gutter-x: 0.5rem !important; --bs-gutter-y: 0.5rem !important; }
        .mt-3 { margin-top: 1rem !important; }
        .mb-3 { margin-bottom: 1rem !important; }
    }
</style>
<style>
    /* Theme color overrides - Xanh dương cho tài xế */
    body {
        background:
            radial-gradient(1200px 500px at 10% -10%, #dbeafe 0%, transparent 55%),
            radial-gradient(900px 440px at 100% 0%, #d1fae5 0%, transparent 52%),
            linear-gradient(180deg, #e8f4ff 0%, #f0f8ff 100%);
        color: #2c5282;
    }

    .profile-shell {
        border-color: #bbdef5;
        border-radius: 20px;
        box-shadow: 0 18px 45px rgba(0, 123, 255, 0.16);
        background: #ffffff;
    }

    .profile-head {
        background: linear-gradient(110deg, #007bff 0%, #00b4d8 100%);
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
                <h1><i class="bi bi-person-badge me-2"></i>Thông Tin Tài Xế</h1>
                <div class="profile-sub">Quản lý thông tin cá nhân của bạn</div>
            </div>
            <a class="btn btn-light btn-soft" href="sua-thong-tin-tai-xe.php"
                onclick="event.preventDefault(); navigateTo('sua-thong-tin-tai-xe.php');">
                <i class="bi bi-pencil-square me-1"></i> Sửa thông tin
            </a>
        </div>

        <div class="profile-body">
            <div class="row g-3 align-items-stretch">
                <div class="col-12 col-lg-4">
                    <div class="card-soft">
                        <div class="card-body text-center">
                            <img class="avatar" src="../assets/<?= esc_nv($avatar) ?>" alt="avatar tài xế">
                            <div class="name"><?= esc_nv((string) ($row['hovaten'] ?? 'Tài xế')) ?></div>
                            <div class="muted"><?= esc_nv((string) ($row['sodienthoai'] ?? '-')) ?></div>
                            <div class="mt-2">
                                <span class="status-pill<?= esc_nv($statusClass) ?>"><?= esc_nv($statusText) ?></span>
                            </div>
                            <div class="mt-3 d-grid gap-2">
                                <a class="btn btn-primary btn-soft" href="sua-thong-tin-tai-xe.php"
                                   onclick="event.preventDefault(); navigateTo('sua-thong-tin-tai-xe.php');">
                                    <i class="bi bi-sliders2 me-1"></i> Cập nhật ngay
                                </a>
                                <a class="btn btn-outline-secondary btn-soft" href="danh-sach-don-hang.php"
                                    onclick="event.preventDefault(); navigateTo('danh-sach-don-hang.php');">
                                    <i class="bi bi-receipt me-1"></i> Danh sách đơn hàng
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-lg-8">
                    <div class="card-soft">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h2 class="h5 mb-0 fw-bold">Chi tiết tài khoản tài xế</h2>
                            </div>

                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">Họ và tên</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['hovaten'] ?? 'Tài xế')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số điện thoại</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['sodienthoai'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Email</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['email'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Địa chỉ</div>
                                    <div class="info-value"><?= esc_nv((string) ($row['diachi'] ?? '-')) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số bằng lái</div>
                                    <div class="info-value"><?= esc_nv($soBangLai) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Hạng bằng lái</div>
                                    <div class="info-value"><?= esc_nv($hangBangLai) ?></div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">Số năm kinh nghiệm</div>
                                    <div class="info-value"><?= esc_nv($kinhNghiemNam) ?> năm</div>
                                </div>
                                <div class="info-item col-12" style="grid-column: 1 / -1;">
                                    <div class="info-label">Mô tả kinh nghiệm</div>
                                    <div class="info-value"><?= esc_nv($kinhNghiemMoTa) ?></div>
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
                                            <img src="../assets/<?= esc_nv($avatar) ?>" alt="Ảnh đại diện">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">Ảnh bằng lái xe</div>
                                        <a href="../assets/<?= esc_nv($licenseImage) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="../assets/<?= esc_nv($licenseImage) ?>" alt="Ảnh bằng lái xe">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mặt trước</div>
                                        <a href="../assets/<?= esc_nv($cccdFront) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="../assets/<?= esc_nv($cccdFront) ?>" alt="CCCD mặt trước">
                                        </a>
                                    </div>
                                </div>
                                <div class="col-12 col-md-4">
                                    <div class="media-item">
                                        <div class="small fw-semibold mb-2">CCCD mặt sau</div>
                                        <a href="../assets/<?= esc_nv($cccdBack) ?>" target="_blank" rel="noopener noreferrer">
                                            <img src="../assets/<?= esc_nv($cccdBack) ?>" alt="CCCD mặt sau">
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