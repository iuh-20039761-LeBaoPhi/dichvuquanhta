<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadonsdt.php';
require_once __DIR__ . '/xu-ly-huy.php';
require_once __DIR__ . '/header-shared.php';

function mevabe_parse_media_paths(string $raw): array
{
    $raw = trim($raw);
    if ($raw === '') {
        return [];
    }

    $paths = [];
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        foreach ($decoded as $item) {
            $path = trim((string)$item);
            if ($path !== '') {
                $paths[] = $path;
            }
        }
    } else {
        $parts = preg_split('/\s*[\r\n,;|]+\s*/', $raw) ?: [];
        foreach ($parts as $item) {
            $path = trim((string)$item);
            if ($path !== '') {
                $paths[] = $path;
            }
        }
    }

    return array_values(array_unique($paths));
}

function mevabe_media_is_video(string $path): bool
{
    $pathPart = parse_url($path, PHP_URL_PATH);
    $normalized = is_string($pathPart) && $pathPart !== '' ? $pathPart : $path;
    $ext = strtolower((string)pathinfo($normalized, PATHINFO_EXTENSION));
    return in_array($ext, ['mp4', 'webm', 'ogg', 'mov'], true);
}

$sessionUser = session_user_require_customer('../login.html', 'khach_hang/chi-tiet-hoa-don.php' . (isset($_GET['id']) ? ('?id=' . urlencode((string)$_GET['id'])) : ''));
$sessionPhone = (string)($sessionUser['sodienthoai'] ?? '');

$invoiceId = (int)($_GET['id'] ?? 0);
$result = getHoaDonBySessionSdt($sessionPhone, $invoiceId > 0 ? $invoiceId : null);
$invoice = $result['row'] ?? null;
$loadError = (string)($result['error'] ?? '');

if ($invoiceId <= 0) {
    $loadError = 'Thiếu mã hóa đơn để hiển thị chi tiết.';
}
if ($invoiceId > 0 && !$invoice && $loadError === '') {
    $loadError = 'Không tìm thấy hóa đơn hoặc bạn không có quyền xem hóa đơn này.';
}

$invoice = is_array($invoice) ? $invoice : [];
if ($invoice) {
    $invoice = mevabe_refresh_invoice_row($invoice);
}

$idNumber = (int)($invoice['id'] ?? 0);
$invoiceCode = $idNumber > 0 ? ('#' . str_pad((string)$idNumber, 6, '0', STR_PAD_LEFT)) : '---';

$statusText = trim((string)($invoice['trangthai'] ?? ''));
if ($statusText === '') {
    $statusText = 'Chờ xác nhận';
}

$statusRaw = function_exists('mb_strtolower') ? mb_strtolower($statusText, 'UTF-8') : strtolower($statusText);
$stateClass = 'warning';
if (strpos($statusRaw, 'hủy') !== false || strpos($statusRaw, 'huy') !== false || strpos($statusRaw, 'cancel') !== false) {
    $stateClass = 'danger';
} elseif (strpos($statusRaw, 'hoàn thành') !== false || strpos($statusRaw, 'hoan thanh') !== false || strpos($statusRaw, 'kết thúc') !== false || strpos($statusRaw, 'ket thuc') !== false) {
    $stateClass = 'success';
}

$progress = (float)str_replace(',', '.', (string)($invoice['tien_do'] ?? '0'));
if (!is_finite($progress)) {
    $progress = 0.0;
}
$progress = max(0.0, min(100.0, $progress));
$progressText = number_format($progress, 2, '.', '');

$serviceName = trim((string)($invoice['dich_vu'] ?? ''));
if ($serviceName === '') {
    $serviceName = '---';
}

$totalMoneyText = trim((string)($invoice['tong_tien'] ?? ''));
if ($totalMoneyText === '') {
    $totalMoneyText = '0';
}

$planStartDate = trim((string)($invoice['ngay_bat_dau_kehoach'] ?? ''));
$planEndDate = trim((string)($invoice['ngay_ket_thuc_kehoach'] ?? ''));
$planStartTime = trim((string)($invoice['gio_bat_dau_kehoach'] ?? ''));
$planEndTime = trim((string)($invoice['gio_ket_thuc_kehoach'] ?? ''));

