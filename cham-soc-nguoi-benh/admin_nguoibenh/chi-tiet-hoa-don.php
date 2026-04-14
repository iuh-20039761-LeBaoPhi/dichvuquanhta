<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';

$admin = admin_require_login();
$id = (int) ($_GET['id'] ?? 0);

$detail = get_hoadon_by_id($id);
$row = $detail['row'] ?? null;
$error = (string) ($detail['error'] ?? '');

$workHistory = [];
if ($row) {
    $whResult = get_work_history_by_datlich_id($id);
    $rawHistory = $whResult['rows'] ?? [];
    
    // Gộp các row theo ngày giống JS
    $groups = [];
    foreach ($rawHistory as $rh) {
        $date = substr((string)($rh['ngay_lam'] ?? ''), 0, 10);
        if ($date === '') continue;
        
        if (!isset($groups[$date])) {
            $groups[$date] = [
                'ngay_lam' => $date,
                'start' => '',
                'end' => '',
                'note' => '',
                'isAuto' => false
            ];
        }
        
        if (!empty($rh['gio_bat_dau_trong_ngay'])) $groups[$date]['start'] = $rh['gio_bat_dau_trong_ngay'];
        if (!empty($rh['gio_ket_thuc_trong_ngay'])) $groups[$date]['end'] = $rh['gio_ket_thuc_trong_ngay'];
        if (!empty($rh['ghichu_cv_ngay'])) $groups[$date]['note'] = $rh['ghichu_cv_ngay'];
        if (($rh['is_auto_end'] ?? 0) == 1) $groups[$date]['isAuto'] = true;
    }
    
    ksort($groups);
    $workHistory = array_values($groups);
}

$statusText = trim((string) ($row['trangthai'] ?? ''));
if ($statusText === '') {
    $statusText = 'N/A';
}

$progressValue = (float) str_replace(',', '.', (string) ($row['tien_do'] ?? '0'));
if (!is_finite($progressValue)) {
    $progressValue = 0.0;
}
$progressValue = max(0.0, min(100.0, $progressValue));
$progressText = rtrim(rtrim(number_format($progressValue, 1, '.', ''), '0'), '.');
if ($progressText === '') {
    $progressText = '0';
}

$jobItems = [];
$jobsRaw = trim((string) ($row['cong_viec'] ?? ''));
if ($jobsRaw !== '') {
    $parts = preg_split('/\s*[\.\x{3002}]\s*/u', $jobsRaw) ?: [];
    foreach ($parts as $part) {
        $text = trim((string) $part);
        $text = preg_replace('/^[,;:\-\s]+/u', '', $text) ?? $text;
        if ($text !== '') {
            $jobItems[] = $text;
        }
    }
}

$statusMeta = hoadon_status_meta($statusText);
$statusKey = $statusMeta['key'] ?? 'other';

$badgeClass = '';
if ($statusKey === 'cancelled') {
    $badgeClass = 'danger';
} elseif ($statusKey === 'completed') {
    $badgeClass = 'success';
} elseif ($statusKey === 'in_progress') {
    $badgeClass = 'warning';
} elseif ($statusKey === 'confirmed') {
    $badgeClass = 'success';
}

admin_render_layout_start('Chi Tiết Hóa Đơn', 'orders', $admin);
?>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

