<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_hoadon.php';

$admin = admin_require_login();
$id    = (int) ($_GET['id'] ?? 0);

$detail = get_hoadon_by_id($id);
$row    = $detail['row'] ?? null;
$error  = (string) ($detail['error'] ?? '');

/* ── Lịch sử làm việc ── */
$workHistory = [];
if ($row) {
    $whResult   = get_work_history_by_datlich_id($id);
    $rawHistory = $whResult['rows'] ?? [];
    $groups     = [];
    foreach ($rawHistory as $rh) {
        $date = substr((string) ($rh['ngay_lam'] ?? ''), 0, 10);
        if ($date === '') continue;
        if (!isset($groups[$date])) {
            $groups[$date] = ['ngay_lam' => $date, 'start' => '', 'end' => '', 'note' => '', 'isAuto' => false];
        }
        if (!empty($rh['gio_bat_dau_trong_ngay']))  $groups[$date]['start']  = $rh['gio_bat_dau_trong_ngay'];
        if (!empty($rh['gio_ket_thuc_trong_ngay'])) $groups[$date]['end']    = $rh['gio_ket_thuc_trong_ngay'];
        if (!empty($rh['ghichu_cv_ngay']))           $groups[$date]['note']   = $rh['ghichu_cv_ngay'];
        if (($rh['is_auto_end'] ?? 0) == 1)          $groups[$date]['isAuto'] = true;
    }
    ksort($groups);
    $workHistory = array_values($groups);
}

/* ── Trạng thái & tiến độ ── */
$statusText = trim((string) ($row['trangthai'] ?? ''));
if ($statusText === '') $statusText = 'N/A';

$progressValue = (float) str_replace(',', '.', (string) ($row['tien_do'] ?? '0'));
if (!is_finite($progressValue)) $progressValue = 0.0;
$progressValue = max(0.0, min(100.0, $progressValue));
$progressText  = rtrim(rtrim(number_format($progressValue, 1, '.', ''), '0'), '.');
if ($progressText === '') $progressText = '0';

/* ── Công việc ── */
$jobItems = [];
$jobsRaw  = trim((string) ($row['cong_viec'] ?? ''));
if ($jobsRaw !== '') {
    $parts = preg_split('/\s*[\.\x{3002}]\s*/u', $jobsRaw) ?: [];
    foreach ($parts as $part) {
        $text = trim((string) $part);
        $text = preg_replace('/^[,;:\-\s]+/u', '', $text) ?? $text;
        if ($text !== '') $jobItems[] = $text;
    }
}

/* ── Badge ── */
$statusMeta = hoadon_status_meta($statusText);
$statusKey  = $statusMeta['key'] ?? 'other';
$badgeClass = match($statusKey) {
    'cancelled'  => 'danger',
    'completed'  => 'success',
    'in_progress'=> 'warning',
    'confirmed'  => 'success',
    default      => '',
};

$totalDays     = max(1, (int) ($row['so_ngay'] ?? 1));
$percentPerDay = number_format(100 / $totalDays, 2, '.', '');

admin_render_layout_start('Chi Tiết Đơn Chăm Sóc Vườn', 'orders', $admin);
?>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap"
    rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