$planStartDateTimeText = trim($planStartDate . ' ' . $planStartTime);
$planEndDateTimeText = trim($planEndDate . ' ' . $planEndTime);
$planStartDateTimeText = $planStartDateTimeText !== '' ? $planStartDateTimeText : '---';
$planEndDateTimeText = $planEndDateTimeText !== '' ? $planEndDateTimeText : '---';

$planTimeRangeText = ($planStartTime !== '' ? $planStartTime : '---') . ' - ' . ($planEndTime !== '' ? $planEndTime : '---');
$planDayRangeText = ($planStartDate !== '' ? $planStartDate : '---') . ' -> ' . ($planEndDate !== '' ? $planEndDate : '---');

$realStartText = trim((string)($invoice['thoigian_batdau_thucte'] ?? ''));
$realEndText = trim((string)($invoice['thoigian_ketthuc_thucte'] ?? ''));
$realStartText = $realStartText !== '' ? $realStartText : '---';
$realEndText = $realEndText !== '' ? $realEndText : '---';

$dayHintText = $planDayRangeText;

$daysPlan = 0;
if (
    preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', $planStartDate)
    && preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', $planEndDate)
) {
    $startDt = DateTimeImmutable::createFromFormat('Y-m-d', $planStartDate);
    $endDt = DateTimeImmutable::createFromFormat('Y-m-d', $planEndDate);
    if ($startDt && $endDt) {
        $daysPlan = (int)$startDt->diff($endDt)->format('%a') + 1;
    }
}

$addressText = trim((string)($invoice['diachikhachhang'] ?? ''));
if ($addressText === '') {
    $addressText = '---';
}

$requestExtra = trim((string)($invoice['yeu_cau_khac'] ?? ''));
if ($requestExtra === '') {
    $requestExtra = '---';
}

$note = trim((string)($invoice['ghi_chu'] ?? ''));
if ($note === '') {
    $note = '---';
}

$jobsRaw = trim((string)($invoice['cong_viec'] ?? ''));
$jobs = [];
if ($jobsRaw !== '') {
    $jobsJson = json_decode($jobsRaw, true);
    if (is_array($jobsJson)) {
        foreach ($jobsJson as $job) {
            $jobText = trim((string)$job);
            $jobText = ltrim($jobText, ", \t\n\r\0\x0B");
            if ($jobText !== '') {
                $jobs[] = $jobText;
            }
        }
    } else {
        $parts = preg_split('/\s*[\.\x{3002}\r\n;]+\s*/u', $jobsRaw) ?: [];
        foreach ($parts as $part) {
            $jobText = trim((string)$part);
            $jobText = ltrim($jobText, ", \t\n\r\0\x0B");
            if ($jobText !== '') {
                $jobs[] = $jobText;
            }
        }
    }
}
if (!$jobs) {
    $jobs = ['---'];
}

$staffAssigned =
    trim((string)($invoice['tenncc'] ?? '')) !== ''
    || trim((string)($invoice['hotenncc'] ?? '')) !== ''
    || (int)($invoice['id_nhacungcap'] ?? 0) > 0
    || trim((string)($invoice['nhacungcapnhan'] ?? '')) !== '';

$cancelCheck = mevabe_can_cancel_invoice($invoice);
$canCancel = (($cancelCheck['ok'] ?? false) === true);

$customerReviewText = trim((string)($invoice['danhgia_khachhang'] ?? ''));
$customerReviewTime = trim((string)($invoice['thoigian_danhgia_khachhang'] ?? ''));
$customerReviewMedia = mevabe_parse_media_paths((string)($invoice['media_danhgia_khachhang'] ?? ''));
$customerReviewHasData = $customerReviewText !== '' || $customerReviewTime !== '' || $customerReviewMedia !== [];