<style>
    :root {
        --bg: #f4f7fb;
        --surface: #ffffff;
        --surface-soft: #f8fbff;
        --text: #1b2a3a;
        --muted: #6a7a8a;
        --primary: #0f80f2;
        --success: #19a56f;
        --warning: #ed9f1a;
        --danger: #d14242;
        --border: #e5edf5;
        --shadow: 0 20px 45px rgba(20, 50, 80, 0.12);
        --radius-xl: 22px;
        --radius-lg: 16px;
        --radius-md: 12px;
        --anim: 260ms cubic-bezier(.2, .7, .2, 1);
    }

    .admin-main,
    .admin-main>main {
        background: radial-gradient(circle at 20% -10%, #e3f0ff 0, transparent 42%),
            radial-gradient(circle at 95% 120%, #e5fff4 0, transparent 38%),
            radial-gradient(circle at 85% 15%, rgb(248, 248, 248) 0, transparent 35%),
            radial-gradient(circle at 8% 88%, rgb(255, 255, 255) 0, transparent 30%),
            var(--bg) !important;
        font-family: "Be Vietnam Pro", sans-serif;
        color: var(--text);
    }

    .modal-card {
        width: min(1240px, 100%);
        margin: 20px auto;
        border-radius: var(--radius-xl);
        background: linear-gradient(180deg, #ffffff 0%, #fbfdff 62%, #fbfdff 100%);
        border: 1px solid rgba(16, 66, 113, 0.08);
        box-shadow: 0 24px 48px rgba(20, 50, 80, 0.12), 0 6px 20px rgba(138, 170, 209, 0.12);
        overflow: visible;
        animation: showCard 520ms var(--anim) forwards;
    }

    @keyframes showCard {
        from { transform: translateY(8px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }

    .topbar {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 20px 24px;
        background: linear-gradient(102deg, #1170d8 0%, #228be6 58%, #339af0 100%);
        color: #fff;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        box-shadow: 0 10px 24px rgba(8, 48, 82, 0.25);
    }

    .topbar-logo {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 98px;
        height: 66px;
        padding: 6px;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.42);
        background: rgba(255, 255, 255, 0.2);
        box-shadow: 0 10px 22px rgba(8, 48, 88, 0.2);
        backdrop-filter: blur(4px);
        transition: transform var(--anim), background var(--anim), border-color var(--anim);
        text-decoration: none;
    }

    .topbar-logo:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.56);
    }

    .topbar-logo img {
        width: 74px;
        height: 50px;
        object-fit: contain;
        filter: drop-shadow(0 4px 8px rgba(8, 48, 88, 0.35));
    }

    .topbar-title {
        margin: 0;
        font-size: clamp(1.05rem, 1.5vw, 1.5rem);
        font-weight: 700;
        letter-spacing: .2px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #fff;
    }

    .content {
        padding: 18px;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
    }

    .panel {
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        box-shadow: 0 12px 26px rgba(20, 50, 80, 0.12), 0 2px 8px rgba(191, 200, 219, 0.1);
        padding: 14px;
        min-height: 205px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .panel-wide {
        grid-column: 1 / -1;
    }

    .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .panel-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: #15314f;
    }

    .badge {
        padding: 5px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .2px;
        background: #e8f3ff;
        color: #0d4d96;
        border: 1px solid #c5e0ff;
        white-space: nowrap;
    }

    .badge.success {
        background: linear-gradient(135deg, #e3f0ff, #dff8ef);
        color: #0d4d96;
    }

    .badge.warning {
        background: linear-gradient(135deg, #f8fbff, #ffe9d5);
        color: #9d6408;
    }

    .badge.danger {
        background: #edf6ff;
        color: #1e40af;
    }

    .field-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--muted);
        margin: 0 0 4px;
        text-transform: uppercase;
        letter-spacing: .5px;
    }

    .field-value {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        word-break: break-word;
    }

    #panelInvoice {
        padding: 0;
        min-height: auto;
        border: 0;
        box-shadow: none;
        background: transparent;
    }

    .invoice-hero {
        background: linear-gradient(118deg, #1170d8 0%, #5eb4f2 48%, #8abaf2 72%, #d4e1ff 100%);
        border-radius: 16px;
        padding: 16px;
        color: #1b2a3a;
    }

    .invoice-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 14px;
        margin-bottom: 14px;
    }

    .invoice-headline {
        display: grid;
        gap: 10px;
        flex: 1;
    }

    .invoice-title-line {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .invoice-order-title {
        margin: 0;
        font-size: clamp(1.1rem, 2vw, 1.7rem);
        font-weight: 700;
    }

    .invoice-status-badge {
        display: inline-flex;
        align-items: center;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.35);
        color: #1b2a3a;
    }

    .invoice-status-badge.success { background-color: #19a56f; color: #fff; }
    .invoice-status-badge.warning { background-color: #ed9f1a; color: #fff; }
    .invoice-status-badge.danger { background-color: #d14242; color: #fff; }

    .invoice-subtitle {
        margin: 0;
        font-size: 19px;
        font-weight: 600;
        opacity: .95;
    }

    .invoice-progress-ring {
        --p: 0;
        width: 122px;
        height: 122px;
        border-radius: 50%;
        background: conic-gradient(from -90deg, #5eb4f2 calc(var(--p) * 1%), rgba(255, 255, 255, 0.34) 0);
        padding: 7px;
        flex: 0 0 auto;
        border: 2px solid #000;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22), 0 10px 22px rgba(8, 48, 82, 0.25);
    }

    .invoice-progress-core {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.22) 0, rgba(255, 255, 255, 0) 44%),
                    linear-gradient(150deg, rgba(179, 191, 245, 0.94) 0%, rgba(138, 188, 241, 0.93) 100%);
        border: 2px solid #000;
        display: grid;
        place-content: center;
        text-align: center;
        backdrop-filter: blur(4px);
        color: #fff;
    }

    .invoice-progress-core strong { font-size: 34px; line-height: 1; color: #0f80f2; }
    .invoice-progress-core small { font-size: 12px; font-weight: 700; color: #f9f3ff; }

    .invoice-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
    }

    .invoice-item {
        display: flex;
        gap: 9px;
        align-items: flex-start;
        border: 1px solid rgba(227, 240, 255, 0.6);
        background: rgba(27, 74, 130, 0.2);
        border-radius: 12px;
        padding: 10px 12px;
        min-height: 96px;
    }

    .invoice-item-icon {
        width: 27px;
        height: 27px;
        border-radius: 999px;
        border: 1px solid rgba(91, 4, 4, 0.4);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.576);
        color: #060606;
        flex: 0 0 27px;
        margin-top: 2px;
    }

    .invoice-item-content { display: grid; gap: 2px; min-width: 0; }
    .invoice-item-content p { margin: 0; font-size: 11px; font-weight: 600; opacity: .85; }
    .invoice-item-content h4 { margin: 0; font-size: clamp(1.05rem, 1.6vw, 1.9rem); font-weight: 700; line-height: 1.15; word-break: break-word; }
    .invoice-item-content span { font-size: 11px; font-weight: 600; opacity: .9; }

    #panelJobs { padding: 0; overflow: hidden; gap: 0; border-color: #0f80f2; }
    .jobs-header { padding: 12px 14px; background: linear-gradient(135deg, #1170d8 0%, #f8fbff 65%, #f4f7fb 100%); border-bottom: 1px solid #e5edf5; }
    .jobs-title { margin: 0; font-size: 27px; font-weight: 700; color: #15314f; }
    .jobs-body { padding: 12px; background: linear-gradient(180deg, #fcfcfc 0%, #f8fbff 70%, #fbfdff 100%); }
    .jobs-meta { padding: 10px; border-top: 1px solid #ffffff; background: #ffffff; }

    .invoice-extra-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    .invoice-extra-item { border: 1px solid #0f80f2; background: #f8fbff; border-radius: 8px; padding: 8px 10px; }
    .invoice-extra-item.full-width { grid-column: 1 / -1; }

    #invoiceJob { list-style: none; margin: 0; padding: 8px; border-radius: 10px; background: linear-gradient(145deg, #fafafa 0%, #e3f0ff 100%); display: grid; gap: 8px; counter-reset: job-item; }
    #invoiceJob li { counter-increment: job-item; display: flex; align-items: flex-start; gap: 8px; font-size: 13px; font-weight: 600; line-height: 1.45; color: #15314f; border: 1px solid #0d4d96; border-radius: 10px; padding: 10px; background: #fff; }
    #invoiceJob li::before { content: counter(job-item); flex: 0 0 22px; height: 22px; border-radius: 999px; background: #0f80f2; color: #fff; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 1px; }

    #panelTime { background: linear-gradient(180deg, #e3f0ff 0%, #f0f0f0 58%, #f8fbff 100%) !important; border-color: #0f80f2 !important; }
    .progress-inner { height: 100%; width: 0; transition: width 420ms ease; background: linear-gradient(90deg, #0f80f2 0%, #5eb4f2 55%, #77e2c0 100%); box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.2), 0 3px 8px rgba(20, 50, 80, 0.12); }

    #panelCustomer, #panelStaff { padding: 0; overflow: hidden; gap: 0; border-color: #15314f; }
    .profile-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 12px 14px; border-bottom: 1px solid #e5edf5; background: linear-gradient(135deg, #1170d8 0%, #f8fbff 55%, #e3f0ff 100%); }
    .profile-title { margin: 0; font-size: 18px; font-weight: 700; color: #15314f; }
    .profile-body { padding: 14px; display: grid; grid-template-columns: 88px 1fr; gap: 14px; align-items: start; }
    .profile-avatar { width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 3px solid #e5edf5; background: #f8fbff; }
    .profile-main { display: grid; gap: 4px; }
    .profile-name { margin: 0; font-size: 22px; font-weight: 700; color: #1b2a3a; }
    .profile-contact, .profile-row { margin: 0; font-size: 14px; font-weight: 700; color: #1b2a3a; display: flex; align-items: center; gap: 8px; }
    .profile-row::before, .profile-contact::before { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 999px; background: #e3f0ff; color: #0f80f2; font-size: 11px; line-height: 1; font-weight: 700; flex: 0 0 18px; }
    .contact-email::before { content: '✉'; }
    .contact-phone::before { content: '✆'; }
    .contact-address::before { content: '⌂'; }
    .profile-foot { padding: 0 14px 14px; display: flex; gap: 8px; flex-wrap: wrap; }
    .profile-pill { display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 10px; background: linear-gradient(135deg, #f8fbff 0%, #f8fbff 65%, #eaf8f3 100%); font-size: 13px; font-weight: 700; color: #15314f; border: 1px solid #e5edf5; }

    #panelMedia { border-color: #e5edf5; }
    .review-split { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .review-box { border: 1px solid #e5edf5; border-radius: 12px; padding: 10px; background: linear-gradient(180deg, #f8fbff 0%, #fbfdff 68%, #f6f1ff 100%); display: grid; gap: 10px; }
    .review-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .review-title { margin: 0; font-size: 14px; font-weight: 700; color: #15314f; }
    .review-display { display: grid; gap: 6px; padding: 8px; border-radius: 10px; border: 1px solid #e5edf5; background: #fff; }
    .review-text, .review-time { margin: 0; font-size: 13px; font-weight: 600; color: #6a7a8a; word-break: break-word; }

    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #1170d8; color: #000; padding: 6px 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5edf5; color: #1f3853; font-weight: 600; }

    @media (max-width: 1060px) {
        .grid, .info-grid, .invoice-extra-grid, .review-split { grid-template-columns: 1fr; }
        .invoice-summary { grid-template-columns: 1fr; gap: 6px; }
        .profile-body { grid-template-columns: 1fr 80px; align-items: center; gap: 12px; }
        .profile-avatar { grid-column: 2; grid-row: 1; width: 72px; height: 72px; }
        .profile-main { grid-column: 1; grid-row: 1; text-align: left; }
        .invoice-main { flex-direction: column; align-items: flex-start; }
        .invoice-progress-ring { margin-inline: auto; }
    }
</style>

<div class="modal-card">
    <header class="topbar">
        <a class="topbar-logo" href="index.php" aria-label="Quay lại">
            <img src="../assets/logo-he-thong.png" alt="Logo" />
        </a>
        <h1 class="topbar-title">Chi tiết hóa đơn chăm sóc người bệnh</h1>
        <a class="topbar-logo" href="#" aria-label="Logo Người Bệnh">
            <img src="../assets/logo-cham-soc-benh-nhan.png" alt="Logo" />
        </a>
    </header>

    <div class="content">
        <?php if ($error !== '' || !is_array($row)): ?>
            <div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Không tìm thấy hóa đơn.') ?></div>
        <?php else: ?>
            <section id="mainGrid" class="grid">
                <article class="panel panel-wide" id="panelInvoice">
                    <div class="invoice-hero">
                        <div class="invoice-main">
                            <div class="invoice-headline">
                                <div class="invoice-title-line">
                                    <h2 class="invoice-order-title">Đơn #<?= admin_h(str_pad((string)$row['id'], 7, '0', STR_PAD_LEFT)) ?></h2>
                                    <span class="invoice-status-badge <?= $badgeClass ?>"><?= admin_h($statusText) ?></span>
                                </div>
                                <p class="invoice-subtitle"><?= admin_h($row['dich_vu'] ?? 'N/A') ?></p>
                            </div>
                            <div class="invoice-progress-ring" style="--p:<?= (int)$progressValue ?>;">
                                <div class="invoice-progress-core">
                                    <strong><?= $progressText ?>%</strong>
                                    <small>Hoàn thành</small>
                                </div>
                            </div>
                        </div>

                        <div class="invoice-summary">
                            <div class="invoice-item">
                                <span class="invoice-item-icon"><i class="fa fa-usd"></i></span>
                                <div class="invoice-item-content">
                                    <p>Tổng tiền</p>
                                    <h4><?= admin_h(number_format((float)($row['tong_tien'] ?? 0))) ?>đ</h4>
                                </div>
                            </div>
                            <div class="invoice-item">
                                <span class="invoice-item-icon"><i class="fa fa-clock-o"></i></span>
                                <div class="invoice-item-content">
                                    <p>Thời gian</p>
                                    <h4 style="font-size: 16px;"><?= admin_h(($row['gio_bat_dau_kehoach'] ?? '--:--') . ' - ' . ($row['gio_ket_thuc_kehoach'] ?? '--:--')) ?></h4>
                                    <span><?= admin_h(($row['ngay_bat_dau_kehoach'] ?? '---') . ' -> ' . ($row['ngay_ket_thuc_kehoach'] ?? '---')) ?></span>
                                </div>
                            </div>
                            <div class="invoice-item">
                                <span class="invoice-item-icon"><i class="fa fa-map-marker"></i></span>
                                <div class="invoice-item-content">
                                    <p>Địa chỉ</p>
                                    <h4 style="font-size: 14px;"><?= admin_h($row['diachikhachhang'] ?? 'N/A') ?></h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>

                <article class="panel" id="panelJobs">
                    <div class="jobs-header">
                        <h2 class="jobs-title">Công việc thực hiện</h2>
                    </div>
                    <div class="jobs-body">
                        <?php if ($jobItems): ?>
                            <ol id="invoiceJob">
                                <?php foreach ($jobItems as $job): ?>
                                    <li><?= admin_h($job) ?></li>
                                <?php endforeach; ?>
                            </ol>
                        <?php else: ?>
                            <p class="field-value text-muted">Chưa cập nhật công việc.</p>
                        <?php endif; ?>
                    </div>
                    <div class="jobs-meta invoice-extra-grid">
                        <div class="invoice-extra-item">
                            <p class="field-label">Yêu cầu</p>
                            <p class="field-value"><?= admin_h($row['yeu_cau_khac'] ?? 'Không có') ?></p>
                        </div>
                        <div class="invoice-extra-item">
                            <p class="field-label">Ghi chú</p>
                            <p class="field-value"><?= admin_h($row['ghi_chu'] ?? 'Không có') ?></p>
                        </div>
                    </div>
                </article>

                <article class="panel" id="panelTime">
                    <div class="panel-head">
                        <h2 class="panel-title">Trạng thái, thời gian và tiến độ</h2>
                    </div>
                    <div style="display:grid;gap:6px;">
                        <div class="d-flex justify-content-between align-items-center fw-bold"
                            style="font-size:12px;color:#000;">
                            <span>Tiến độ thực hiện</span>
                            <span id="progressText"><?= $progressText ?>.00%</span>
                        </div>
                        <div
                            style="width:100%;height:21px;border-radius:999px;overflow:hidden;background:linear-gradient(180deg,#e3f0ff 0%,#ffffff 100%);border:1px solid #0d4d96;box-shadow:inset 0 1px 2px rgb(255, 255, 255);">
                            <div class="progress-inner" style="width:<?= $progressText ?>%;"></div>
                        </div>
                        <?php
                        $totalDays = max(1, (int)($row['so_ngay'] ?? 1));
                        $percentPerDay = number_format(100 / $totalDays, 2, '.', '');
                        ?>
                        <p id="progressHint" class="hint" style="font-size:12px;margin-top:-2px; color: #1b2a3a; font-weight: 700;">
                            Mỗi ngày cộng <?= $percentPerDay ?>% (tổng <?= $totalDays ?> ngày). Tiến độ cộng dồn theo từng ngày làm việc.
                        </p>
                    </div>

                    <div style="border:1px solid #e5edf5;border-radius:8px;overflow:hidden;background:#f8fbff;margin-bottom:8px;">
                        <div
                            style="display:grid;grid-template-columns:repeat(3,1fr);background:#1170d8;color:#000;font-size:11px;font-weight:700;text-align:center;">
                            <span style="padding:7px 5px;border-right:1px solid rgba(255,255,255,0.1);">Ngày bắt đầu dự kiến</span>
                            <span style="padding:7px 5px;border-right:1px solid rgba(255,255,255,0.1);">Ngày kết thúc dự kiến</span>
                            <span style="padding:7px 5px;">Số ngày</span>
                        </div>
                        <div
                            style="display:grid;grid-template-columns:repeat(3,1fr);font-size:11px;font-weight:700;text-align:center;">
                            <span
                                style="padding:7px 5px;border-right:1px solid #e5edf5; color: #1f3853;"><?= admin_h($row['ngay_bat_dau_kehoach'] ?? '---') ?></span>
                            <span
                                style="padding:7px 5px;border-right:1px solid #e5edf5; color: #1f3853;"><?= admin_h($row['ngay_ket_thuc_kehoach'] ?? '---') ?></span>
                            <span style="padding:7px 5px; color: #1f3853;"><?= $totalDays ?> ngày</span>
                        </div>
                    </div>

                    <div class="d-flex align-items-center flex-wrap" style="gap:8px; margin-bottom: 8px;">
                        <span style="font-size:12px;font-weight:700;color:#000000;">Trạng thái:</span>
                        <span class="badge warning" style="background:#fff3e0; color:#e67e22; border:1px solid #ffe0b2;"><?= admin_h($statusText) ?></span>
                    </div>

                    <div style="border:1px solid #e5edf5;border-radius:8px;overflow:hidden;background:#f8fbff; margin-bottom: 8px;">
                        <div
                            style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:#1170d8;color:#000000;font-size:12px;font-weight:700;">
                            <span style="padding:7px 10px;">Thời gian dự kiến</span>
                            <span style="padding:7px 10px;">Thời gian thực tế</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));">
                            <div style="border-right:1px solid #e5edf5;">
                                <div class="d-flex justify-content-between align-items-center"
                                    style="gap:8px;padding:7px 10px;font-size:12px;">
                                    <span style="color:#000000;font-weight:700;">Bắt đầu</span>
                                    <span style="color:#1f3853;font-weight:700;"><?= admin_h($row['gio_bat_dau_kehoach'] ?? '--:--') ?></span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center"
                                    style="gap:8px;padding:7px 10px;border-top:1px solid #e3ecf7;font-size:12px;">
                                    <span style="color:#000000;font-weight:700;">Kết thúc</span>
                                    <span style="color:#1f3853;font-weight:700;"><?= admin_h($row['gio_ket_thuc_kehoach'] ?? '--:--') ?></span>
                                </div>
                            </div>
                            <div>
                                <div class="d-flex justify-content-between align-items-center"
                                    style="gap:8px;padding:7px 10px;font-size:12px;">
                                    <span style="color:#000000;font-weight:700;">Bắt đầu</span>
                                    <span style="color:#1f3853;font-weight:700;"><?= admin_h($row['thoigian_batdau_thucte'] ?? '---') ?></span>
                                </div>
                                <div class="d-flex justify-content-between align-items-center"
                                    style="gap:8px;padding:7px 10px;border-top:1px solid #e3ecf7;font-size:12px;">
                                    <span style="color:#000000;font-weight:700;">Kết thúc</span>
                                    <span style="color:#1f3853;font-weight:700;"><?= admin_h($row['thoigian_ketthuc_thucte'] ?? '---') ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="workHistoryTable" style="margin-top:4px;">
                        <span style="font-size:12px;font-weight:700;color:#000000;">Lịch sử làm việc</span>
                        <div style="overflow-x:auto;margin-top:4px;">
                            <?php if ($workHistory): ?>
                                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                                    <thead>
                                        <tr style="background:#1170d8;color:#000;">
                                            <th style="padding:6px 8px;text-align:left;">Ngày thứ</th>
                                            <th style="padding:6px 8px;text-align:left;">Ngày làm</th>
                                            <th style="padding:6px 8px;text-align:left;">Bắt đầu</th>
                                            <th style="padding:6px 8px;text-align:left;">Kết thúc</th>
                                            <th style="padding:6px 8px;text-align:left;">Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody id="workHistoryBody">
                                        <?php 
                                        $stt = 1;
                                        $endPlanTime = $row['gio_ket_thuc_kehoach'] ?? '';
                                        foreach ($workHistory as $wh): 
                                            $isAutoEnd = ($wh['isAuto'] ?? false) || ($endPlanTime && $wh['end'] === $endPlanTime);
                                            $endDisplay = admin_h($wh['end'] !== '' ? $wh['end'] : 'Chưa kết thúc');
                                            if ($wh['end'] !== '' && $isAutoEnd) {
                                                $endDisplay .= ' <i class="fa fa-info-circle text-warning" title="NCC quên nhấn Kết Thúc" style="cursor:pointer;color:#f0ba2c;"></i>';
                                            }
                                        ?>
                                            <tr style="border-bottom: 1px solid #e5edf5;">
                                                <td style="padding:5px 8px;font-weight:700;color:#c21178;">Ngày <?= $stt++ ?></td>
                                                <td style="padding:5px 8px;"><?= admin_h($wh['ngay_lam']) ?></td>
                                                <td style="padding:5px 8px;"><?= admin_h($wh['start'] !== '' ? $wh['start'] : '---') ?></td>
                                                <td style="padding:5px 8px;"><?= $endDisplay ?></td>
                                                <td style="padding:5px 8px;"><?= admin_h($wh['note']) ?></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            <?php else: ?>
                                <p style="font-size:12px;color:#6a7a8a;margin:0;">Chưa có lịch sử làm việc.</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </article>

                <article class="panel" id="panelCustomer">
                    <div class="profile-head">
                        <h2 class="profile-title">Khách hàng</h2>
                        <span class="badge success">Khách hàng</span>
                    </div>
                    <div class="profile-body">
                        <img class="profile-avatar" src="../<?= admin_h($row['avatar_khachhang'] ?? 'assets/logo-cham-soc-benh-nhan.png') ?>" alt="Customer">
                        <div class="profile-main">
                            <h3 class="profile-name"><?= admin_h($row['tenkhachhang'] ?? '---') ?></h3>
                            <p class="profile-contact contact-email"><span><?= admin_h($row['emailkhachhang'] ?? '---') ?></span></p>
                            <p class="profile-row contact-phone"><span><?= admin_h($row['sdtkhachhang'] ?? '---') ?></span></p>
                            <p class="profile-row contact-address"><span><?= admin_h($row['diachikhachhang'] ?? '---') ?></span></p>
                        </div>
                    </div>
                    <div class="profile-foot">
                        <span class="profile-pill">Ngày đặt: <?= admin_h($row['ngaydat'] ?? '---') ?></span>
                    </div>
                </article>

                <article class="panel" id="panelStaff">
                    <div class="profile-head">
                        <h2 class="profile-title">Nhà Cung Cấp</h2>
                        <span class="badge warning"><?= (int)($row['id_nhacungcap'] ?? 0) > 0 ? 'Đã nhận' : 'Chưa nhận' ?></span>
                    </div>
                    <div class="profile-body">
                        <img class="profile-avatar" src="../<?= admin_h($row['avatar_ncc'] ?? 'assets/logo-cham-soc-benh-nhan.png') ?>" alt="Staff">
                        <div class="profile-main">
                            <h3 class="profile-name"><?= admin_h($row['tenncc'] ?? '---') ?></h3>
                            <p class="profile-contact contact-email"><span><?= admin_h($row['emailncc'] ?? '---') ?></span></p>
                            <p class="profile-row contact-phone"><span><?= admin_h($row['sdtncc'] ?? '---') ?></span></p>
                            <p class="profile-row contact-address"><span><?= admin_h($row['diachincc'] ?? '---') ?></span></p>
                        </div>
                    </div>
                    <div class="profile-foot">
                        <span class="profile-pill">Nhận việc: <?= admin_h($row['ngaynhan'] ?? '---') ?></span>
                        <span class="profile-pill">Kinh nghiệm: <?= admin_h($row['kinh_nghiem_ncc'] ?? 'Khong co') ?></span>
                    </div>
                </article>

                <article class="panel panel-wide" id="panelMedia">
                    <div class="panel-head">
                        <h2 class="panel-title">Đánh giá và minh chứng</h2>
                        <span class="badge">Đánh giá</span>
                    </div>
                    <div class="review-split">
                        <section class="review-box">
                            <div class="review-head">
                                <h3 class="review-title">Đánh giá khách hàng</h3>
                            </div>
                            <div class="review-display">
                                <p class="field-label">Nội dung</p>
                                <p class="review-text"><?= admin_h($row['danhgia_khachhang'] ?? 'Chưa có đánh giá') ?></p>
                                <p class="field-label">Thời gian</p>
                                <p class="review-time"><?= admin_h($row['thoigian_danhgia_khachhang'] ?? '---') ?></p>
                            </div>
                        </section>
                        <section class="review-box">
                            <div class="review-head">
                                <h3 class="review-title">Đánh giá nhà cung cấp</h3>
                            </div>
                            <div class="review-display">
                                <p class="field-label">Nội dung</p>
                                <p class="review-text"><?= admin_h($row['danhgia_nhanvien'] ?? 'Chưa có đánh giá') ?></p>
                                <p class="field-label">Thời gian</p>
                                <p class="review-time"><?= admin_h($row['thoigian_danhgia_nhanvien'] ?? '---') ?></p>
                            </div>
                        </section>
                    </div>
                </article>
            </section>
        <?php endif; ?>
    </div>
</div>

<?php admin_render_layout_end(); ?>