<style>
    /* ── Đồng bộ design system xanh lá ── */
    :root {
        --bg: #f4f8f4;
        --surface: #ffffff;
        --text: #1a4d2e;
        --muted: #5a7060;
        --primary: #2e7d32;
        --border: #c8e6c9;
        --shadow: 0 8px 24px rgba(13,43,20,.10);
        --anim: 260ms cubic-bezier(.2,.7,.2,1);
        --radius-xl: 18px;
        --radius-lg: 14px;
        --radius-md: 10px;
    }

    .admin-main, .admin-main > main {
        background: var(--bg) !important;
        font-family: 'Inter', system-ui, sans-serif;
        color: var(--text);
    }

    .modal-card {
        width: min(1200px, 100%);
        margin: 0 auto 32px;
        border-radius: var(--radius-xl);
        background: var(--surface);
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
        overflow: visible;
        animation: showCard 380ms var(--anim) forwards;
    }
    @keyframes showCard {
        from { transform: translateY(6px); opacity: 0; }
        to   { transform: translateY(0);   opacity: 1; }
    }

    /* Style for iframes as avatars */
    .profile-avatar { display: block; margin: 0; border: 0; }

    /* ── Topbar trong card ── */
    .topbar {
        display: grid;
        grid-template-columns: auto minmax(0,1fr) auto;
        gap: 14px; align-items: center;
        padding: 18px 22px;
        background: linear-gradient(102deg, var(--g800) 0%, var(--g600) 60%, var(--g400) 100%);
        color: #fff;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        box-shadow: 0 6px 20px rgba(13,43,20,.18);
    }
    .topbar-logo {
        display: inline-flex; align-items: center; justify-content: center;
        width: 88px; height: 58px; padding: 5px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.35);
        background: rgba(255,255,255,.18);
        backdrop-filter: blur(4px);
        transition: transform var(--anim), background var(--anim);
        text-decoration: none;
    }
    .topbar-logo:hover { transform: translateY(-2px); background: rgba(255,255,255,.28); }
    .topbar-logo img { width: 68px; height: 46px; object-fit: contain; }
    .topbar-title {
        margin: 0;
        font-size: clamp(1rem,1.4vw,1.35rem);
        font-weight: 800; text-align: center;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;
    }

    .content { padding: 18px; }

    .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0,1fr));
        gap: 14px;
    }
    .panel {
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        background: var(--surface);
        box-shadow: 0 2px 8px rgba(13,43,20,.06);
        padding: 14px; min-height: 180px;
        display: flex; flex-direction: column; gap: 10px;
    }
    .panel-wide { grid-column: 1 / -1; }
    .panel-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .panel-title { margin: 0; font-size: 15px; font-weight: 800; color: var(--g800); }

    .badge {
        padding: 4px 10px; border-radius: 99px;
        font-size: 11px; font-weight: 700; letter-spacing: .2px;
        background: var(--g50); color: var(--g700);
        border: 1px solid var(--g100); white-space: nowrap;
    }
    .badge.success { background: var(--g50); color: var(--g700); border-color: var(--g200); }
    .badge.warning { background: #fff8e1; color: #e65100; border-color: #ffe082; }
    .badge.danger  { background: #ffebee; color: #c62828; border-color: #ffcdd2; }

    .field-label {
        font-size: 11px; font-weight: 700; color: var(--muted);
        margin: 0 0 3px; text-transform: uppercase; letter-spacing: .5px;
    }
    .field-value { margin: 0; font-size: 14px; font-weight: 600; word-break: break-word; color: var(--text); }

    #panelInvoice { padding: 0; min-height: auto; border: 0; box-shadow: none; background: transparent; }
    .invoice-hero {
        background: linear-gradient(118deg, var(--g800) 0%, var(--g600) 50%, var(--g400) 100%);
        border-radius: var(--radius-lg); padding: 18px; color: #fff;
    }
    .invoice-main { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 14px; }
    .invoice-headline { display: grid; gap: 8px; flex: 1; }
    .invoice-title-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .invoice-order-title { margin: 0; font-size: clamp(1.1rem,2vw,1.6rem); font-weight: 800; }
    .invoice-status-badge {
        display: inline-flex; align-items: center;
        padding: 4px 12px; border-radius: 99px;
        font-size: 11px; font-weight: 700;
        background: rgba(255,255,255,.22); border: 1px solid rgba(255,255,255,.35); color: #fff;
    }
    .invoice-status-badge.success { background: rgba(255,255,255,.25); }
    .invoice-status-badge.warning { background: rgba(255,200,0,.3); }
    .invoice-status-badge.danger  { background: rgba(220,38,38,.3); }
    .invoice-subtitle { margin: 0; font-size: 17px; font-weight: 600; opacity: .92; }

    .invoice-progress-ring {
        --p: 0;
        width: 116px; height: 116px; border-radius: 50%;
        background: conic-gradient(from -90deg, rgba(255,255,255,.9) calc(var(--p)*1%), rgba(255,255,255,.2) 0);
        padding: 7px; flex: 0 0 auto;
        box-shadow: 0 6px 20px rgba(13,43,20,.25);
    }
    .invoice-progress-core {
        width: 100%; height: 100%; border-radius: 50%;
        background: linear-gradient(150deg, rgba(255,255,255,.18) 0%, rgba(255,255,255,.08) 100%);
        display: grid; place-content: center; text-align: center;
        backdrop-filter: blur(4px); color: #fff;
    }
    .invoice-progress-core strong { font-size: 30px; line-height: 1; color: #fff; font-weight: 800; }
    .invoice-progress-core small  { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.8); }

    .invoice-summary { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 10px; }
    .invoice-item {
        display: flex; gap: 9px; align-items: flex-start;
        border: 1px solid rgba(255,255,255,.2);
        background: rgba(255,255,255,.12);
        border-radius: 12px; padding: 10px 12px; min-height: 88px;
    }
    .invoice-item-icon {
        width: 26px; height: 26px; border-radius: 99px;
        border: 1px solid rgba(255,255,255,.4);
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 11px; font-weight: 800;
        background: rgba(255,255,255,.25); color: #fff;
        flex: 0 0 26px; margin-top: 2px;
    }
    .invoice-item-content { display: grid; gap: 2px; min-width: 0; }
    .invoice-item-content p  { margin: 0; font-size: 11px; font-weight: 600; color: rgba(255,255,255,.8); }
    .invoice-item-content h4 { margin: 0; font-size: clamp(1rem,1.5vw,1.7rem); font-weight: 800; line-height: 1.15; word-break: break-word; color: #fff; }
    .invoice-item-content span { font-size: 11px; font-weight: 600; color: rgba(255,255,255,.85); }

    #panelJobs { padding: 0; overflow: hidden; gap: 0; border-color: var(--g200); }
    .jobs-header {
        padding: 12px 16px;
        background: linear-gradient(135deg, var(--g50) 0%, #fff 100%);
        border-bottom: 1px solid var(--border);
    }
    .jobs-title { margin: 0; font-size: 20px; font-weight: 800; color: var(--g800); }
    .jobs-body { padding: 12px; background: #fafffe; }
    .jobs-meta { padding: 10px; border-top: 1px solid var(--border); background: #fff; }

    .invoice-extra-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; }
    .invoice-extra-item { border: 1px solid var(--border); background: var(--g25); border-radius: 8px; padding: 8px 10px; }
    .invoice-extra-item.full-width { grid-column: 1 / -1; }

    .invoice-media-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin: 4px; }
    .invoice-media-item {
        border: 1px solid var(--border); background: var(--g25);
        border-radius: 8px; padding: 8px 10px;
        display: flex; flex-direction: column; gap: 6px; overflow: hidden; min-height: 72px;
    }
    .invoice-media-item .field-label { color: var(--g700); font-size: 10px; margin: 0; font-weight: 600; }
    .invoice-media-item img,
    .invoice-media-item video,
    .invoice-media-item iframe { width: 100%; flex: 1; object-fit: cover; border-radius: 5px; background: rgba(0,0,0,.04); display: block; }
    .invoice-media-item .media-empty-label { color: var(--muted); font-size: 11px; text-align: center; padding: 8px 0; flex: 1; }

    #invoiceJob {
        list-style: none; margin: 0; padding: 8px;
        border-radius: 10px; background: var(--g25);
        display: grid; gap: 6px; counter-reset: job-item;
    }
    #invoiceJob li {
        counter-increment: job-item;
        display: flex; align-items: center; gap: 8px;
        font-size: 13px; font-weight: 600; line-height: 1.45; color: var(--g800);
        border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; background: #fff;
    }
    #invoiceJob li::before {
        content: counter(job-item);
        flex: 0 0 22px; height: 22px; border-radius: 99px;
        background: var(--g400); color: #fff;
        font-size: 11px; font-weight: 800;
        display: inline-flex; align-items: center; justify-content: center;
    }

    #panelTime {
        background: linear-gradient(180deg, var(--g50) 0%, #fff 60%) !important;
        border-color: var(--g200) !important;
    }

    .progress-inner {
        height: 100%; width: 0;
        transition: width 420ms ease;
        background: linear-gradient(90deg, var(--g800) 0%, var(--g400) 100%);
        box-shadow: inset 0 -1px 0 rgba(255,255,255,.2);
    }

    #panelCustomer,
    #panelStaff {
        padding: 0;
        overflow: hidden;
        gap: 0;
        border-color: var(--g200);
    }

    .profile-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border);
        background: linear-gradient(135deg, var(--g50) 0%, #fff 100%);
    }

    .profile-title {
        margin: 0;
        font-size: 15px;
        font-weight: 800;
        color: var(--g800);
    }

    .profile-body {
        padding: 16px;
        display: grid;
        grid-template-columns: 80px 1fr;
        gap: 14px;
        align-items: start;
    }

    .profile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--g100);
        background: var(--g25);
    }

    .profile-main {
        display: grid;
        gap: 5px;
    }

    .profile-name {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: var(--g800);
    }

    .profile-contact,
    .profile-row {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--muted);
        display: flex;
        align-items: center;
        gap: 7px;
    }

    .profile-row::before,
    .profile-contact::before {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 99px;
        background: var(--g50);
        color: var(--g600);
        font-size: 10px;
        font-weight: 800;
        flex: 0 0 18px;
    }

    .contact-email::before  { content: '✉'; }
    .contact-phone::before  { content: '✆'; }
    .contact-address::before { content: '⌂'; }

    .profile-foot {
        padding: 0 16px 14px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }

    .profile-pill {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        border-radius: 8px;
        background: var(--g25);
        font-size: 12px;
        font-weight: 700;
        color: var(--g700);
        border: 1px solid var(--g100);
    }

    #panelMedia { border-color: var(--g200); }

    .review-split {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
    }

    .review-box {
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 12px;
        background: var(--g25);
        display: grid;
        gap: 10px;
    }

    .review-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
    }

    .review-title {
        margin: 0;
        font-size: 13px;
        font-weight: 800;
        color: var(--g800);
    }

    .review-display {
        display: grid;
        gap: 6px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--border);
        background: #fff;
    }

    .review-text,
    .review-time {
        margin: 0;
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
        word-break: break-word;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
    }

    th {
        background: var(--g600);
        color: #fff;
        padding: 8px 10px;
        text-align: left;
        font-weight: 700;
        letter-spacing: .3px;
    }

    td {
        padding: 7px 10px;
        border-bottom: 1px solid var(--border);
        color: var(--text);
        font-weight: 600;
    }

    tr:hover td { background: var(--g25); }

    /* --- iPad Responsive --- */
    @media (min-width: 769px) and (max-width: 1060px) {
        .invoice-main {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 20px !important;
        }
        .invoice-summary {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
        }
        .invoice-summary .invoice-item:last-child { grid-column: span 2 !important; }
        .grid, .info-grid, .invoice-extra-grid, .invoice-media-grid, .review-split {
            grid-template-columns: repeat(2, 1fr) !important;
        }
        .profile-body {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            gap: 16px !important;
        }
        .profile-main { flex: 1 !important; min-width: 0 !important; }
        .invoice-progress-ring { margin: 0 !important; flex-shrink: 0 !important; }
    }

    @media (max-width: 1060px) {
        .grid, .info-grid, .invoice-extra-grid, .invoice-media-grid, .review-split {
            grid-template-columns: 1fr;
        }
        .invoice-summary { grid-template-columns: 1fr; gap: 6px; }
        .profile-body { grid-template-columns: 1fr 72px; align-items: center; gap: 10px; }
        .profile-avatar { grid-column: 2; grid-row: 1; width: 64px; height: 64px; }
        .profile-main { grid-column: 1; grid-row: 1; }
        .invoice-main { flex-direction: column; align-items: flex-start; }
        .invoice-progress-ring { margin-inline: auto; }
    }

    @media (max-width: 768px) {
        .admin-main, .admin-main > main { padding: 8px !important; }
        .modal-card { margin: 0 auto !important; }
        .topbar { padding: 10px 12px; gap: 8px; }
        .topbar-title { font-size: 14px !important; white-space: normal !important; overflow: visible !important; line-height: 1.3; }
        .content { padding: 10px; }
        .grid { gap: 8px; }
        .panel { padding: 10px; gap: 8px; }
        .invoice-hero { padding: 10px; }
        .invoice-main { gap: 8px; margin-bottom: 8px; }
        .invoice-summary { gap: 6px; }
        .invoice-item { padding: 8px; min-height: auto; }
        .jobs-header, .jobs-body, .jobs-meta { padding: 10px; }
        .profile-head, .profile-body { padding: 10px; }
        .profile-foot { padding: 0 10px 10px; }
        .review-split { grid-template-columns: 1fr; }
        th, td { padding: 6px 8px; }
    }