$supplierReviewText = trim((string)($invoice['danhgia_nhanvien'] ?? ''));
$supplierReviewTime = trim((string)($invoice['thoigian_danhgia_nhanvien'] ?? ''));
$supplierReviewMedia = mevabe_parse_media_paths((string)($invoice['media_danhgia_nhanvien'] ?? ''));
$supplierReviewHasData = $supplierReviewText !== '' || $supplierReviewTime !== '' || $supplierReviewMedia !== [];

$reviewCheck = mevabe_can_customer_review($invoice);
$canReview = (($reviewCheck['ok'] ?? false) === true);
$reviewBlockedMessage = trim((string)($reviewCheck['message'] ?? ''));

$flashOk = isset($_GET['ok']) ? ((string)$_GET['ok'] === '1') : null;
$flashMsg = trim((string)($_GET['msg'] ?? ''));
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chi Tiết Hóa Đơn</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
    <?php render_khach_hang_header_styles(); ?>
    <style>
        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: linear-gradient(180deg, #edf2f7 0%, #f7fafc 45%, #f8fafc 100%);
            color: #0f172a;
        }

        .page-wrap {
            max-width: 1320px;
            margin: 0 auto;
            padding: 6px;
        }

        .detail-shell {
            border-radius: 14px;
            border: 1px solid #d7e1ec;
            background: #eef3f7;
            box-shadow: 0 8px 22px rgba(15, 23, 42, 0.08);
            overflow: hidden;
        }

        .hero-box {
            padding: 10px;
            background: linear-gradient(95deg, #1a66cb 0%, #1295be 58%, #17a37e 100%);
            color: #fff;
        }

        .hero-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
            margin-bottom: 10px;
        }

        .hero-title {
            margin: 0;
            font-size: clamp(1.1rem, 2.2vw, 2rem);
            font-weight: 800;
            line-height: 1.15;
        }

        .hero-subtitle {
            margin: 4px 0 0;
            font-size: 1rem;
            font-weight: 700;
            opacity: 0.95;
        }

        .hero-status {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            border-radius: 999px;
            padding: 4px 9px;
            font-size: 11px;
            font-weight: 800;
            border: 1px solid rgba(255, 255, 255, 0.45);
            background: rgba(255, 255, 255, 0.12);
            margin-left: 8px;
            vertical-align: middle;
        }

        .hero-progress {
            width: 86px;
            height: 86px;
            border-radius: 50%;
            border: 4px solid rgba(255, 255, 255, 0.5);
            background: rgba(255, 255, 255, 0.2);
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            text-align: center;
            line-height: 1.1;
            flex: 0 0 auto;
        }

        .hero-progress strong {
            font-size: 2rem;
        }

        .hero-progress small {
            font-size: 11px;
            font-weight: 700;
        }

        .hero-stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
        }

        .hero-stat {
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 10px;
            padding: 8px 10px;
            background: rgba(255, 255, 255, 0.08);
            min-height: 74px;
        }

        .hero-stat .label {
            margin: 0 0 2px;
            font-size: 11px;
            font-weight: 700;
            opacity: 0.92;
            display: inline-flex;
            align-items: center;
            gap: 5px;
        }

        .hero-stat .value {
            margin: 0;
            font-size: 1.15rem;
            font-weight: 800;
            line-height: 1.22;
            word-break: break-word;
        }

        .hero-stat .sub {
            margin: 2px 0 0;
            font-size: 12px;
            font-weight: 700;
            opacity: 0.95;
        }

        .content-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            padding: 10px;
        }

        .panel {
            border: 1px solid #cfd9e5;
            border-radius: 12px;
            background: #f2f6fa;
            overflow: hidden;
        }

        .panel-full {
            grid-column: 1 / -1;
        }

        .panel-head {
            padding: 8px 12px;
            background: #e8eef4;
            border-bottom: 1px solid #d4dee9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }

        .panel-title {
            margin: 0;
            font-size: clamp(1.2rem, 2.2vw, 2rem);
            line-height: 1.15;
            font-weight: 800;
            color: #1c446f;
        }

        .chip {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
            white-space: nowrap;
            background: #e7eef7;
            color: #36597e;
            border: 1px solid #d2dfec;
        }

        .chip.success {
            background: #def8ea;
            color: #138259;
            border-color: #c0ead3;
        }

        .chip.warning {
            background: #fff4da;
            color: #a56d0f;
            border-color: #f1dfb5;
        }

        .chip.danger {
            background: #fee4e4;
            color: #b13434;
            border-color: #f5c6c6;
        }

        .jobs-list {
            list-style: none;
            margin: 0;
            padding: 8px;
            display: grid;
            gap: 6px;
            counter-reset: job-step;
        }

        .jobs-list li {
            counter-increment: job-step;
            display: flex;
            align-items: flex-start;
            gap: 8px;
            border: 1px solid #c8e2d1;
            border-radius: 8px;
            padding: 8px 10px;
            background: #ecf7f1;
            font-size: 0.9rem;
            font-weight: 700;
            color: #2f4f47;
            line-height: 1.35;
        }

        .jobs-list li::before {
            content: counter(job-step);
            width: 20px;
            height: 20px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 800;
            color: #fff;
            background: #20a06d;
            flex: 0 0 20px;
            margin-top: 1px;
        }

        .jobs-meta {
            border-top: 1px solid #d4dee9;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            padding: 8px;
        }

        .jobs-meta-item {
            border: 1px solid #cfd9e5;
            border-radius: 8px;
            background: #dfe8f2;
            padding: 8px;
        }

        .label-xs {
            margin: 0 0 4px;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .4px;
            text-transform: uppercase;
            color: #5f7590;
        }

        .value-sm {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            color: #213d57;
            word-break: break-word;
        }

        .progress-block {
            padding: 10px;
            display: grid;
            gap: 8px;
        }

        .progress-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
            font-weight: 700;
            color: #496480;
        }

        .progress-wrap {
            height: 16px;
            border-radius: 999px;
            border: 1px solid #d3deea;
            background: #dce7f3;
            overflow: hidden;
        }

        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #19a56f, #29c38a);
        }

        .progress-bar.danger {
            background: linear-gradient(90deg, #d85a5a, #c73838);
        }

        .time-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            border: 1px solid #cfd9e5;
            border-radius: 8px;
            overflow: hidden;
            font-size: 0.9rem;
        }

        .time-table th,
        .time-table td {
            border-bottom: 1px solid #d9e2ec;
            padding: 7px 8px;
            text-align: left;
            font-weight: 700;
            color: #314d69;
        }

        .time-table th {
            background: #dfe8f2;
            font-size: 0.82rem;
        }

        .time-table tr:last-child td {
            border-bottom: 0;
        }

        .status-line {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            font-size: 0.93rem;
            font-weight: 700;
            color: #3c5875;
        }

        .muted-note {
            margin: 0;
            color: #64748b;
            font-size: 0.92rem;
        }

        .person-card {
            padding: 10px;
        }

        .person-head {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 8px;
        }

        .avatar {
            width: 66px;
            height: 66px;
            border-radius: 50%;
            border: 2px solid #dbe8f5;
            object-fit: cover;
            background: #fff;
            flex: 0 0 66px;
        }

        .person-name {
            margin: 0;
            font-size: 1.9rem;
            font-weight: 800;
            color: #1f3f61;
            line-height: 1.1;
        }

        .person-items {
            display: grid;
            gap: 6px;
        }

        .person-row {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            color: #2e4a66;
            display: flex;
            align-items: flex-start;
            gap: 7px;
        }

        .person-row i {
            color: #4b8cd4;
            margin-top: 2px;
        }

        .person-foot {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 10px;
        }

        .review-wrap {
            padding: 8px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }

        .review-box {
            border: 1px solid #d4dee9;
            border-radius: 10px;
            background: #f5f9fd;
            overflow: hidden;
        }

        .review-head {
            padding: 8px 10px;
            background: #eaf0f6;
            border-bottom: 1px solid #d4dee9;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
        }

        .review-title {
            margin: 0;
            font-size: 1rem;
            font-weight: 800;
            color: #254767;
        }

        .review-body {
            padding: 8px;
            display: grid;
            gap: 8px;
        }

        .review-text {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            color: #2d4a67;
            word-break: break-word;
        }

        .media-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
        }

        .media-grid img,
        .media-grid video {
            width: 100%;
            height: 120px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #d4dee9;
            background: #fff;
        }

        .media-empty {
            border: 1px dashed #c9d8e8;
            border-radius: 8px;
            padding: 8px;
            font-size: 0.85rem;
            font-weight: 700;
            color: #5f7590;
            text-align: center;
            grid-column: 1 / -1;
        }

        @media (max-width: 1199.98px) {
            .content-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 991.98px) {
            .hero-stats,
            .jobs-meta,
            .review-wrap {
                grid-template-columns: 1fr;
            }

            .hero-top {
                flex-direction: column;
                align-items: flex-start;
            }

            .person-name {
                font-size: 1.5rem;
            }
        }
    </style>
</head>
<body>
<?php render_khach_hang_header($sessionUser, 'Chi tiet hoa don khach hang', 'orders'); ?>
<div class="page-wrap">
    <?php if ($flashMsg !== ''): ?>
        <div class="alert <?= $flashOk ? 'alert-success' : 'alert-warning' ?> mb-3"><?= htmlspecialchars($flashMsg, ENT_QUOTES, 'UTF-8') ?></div>
    <?php endif; ?>

    <?php if ($loadError !== ''): ?>
        <div class="alert alert-warning mb-3"><?= htmlspecialchars($loadError, ENT_QUOTES, 'UTF-8') ?></div>
    <?php else: ?>
        <section class="detail-shell">
            <div class="hero-box">
                <div class="hero-top">
                    <div>
                        <h1 class="hero-title">Đơn <?= htmlspecialchars($invoiceCode, ENT_QUOTES, 'UTF-8') ?> <span class="hero-status"><?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8') ?></span></h1>
                        <p class="hero-subtitle"><?= htmlspecialchars($serviceName, ENT_QUOTES, 'UTF-8') ?></p>
                    </div>
                    <div class="hero-progress">
                        <strong><?= (int)round($progress) ?>%</strong>
                        <small>Hoàn thành</small>
                    </div>
                </div>

                <div class="hero-stats">
                    <article class="hero-stat">
                        <p class="label"><i class="bi bi-cash-coin"></i>Tổng tiền</p>
                        <p class="value"><?= htmlspecialchars($totalMoneyText, ENT_QUOTES, 'UTF-8') ?></p>
                    </article>
                    <article class="hero-stat">
                        <p class="label"><i class="bi bi-clock"></i>Thời gian</p>
                        <p class="value"><?= htmlspecialchars($planTimeRangeText, ENT_QUOTES, 'UTF-8') ?></p>
                        <p class="sub"><?= htmlspecialchars($planDayRangeText, ENT_QUOTES, 'UTF-8') ?></p>
                    </article>
                    <article class="hero-stat">
                        <p class="label"><i class="bi bi-geo-alt"></i>Địa chỉ</p>
                        <p class="value"><?= htmlspecialchars($addressText, ENT_QUOTES, 'UTF-8') ?></p>
                    </article>
                </div>
            </div>

            <div class="content-grid">
                <article class="panel">
                    <div class="panel-head">
                        <h2 class="panel-title">Công việc cần thực hiện</h2>
                    </div>
                    <ol class="jobs-list">
                        <?php foreach ($jobs as $job): ?>
                            <li><?= htmlspecialchars($job, ENT_QUOTES, 'UTF-8') ?></li>
                        <?php endforeach; ?>
                    </ol>
                    <div class="jobs-meta">
                        <div class="jobs-meta-item">
                            <p class="label-xs">Yêu cầu</p>
                            <p class="value-sm"><?= htmlspecialchars($requestExtra, ENT_QUOTES, 'UTF-8') ?></p>
                        </div>
                        <div class="jobs-meta-item">
                            <p class="label-xs">Ghi chú</p>
                            <p class="value-sm"><?= htmlspecialchars($note, ENT_QUOTES, 'UTF-8') ?></p>
                        </div>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-head">
                        <h2 class="panel-title" style="font-size:1.2rem;">Trạng thái, thời gian và tiến độ</h2>
                    </div>
                    <div class="progress-block">
                        <div class="progress-head">
                            <span>Tiến độ thực hiện</span>
                            <span><?= htmlspecialchars($progressText, ENT_QUOTES, 'UTF-8') ?>%</span>
                        </div>
                        <div class="progress-wrap">
                            <div class="progress-bar <?= $stateClass === 'danger' ? 'danger' : '' ?>" style="width: <?= htmlspecialchars($progressText, ENT_QUOTES, 'UTF-8') ?>%;"></div>
                        </div>
                        <p class="muted-note">Tiến độ cộng dồn theo từng ngày làm việc.</p>

                        <div class="status-line">
                            <span>Trạng thái:</span>
                            <span class="chip <?= htmlspecialchars($stateClass, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($statusText, ENT_QUOTES, 'UTF-8') ?></span>
                        </div>

                        

                        <table class="time-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>Thời gian dự kiến</th>
                                    <th>Thời gian thực tế</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Bắt đầu</td>
                                    <td><?= htmlspecialchars($planStartDateTimeText, ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><?= htmlspecialchars($realStartText, ENT_QUOTES, 'UTF-8') ?></td>
                                </tr>
                                <tr>
                                    <td>Kết thúc</td>
                                    <td><?= htmlspecialchars($planEndDateTimeText, ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><?= htmlspecialchars($realEndText, ENT_QUOTES, 'UTF-8') ?></td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="status-line">
                            <span>Ghi chú ngày</span>
                            <span><?= htmlspecialchars($dayHintText, ENT_QUOTES, 'UTF-8') ?></span>
                        </div>
                        <p class="muted-note">Số ngày kế hoạch: <?= (int)$daysPlan ?> ngày</p>
                        <?php if ($canCancel && $idNumber > 0): ?>
                            <form method="post" action="xu-ly-huy.php" onsubmit="return confirm('Bạn có chắc muốn hủy đơn này không?');">
                                <input type="hidden" name="action" value="cancel">
                                <input type="hidden" name="invoice_id" value="<?= (int)$idNumber ?>">
                                <input type="hidden" name="return_to" value="<?= htmlspecialchars('chi-tiet-hoa-don.php?id=' . $idNumber, ENT_QUOTES, 'UTF-8') ?>">
                                <button type="submit" class="btn btn-outline-danger btn-sm"><i class="bi bi-x-circle me-1"></i>Hủy đơn</button>
                            </form>
                        <?php endif; ?>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-head">
                        <h2 class="panel-title" style="font-size:1.8rem;">Khách hàng</h2>
                        <span class="chip success">Khách hàng</span>
                    </div>
                    <div class="person-card">
                        <div class="person-head">
                            <img class="avatar" src="<?= htmlspecialchars(trim((string)($sessionUser['anh_dai_dien'] ?? '')) !== '' ? (string)$sessionUser['anh_dai_dien'] : '../assets/logomvb.png', ENT_QUOTES, 'UTF-8') ?>" alt="avatar khách hàng">
                            <h3 class="person-name"><?= htmlspecialchars(trim((string)($invoice['tenkhachhang'] ?? '')) !== '' ? (string)$invoice['tenkhachhang'] : 'Khách hàng', ENT_QUOTES, 'UTF-8') ?></h3>
                        </div>
                        <div class="person-items">
                            <p class="person-row"><i class="bi bi-envelope-fill"></i><span><?= htmlspecialchars(trim((string)($invoice['emailkhachhang'] ?? '')) !== '' ? (string)$invoice['emailkhachhang'] : '---', ENT_QUOTES, 'UTF-8') ?></span></p>
                            <p class="person-row"><i class="bi bi-telephone-fill"></i><span><?= htmlspecialchars(trim((string)($invoice['sdtkhachhang'] ?? '')) !== '' ? (string)$invoice['sdtkhachhang'] : '---', ENT_QUOTES, 'UTF-8') ?></span></p>
                            <p class="person-row"><i class="bi bi-geo-alt-fill"></i><span><?= htmlspecialchars(trim((string)($invoice['diachikhachhang'] ?? '')) !== '' ? (string)$invoice['diachikhachhang'] : '---', ENT_QUOTES, 'UTF-8') ?></span></p>
                        </div>
                        <div class="person-foot">
                            <span class="chip">Năm sinh: <?= htmlspecialchars(trim((string)($sessionUser['ngaysinh'] ?? '')) !== '' ? (string)$sessionUser['ngaysinh'] : '---', ENT_QUOTES, 'UTF-8') ?></span>
                        </div>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-head">
                        <h2 class="panel-title" style="font-size:1.8rem;">Nhà Cung Cấp phụ trách</h2>
                        <span class="chip <?= $staffAssigned ? 'success' : 'warning' ?>"><?= $staffAssigned ? 'Đã nhận' : 'Chưa nhận' ?></span>
                    </div>
                    <div class="person-card">
                        <div class="person-head">
                            <img class="avatar" src="<?= htmlspecialchars(trim((string)($invoice['avatar_ncc'] ?? '')) !== '' ? (string)$invoice['avatar_ncc'] : '../assets/logomvb.png', ENT_QUOTES, 'UTF-8') ?>" alt="avatar nhà cung cấp">
                            <h3 class="person-name"><?= htmlspecialchars(trim((string)($invoice['tenncc'] ?? '')) !== '' ? (string)$invoice['tenncc'] : (trim((string)($invoice['hotenncc'] ?? '')) !== '' ? (string)$invoice['hotenncc'] : '---'), ENT_QUOTES, 'UTF-8') ?></h3>
                        </div>
                        <div class="person-items">
                            <p class="person-row"><i class="bi bi-envelope-fill"></i><span><?= htmlspecialchars(trim((string)($invoice['emailncc'] ?? '')) !== '' ? (string)$invoice['emailncc'] : '---', ENT_QUOTES, 'UTF-8') ?></span></p>
                            <p class="person-row"><i class="bi bi-telephone-fill"></i><span><?= htmlspecialchars(trim((string)($invoice['sdtncc'] ?? '')) !== '' ? (string)$invoice['sdtncc'] : (trim((string)($invoice['sodienthoaincc'] ?? '')) !== '' ? (string)$invoice['sodienthoaincc'] : '---'), ENT_QUOTES, 'UTF-8') ?></span></p>
                            <p class="person-row"><i class="bi bi-geo-alt-fill"></i><span><?= htmlspecialchars(trim((string)($invoice['diachincc'] ?? '')) !== '' ? (string)$invoice['diachincc'] : '---', ENT_QUOTES, 'UTF-8') ?></span></p>
                        </div>
                        <div class="person-foot">
                            <span class="chip">Nhận việc: <?= htmlspecialchars(trim((string)($invoice['ngaynhan'] ?? '')) !== '' ? (string)$invoice['ngaynhan'] : '---', ENT_QUOTES, 'UTF-8') ?></span>
                            <span class="chip">Kinh nghiệm: ---</span>
                        </div>
                    </div>
                </article>

                <article class="panel panel-full">
                    <div class="panel-head">
                        <h2 class="panel-title" style="font-size:1.45rem;">Ảnh và đánh giá</h2>
                        <span class="chip">Minh chứng</span>
                    </div>
                    <div class="review-wrap">
                        <section class="review-box">
                            <div class="review-head">
                                <h3 class="review-title">Đánh giá khách hàng</h3>
                                <span class="chip <?= $customerReviewHasData ? 'success' : 'warning' ?>"><?= $customerReviewHasData ? 'Đã có' : 'Chưa có' ?></span>
                            </div>
                            <div class="review-body">
                                <p class="label-xs">Nội dung đánh giá</p>
                                <p class="review-text"><?= htmlspecialchars($customerReviewText !== '' ? $customerReviewText : 'Chưa có đánh giá', ENT_QUOTES, 'UTF-8') ?></p>
                                <p class="label-xs">Thời gian gửi</p>
                                <p class="review-text"><?= htmlspecialchars($customerReviewTime !== '' ? $customerReviewTime : '---', ENT_QUOTES, 'UTF-8') ?></p>
                                <p class="label-xs">Ảnh/video đánh giá</p>
                                <div class="media-grid">
                                    <?php if (!$customerReviewMedia): ?>
                                        <div class="media-empty">Chưa có tệp</div>
                                    <?php else: ?>
                                        <?php foreach ($customerReviewMedia as $mediaPath): ?>
                                            <?php if (mevabe_media_is_video($mediaPath)): ?>
                                                <video controls preload="metadata" src="<?= htmlspecialchars($mediaPath, ENT_QUOTES, 'UTF-8') ?>"></video>
                                            <?php else: ?>
                                                <img src="<?= htmlspecialchars($mediaPath, ENT_QUOTES, 'UTF-8') ?>" alt="media đánh giá khách hàng">
                                            <?php endif; ?>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </div>

                                <?php if ($canReview && $idNumber > 0): ?>
                                    <form method="post" action="xu-ly-huy.php" enctype="multipart/form-data" class="mt-2 d-grid gap-2">
                                        <input type="hidden" name="action" value="save_review">
                                        <input type="hidden" name="invoice_id" value="<?= (int)$idNumber ?>">
                                        <input type="hidden" name="return_to" value="<?= htmlspecialchars('chi-tiet-hoa-don.php?id=' . $idNumber, ENT_QUOTES, 'UTF-8') ?>">
                                        <textarea name="review_text" class="form-control form-control-sm" rows="3" placeholder="Nhập nội dung đánh giá"><?= htmlspecialchars($customerReviewText, ENT_QUOTES, 'UTF-8') ?></textarea>
                                        <input type="file" name="review_media[]" class="form-control form-control-sm" accept="image/*,video/*" multiple>
                                        <div>
                                            <button type="submit" class="btn btn-primary btn-sm"><i class="bi bi-save me-1"></i>Lưu đánh giá</button>
                                        </div>
                                    </form>
                                <?php elseif (!$customerReviewHasData && $reviewBlockedMessage !== ''): ?>
                                    <p class="muted-note mb-0"><?= htmlspecialchars($reviewBlockedMessage, ENT_QUOTES, 'UTF-8') ?></p>
                                <?php endif; ?>
                            </div>
                        </section>

                        <section class="review-box">
                            <div class="review-head">
                                <h3 class="review-title">Đánh giá nhà cung cấp</h3>
                                <span class="chip <?= $supplierReviewHasData ? 'success' : 'warning' ?>"><?= $supplierReviewHasData ? 'Đã có' : 'Chưa có' ?></span>
                            </div>
                            <div class="review-body">
                                <p class="label-xs">Nội dung đánh giá</p>
                                <p class="review-text"><?= htmlspecialchars($supplierReviewText !== '' ? $supplierReviewText : 'Chưa có đánh giá', ENT_QUOTES, 'UTF-8') ?></p>
                                <p class="label-xs">Thời gian gửi</p>
                                <p class="review-text"><?= htmlspecialchars($supplierReviewTime !== '' ? $supplierReviewTime : '---', ENT_QUOTES, 'UTF-8') ?></p>
                                <p class="label-xs">Ảnh/video đánh giá</p>
                                <div class="media-grid">
                                    <?php if (!$supplierReviewMedia): ?>
                                        <div class="media-empty">Chưa có tệp</div>
                                    <?php else: ?>
                                        <?php foreach ($supplierReviewMedia as $mediaPath): ?>
                                            <?php if (mevabe_media_is_video($mediaPath)): ?>
                                                <video controls preload="metadata" src="<?= htmlspecialchars($mediaPath, ENT_QUOTES, 'UTF-8') ?>"></video>
                                            <?php else: ?>
                                                <img src="<?= htmlspecialchars($mediaPath, ENT_QUOTES, 'UTF-8') ?>" alt="media đánh giá nhà cung cấp">
                                            <?php endif; ?>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </section>
                    </div>
                </article>
            </div>
        </section>
    <?php endif; ?>
</div>
<?php render_khach_hang_layout_end(); ?>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