</style>

<div class="modal-card">
    <header class="topbar">
        <a class="topbar-logo" href="index.php" aria-label="Quay lại">
            <img src="../assets/images/logo1.png" alt="Logo Chăm Sóc Vườn" />
        </a>
        <h1 class="topbar-title">Chi tiết đơn Chăm Sóc Vườn</h1>
        <a class="topbar-logo" href="../index.html" aria-label="Trang chủ">
            <img src="../assets/images/logo2.jpg" alt="Logo" />
        </a>
    </header>

    <div class="content">
        <?php if ($error !== '' || !is_array($row)): ?>
            <div class="alert alert-warning"><?= admin_h($error !== '' ? $error : 'Không tìm thấy đơn hàng.') ?></div>
        <?php else: ?>
            <section id="mainGrid" class="grid">
                <article class="panel panel-wide" id="panelInvoice">
                    <div class="invoice-hero">
                        <div class="invoice-main">
                            <div class="invoice-headline">
                                <div class="invoice-title-line">
                                    <h2 class="invoice-order-title">Đơn
                                        #<?= admin_h(str_pad((string) $row['id'], 7, '0', STR_PAD_LEFT)) ?></h2>
                                    <span class="invoice-status-badge <?= $badgeClass ?>"><?= admin_h($statusText) ?></span>
                                </div>
                                <p class="invoice-subtitle"><?= admin_h($row['dich_vu'] ?? 'N/A') ?></p>
                            </div>
                            <div class="invoice-progress-ring" style="--p:<?= (int) $progressValue ?>;">
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
                                    <h4><?= admin_h(number_format((float) ($row['tong_tien'] ?? 0))) ?>đ</h4>
                                </div>
                            </div>
                            <div class="invoice-item">
                                <span class="invoice-item-icon"><i class="fa fa-clock-o"></i></span>
                                <div class="invoice-item-content">
                                    <p>Thời gian</p>
                                    <h4 style="font-size: 16px;">
                                        <?= ($t1 = strtotime($row['gio_bat_dau_kehoach'] ?? '')) ? date('H:i', $t1) : '--:--' ?> - <?= ($t2 = strtotime($row['gio_ket_thuc_kehoach'] ?? '')) ? date('H:i', $t2) : '--:--' ?>
                                    </h4>
                                    <span><?= ($d1 = strtotime($row['ngay_bat_dau_kehoach'] ?? '')) ? date('d/m/Y', $d1) : '---' ?> -> <?= ($d2 = strtotime($row['ngay_ket_thuc_kehoach'] ?? '')) ? date('d/m/Y', $d2) : '---' ?></span>
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
                    <div class="invoice-media-grid">
                        <div class="invoice-media-item" id="invoiceMediaImage">
                            <p class="field-label">Ảnh</p>
                            <span class="media-empty-label" id="invoiceMediaImageEmpty">Chưa có ảnh</span>
                            <iframe id="invoiceMediaImageEl"
                                style="display:none;width:100%;flex:1;min-height:90px;border:0;border-radius:5px;"
                                allowfullscreen></iframe>
                        </div>
                        <div class="invoice-media-item" id="invoiceMediaVideo">
                            <p class="field-label">Video</p>
                            <span class="media-empty-label" id="invoiceMediaVideoEmpty">Chưa có video</span>
                            <iframe id="invoiceMediaVideoEl"
                                style="display:none;width:100%;flex:1;min-height:90px;border:0;border-radius:5px;"
                                allowfullscreen></iframe>
                        </div>
                    </div>
                </article>

                <article class="panel" id="panelTime">
                    <div class="panel-head">
                        <h2 class="panel-title">Trạng thái, thời gian và tiến độ</h2>
                    </div>
                    <div class="compact-mobile" style="display:grid;gap:6px;">
                        <div class="d-flex justify-content-between align-items-center fw-bold"
                            style="font-size:12px;color:#000;">
                            <span>Tiến độ thực hiện</span>
                            <span id="progressText"><?= $progressText ?>.00%</span>
                        </div>
                        <div
                            style="width:100%;height:21px;border-radius:999px;overflow:hidden;background:#fff;border:1px solid #2e7d32;">
                            <div class="progress-inner" style="width:<?= $progressText ?>%;"></div>
                        </div>
                        <?php
                        $totalDays = max(1, (int) ($row['so_ngay'] ?? 1));
                        $percentPerDay = number_format(100 / $totalDays, 2, '.', '');
                        ?>
                        <p id="progressHint" class="hint"
                            style="font-size:12px;margin-top:-2px; color: #1a4d2e; font-weight: 700;">
                            Mỗi ngày cộng <?= $percentPerDay ?>% (tổng <?= $totalDays ?> ngày). Tiến độ cộng dồn theo từng
                            ngày làm việc.
                        </p>
                    </div>

                    <div
                        style="border:1px solid #bfdbfe;border-radius:8px;overflow:hidden;background:#f4faf4;margin-bottom:8px;">
                        <div
                            style="display:grid;grid-template-columns:repeat(3,1fr);background:#2e7d32;color:#fff;font-size:11px;font-weight:800;text-align:center;">
                             <span class="compact-mobile" style="padding:7px 5px;border-right:1px solid rgba(0,0,0,0.05);">Dự kiến BĐ</span>
                            <span class="compact-mobile" style="padding:7px 5px;border-right:1px solid rgba(0,0,0,0.05);">Dự kiến KT</span>
                            <span class="compact-mobile" style="padding:7px 5px;">Số ngày</span>
                        </div>
                        <div
                            style="display:grid;grid-template-columns:repeat(3,1fr);font-size:11px;font-weight:700;text-align:center;">
                             <span class="compact-mobile"
                                style="padding:7px 5px;border-right:1px solid #bfdbfe; color: #1a4d2e;"><?= ($d1 = strtotime($row['ngay_bat_dau_kehoach'] ?? '')) ? date('d/m/Y', $d1) : '---' ?></span>
                            <span class="compact-mobile"
                                style="padding:7px 5px;border-right:1px solid #bfdbfe; color: #1a4d2e;"><?= ($d2 = strtotime($row['ngay_ket_thuc_kehoach'] ?? '')) ? date('d/m/Y', $d2) : '---' ?></span>
                            <span class="compact-mobile" style="padding:7px 5px; color: #1f3853;"><?= $totalDays ?> ngày</span>
                        </div>
                    </div>

                    <div class="d-flex align-items-center flex-wrap compact-mobile" style="gap:8px; margin-bottom: 8px;">
                        <span style="font-size:12px;font-weight:800;color:#000000;">Trạng thái:</span>
                        <span class="badge <?= $badgeClass ?>"><?= admin_h($statusText) ?></span>
                    </div>

                    <div
                        style="border:1px solid #bfdbfe;border-radius:8px;overflow:hidden;background:#f4faf4; margin-bottom: 8px;">
                        <div
                            style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:#2e7d32;color:#ffffff;font-size:12px;font-weight:800;">
                             <span class="compact-mobile" style="padding:7px 10px;">Thời gian dự kiến</span>
                            <span class="compact-mobile" style="padding:7px 10px;">Thời gian thực tế</span>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));">
                              <div style="border-right:1px solid #bfdbfe;">
                                <div class="time-line-row compact-mobile" style="display:flex; justify-content: space-between; align-items: center; gap:8px;padding:7px 10px;font-size:12px;">
                                    <span style="color:#1a4d2e;font-weight:700;">Bắt đầu</span>
                                    <span
                                        style="color:#1a4d2e;font-weight:800;"><?= ($t1 = strtotime($row['gio_bat_dau_kehoach'] ?? '')) ? date('H:i', $t1) : '--:--' ?></span>
                                </div>
                                <div class="time-line-row compact-mobile"
                                    style="display:flex; justify-content: space-between; align-items: center; gap:8px;padding:7px 10px;border-top:1px solid #bfdbfe;font-size:12px;">
                                    <span style="color:#1a4d2e;font-weight:700;">Kết thúc</span>
                                    <span
                                        style="color:#1a4d2e;font-weight:800;"><?= ($t2 = strtotime($row['gio_ket_thuc_kehoach'] ?? '')) ? date('H:i', $t2) : '--:--' ?></span>
                                </div>
                            </div>
                            <div>
                                <div class="time-line-row compact-mobile" style="display:flex; justify-content: space-between; align-items: center; gap:8px;padding:7px 10px;font-size:12px;">
                                    <span style="color:#1a4d2e;font-weight:700;">Bắt đầu</span>
                                    <span
                                        style="color:#1a4d2e;font-weight:800;"><?= ($tt1 = strtotime($row['thoigian_batdau_thucte'] ?? '')) ? date('d/m/Y H:i:s', $tt1) : '---' ?></span>
                                </div>
                                <div class="time-line-row compact-mobile"
                                    style="display:flex; justify-content: space-between; align-items: center; gap:8px;padding:7px 10px;border-top:1px solid #bfdbfe;font-size:12px;">
                                    <span style="color:#1a4d2e;font-weight:700;">Kết thúc</span>
                                    <span
                                        style="color:#1a4d2e;font-weight:800;"><?= ($tt2 = strtotime($row['thoigian_ketthuc_thucte'] ?? '')) ? date('d/m/Y H:i:s', $tt2) : '---' ?></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="workHistoryTable" style="margin-top:4px;">
                        <span style="font-size:12px;font-weight:800;color:#000000;">Lịch sử làm việc</span>
                        <div style="overflow-x:auto;margin-top:4px;">
                            <?php if ($workHistory): ?>
                                <table style="width:100%;border-collapse:collapse;font-size:12px;">
                                    <thead>
                                        <tr style="background:#2e7d32;color:#fff;">
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
                                            <tr style="border-bottom: 1px solid #bfdbfe;">
                                                <td style="padding:5px 8px;font-weight:700;color:#1a4d2e;">Ngày <?= $stt++ ?></td>
                                                <td style="padding:5px 8px;"><?= ($d = strtotime($wh['ngay_lam'] ?? '')) ? date('d/m/Y', $d) : '---' ?></td>
                                                <td style="padding:5px 8px;"><?= ($s = strtotime($wh['start'] ?? '')) ? date('H:i:s', $s) : '---' ?></td>
                                                <td style="padding:5px 8px;"><?= ($e = strtotime($wh['end'] ?? '')) ? date('H:i:s', $e) : '---' ?></td>
                                                <td style="padding:5px 8px;"><?= admin_h($wh['note']) ?></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            <?php else: ?>
                                <p style="font-size:12px;color:#2e7d32;margin:0;">Chưa có lịch sử làm việc.</p>
                            <?php endif; ?>
                        </div>
                    </div>
                </article>

                <article class="panel" id="panelCustomer">
                    <div class="profile-head">
                        <h2 class="profile-title">Khách hàng</h2>
                        <span class="badge success">Khách hàng</span>
                    </div>
                    <div class="profile-body compact-mobile" style="padding: 14px; display: grid; grid-template-columns: 88px 1fr; gap: 14px; align-items: start;">
                        <div style="position:relative; width:88px; height:88px; flex-shrink:0;">
                            <span id="avatarCustomerEmpty" style="display:none; position:absolute; inset:0; display:grid; place-items:center; font-size:10px; background:#f0f0f0; border-radius:50%;">---</span>
                            <iframe id="avatarCustomerEl" class="profile-avatar" style="display:none; position:absolute; width:100%; height:100%; border:0; border-radius:50%;" allowfullscreen></iframe>
                            <img id="avatarCustomerImg" class="profile-avatar" src="../assets/images/logo2.jpg" alt="Customer" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                        </div>
                        <div class="profile-main">
                            <h3 class="profile-name"><?= admin_h($row['tenkhachhang'] ?? '---') ?></h3>
                            <p class="profile-contact contact-email">
                                <span><?= admin_h($row['emailkhachhang'] ?? '---') ?></span>
                            </p>
                            <p class="profile-row contact-phone"><span><?= admin_h($row['sdtkhachhang'] ?? '---') ?></span>
                            </p>
                            <p class="profile-row contact-address">
                                <span><?= admin_h($row['diachikhachhang'] ?? '---') ?></span>
                            </p>
                        </div>
                    </div>
                </article>

                <article class="panel" id="panelStaff">
                    <div class="profile-head">
                        <h2 class="profile-title">Nhà Cung Cấp</h2>
                        <span
                            class="badge warning"><?= (int) ($row['id_nhacungcap'] ?? 0) > 0 ? 'Đã nhận' : 'Chưa nhận' ?></span>
                    </div>
                    <div class="profile-body compact-mobile" style="padding: 14px; display: grid; grid-template-columns: 88px 1fr; gap: 14px; align-items: start;">
                        <div style="position:relative; width:88px; height:88px; flex-shrink:0;">
                            <span id="avatarStaffEmpty" style="display:none; position:absolute; inset:0; display:grid; place-items:center; font-size:10px; background:#f0f0f0; border-radius:50%;">---</span>
                            <iframe id="avatarStaffEl" class="profile-avatar" style="display:none; position:absolute; width:100%; height:100%; border:0; border-radius:50%;" allowfullscreen></iframe>
                            <img id="avatarStaffImg" class="profile-avatar" src="../assets/images/logo2.jpg" alt="Staff" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">
                        </div>
                        <div class="profile-main">
                            <h3 class="profile-name"><?= admin_h($row['tenncc'] ?? '---') ?></h3>
                            <p class="profile-contact contact-email"><span><?= admin_h($row['emailncc'] ?? '---') ?></span>
                            </p>
                            <p class="profile-row contact-phone"><span><?= admin_h($row['sdtncc'] ?? '---') ?></span></p>
                            <p class="profile-row contact-address"><span><?= admin_h($row['diachincc'] ?? '---') ?></span>
                            </p>
                        </div>
                    </div>
                    <div class="profile-foot">
                        <span class="profile-pill">Nhận việc: <?= ($t = strtotime($row['ngaynhan'] ?? '')) ? date('d/m/Y H:i:s', $t) : '---' ?></span>
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
                                <p class="review-time"><?= ($t = strtotime($row['thoigian_danhgia_khachhang'] ?? '')) ? date('d/m/Y H:i:s', $t) : '---' ?></p>
                                <p class="field-label">Minh chứng</p>
                                <div class="invoice-media-item" style="border:0;padding:0;min-height:auto;background:transparent;">
                                    <span class="media-empty-label" id="reviewCustomerMediaEmpty" style="font-size:10px; text-align:left; padding:0;">Chưa có minh chứng</span>
                                    <iframe id="reviewCustomerMediaEl" style="display:none;width:100%;min-height:120px;border:0;border-radius:8px;" allowfullscreen></iframe>
                                </div>
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
                                <p class="review-time"><?= ($t = strtotime($row['thoigian_danhgia_nhanvien'] ?? '')) ? date('d/m/Y H:i:s', $t) : '---' ?></p>
                                <p class="field-label">Minh chứng</p>
                                <div class="invoice-media-item" style="border:0;padding:0;min-height:auto;background:transparent;">
                                    <span class="media-empty-label" id="reviewStaffMediaEmpty" style="font-size:10px; text-align:left; padding:0;">Chưa có minh chứng</span>
                                    <iframe id="reviewStaffMediaEl" style="display:none;width:100%;min-height:120px;border:0;border-radius:8px;" allowfullscreen></iframe>
                                </div>
                            </div>
                        </section>
                    </div>
                </article>
            </section>
        <?php endif; ?>
    </div>
</div>

<script>
    (function () {
        const $ = id => document.getElementById(id);
        const row = <?= json_encode($row) ?>;

        function renderDriveFrame(rawId, frameId, emptyId, imgId) {
            const frame = $(frameId);
            const emptyEl = $(emptyId);
            const imgEl = $(imgId);
            if (!frame || !emptyEl) return;

            const id = String(rawId || '').trim().replace(/[\[\]" ]/g, '').split(',')[0];
            if (!id || id.length < 10) { 
                emptyEl.style.display = (imgEl ? 'none' : 'block');
                frame.style.display = 'none';
                if (imgEl) imgEl.style.display = 'block';
                return;
            }

            const url = 'https://drive.google.com/file/d/' + id + '/preview';
            frame.src = url;
            emptyEl.style.display = 'none';
            frame.style.display = 'block';
            if (imgEl) imgEl.style.display = 'none';
        }

        if (row) {
            renderDriveFrame(row.anh_id, 'invoiceMediaImageEl', 'invoiceMediaImageEmpty');
            renderDriveFrame(row.video_id, 'invoiceMediaVideoEl', 'invoiceMediaVideoEmpty');
            renderDriveFrame(row.avatar_khachhang, 'avatarCustomerEl', 'avatarCustomerEmpty', 'avatarCustomerImg');
            renderDriveFrame(row.avatar_ncc, 'avatarStaffEl', 'avatarStaffEmpty', 'avatarStaffImg');
            renderDriveFrame(row.media_danhgia_khachhang, 'reviewCustomerMediaEl', 'reviewCustomerMediaEmpty');
            renderDriveFrame(row.media_danhgia_nhanvien, 'reviewStaffMediaEl', 'reviewStaffMediaEmpty');
        }
    })();
</script>

<?php admin_render_layout_end(); ?>