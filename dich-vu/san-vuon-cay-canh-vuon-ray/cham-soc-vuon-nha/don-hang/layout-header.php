<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Nếu là AJAX request (từ SPA), không hiển thị layout header
if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && $_SERVER['HTTP_X_REQUESTED_WITH'] === 'XMLHttpRequest') {
    return;
}

if (!isset($_SESSION['user'])) {
    ob_start();
    include_once __DIR__ . '/../session_user.php';
    ob_end_clean();
}

if (!headers_sent()) {
    header('Content-Type: text/html; charset=utf-8');
}

$userName    = (string) ($_SESSION['user']['hovaten'] ?? $_SESSION['user']['ten'] ?? 'Người dùng');
$userFileId  = $_SESSION['user']['avatartenfile'] ?? '';
$isDriveAvatar = !empty($userFileId);
$userInitial = mb_strtoupper(mb_substr($userName, 0, 1, 'UTF-8'), 'UTF-8');

$current_page = basename($_SERVER['PHP_SELF']);
$pageTitle    = $pageTitle ?? 'Chăm Sóc Vườn Nhà - Đơn Hàng';

/* Map trang → icon + nhãn breadcrumb */
$pageMap = [
    'index.php'            => ['bi-receipt',      'Danh sách đơn hàng'],
    'don-hang-cua-toi.php' => ['bi-bag-check',    'Đơn hàng của tôi'],
    'chi-tiet-hoa-don.php' => ['bi-file-earmark-text', 'Chi tiết đơn hàng'],
];
$pageIcon  = $pageMap[$current_page][0] ?? 'bi-house';
$pageLabel = $pageMap[$current_page][1] ?? $pageTitle;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($pageTitle); ?> — Vườn Nhà</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <style>
        /* ═══════════════════════════════════════
           DESIGN SYSTEM — đồng nhất với Admin
        ═══════════════════════════════════════ */
        :root {
            --g900: #0d2b14;
            --g800: #1a4d2e;
            --g700: #1e5c35;
            --g600: #2e7d32;
            --g500: #388e3c;
            --g400: #43a047;
            --g300: #66bb6a;
            --g200: #a5d6a7;
            --g100: #c8e6c9;
            --g50:  #e8f5e9;
            --g25:  #f1f8f1;

            --white:       #ffffff;
            --bg:          #f4f8f4;
            --border:      #dceadc;
            --border-soft: #eaf3ea;
            --text:        #1c2b1e;
            --muted:       #5a7060;

            --sb-from:          #0d2b14;
            --sb-to:            #1e5c35;
            --sb-active-bg:     rgba(255,255,255,.15);
            --sb-active-border: rgba(255,255,255,.6);
            --sb-text:          rgba(255,255,255,.82);
            --sb-text-hover:    #ffffff;
            --sb-width:         240px;
            --topbar-h:         64px;
            --mobile-h:         56px;

            --shadow-sm: 0 1px 4px rgba(13,43,20,.08);
            --shadow-md: 0 4px 16px rgba(13,43,20,.10);

            --r-sm:  8px;
            --r-md:  12px;
            --r-lg:  16px;
            --r-xl:  20px;

            --ease: cubic-bezier(.4,0,.2,1);
            --dur:  200ms;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body { height: 100%; overflow-x: hidden; scrollbar-gutter: stable; }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            font-size: 15px;
            line-height: 1.7;
            font-weight: 400;
            -webkit-font-smoothing: antialiased;
        }

        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--g200); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--g300); }

        /* ── SHELL ── */
        .dh-wrap { display: flex; min-height: 100vh; }

        /* ── SIDEBAR ── */
        .dh-sidebar {
            width: var(--sb-width);
            flex-shrink: 0;
            background: linear-gradient(175deg, var(--sb-from) 0%, var(--g700) 50%, var(--sb-to) 100%);
            display: flex;
            flex-direction: column;
            position: sticky;
            top: 0;
            height: 100vh;
            overflow-y: auto;
            overflow-x: hidden;
            z-index: 200;
            transition: left var(--dur) var(--ease);
        }
        .dh-sidebar::before {
            content: '';
            position: absolute; inset: 0;
            background:
                radial-gradient(ellipse at 10% 0%, rgba(255,255,255,.07) 0%, transparent 50%),
                radial-gradient(ellipse at 90% 100%, rgba(67,160,71,.12) 0%, transparent 50%);
            pointer-events: none;
        }
        .dh-sidebar-inner {
            position: relative; z-index: 1;
            display: flex; flex-direction: column;
            height: 100%;
            padding: 20px 14px 16px;
        }

        /* Brand */
        .dh-brand {
            display: flex; align-items: center; gap: 10px;
            padding: 4px 6px 20px;
            border-bottom: 1px solid rgba(255,255,255,.1);
            margin-bottom: 20px;
            text-decoration: none;
        }
        .dh-brand-logo {
            width: 42px; height: 42px;
            border-radius: var(--r-md);
            background: rgba(255,255,255,.95);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,.2);
            overflow: hidden;
            transition: transform var(--dur) var(--ease);
        }
        .dh-brand:hover .dh-brand-logo { transform: scale(1.06); }
        .dh-brand-logo img { width: 100%; height: 100%; object-fit: cover; }
        .dh-brand-name {
            font-size: 1rem; font-weight: 800; color: #fff;
            line-height: 1.2; white-space: nowrap;
            overflow: hidden; text-overflow: ellipsis;
        }
        .dh-brand-sub { font-size: .75rem; color: rgba(255,255,255,.45); font-weight: 500; }

        /* Nav label */
        .dh-nav-label {
            font-size: .72rem; font-weight: 700;
            letter-spacing: .7px; text-transform: uppercase;
            color: rgba(255,255,255,.35);
            padding: 14px 10px 6px;
            display: flex; align-items: center; gap: 8px;
        }
        .dh-nav-label::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,.08); }

        /* Nav links */
        .dh-nav { flex: 1; }
        .dh-nav-link {
            color: var(--sb-text);
            font-size: .92rem; font-weight: 500;
            border-radius: var(--r-md) !important;
            transition: background var(--dur) var(--ease), color var(--dur) var(--ease), transform var(--dur) var(--ease);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            padding: 9px 12px !important;
            display: flex; align-items: center; gap: 10px;
            text-decoration: none;
            margin-bottom: 2px;
        }
        .dh-nav-link i { font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0; opacity: .75; }
        .dh-nav-link:hover { background: rgba(255,255,255,.1); color: var(--sb-text-hover); transform: translateX(3px); }
        .dh-nav-link:hover i { opacity: 1; }
        .dh-nav-link.active {
            background: var(--sb-active-bg); color: #fff; font-weight: 700;
            box-shadow: inset 3px 0 0 var(--sb-active-border);
        }
        .dh-nav-link.active i { opacity: 1; }
        .dh-nav-link-logout {
            color: rgba(255,255,255,.45); font-size: .92rem; font-weight: 500;
            border-radius: var(--r-md) !important;
            transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
            display: flex; align-items: center; gap: 10px;
            padding: 9px 12px; text-decoration: none; margin-bottom: 2px;
        }
        .dh-nav-link-logout i { font-size: 1rem; width: 20px; text-align: center; }
        .dh-nav-link-logout:hover { background: rgba(220,38,38,.18); color: #fca5a5; }

        /* Sidebar footer */
        .dh-sidebar-footer {
            border-top: 1px solid rgba(255,255,255,.1);
            padding-top: 14px; margin-top: auto;
        }
        .dh-user-chip {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; border-radius: var(--r-md);
            background: rgba(255,255,255,.07);
        }
        .dh-avatar-circle {
            width: 36px; height: 36px; border-radius: 50%;
            background: linear-gradient(135deg, var(--g400), var(--g600));
            display: flex; align-items: center; justify-content: center;
            font-size: .88rem; font-weight: 800; color: #fff;
            flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,.2);
        }
        .dh-user-name {
            font-size: .86rem; font-weight: 700; color: rgba(255,255,255,.9);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .dh-user-role { font-size: .72rem; color: rgba(255,255,255,.45); margin-top: 1px; }

        /* ── MAIN ── */
        .dh-main { flex: 1; min-width: 0; display: flex; flex-direction: column; background: var(--bg); }

        /* Topbar */
        .dh-topbar {
            background: var(--white);
            border-bottom: 1px solid var(--border-soft);
            padding: 0 28px;
            height: var(--topbar-h);
            display: flex; align-items: center; justify-content: space-between; gap: 16px;
            position: sticky; top: 0; z-index: 100;
            box-shadow: var(--shadow-sm);
        }
        .dh-topbar-left { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .dh-mobile-toggle {
            display: none;
            width: 38px; height: 38px;
            border: 1px solid var(--border); border-radius: var(--r-sm);
            background: transparent; color: var(--g800);
            align-items: center; justify-content: center;
            cursor: pointer; transition: background var(--dur) var(--ease);
        }
        .dh-mobile-toggle:hover { background: var(--g50); }
        .dh-breadcrumb {
            display: flex; align-items: center; gap: 5px;
            font-size: .8rem; color: var(--muted); font-weight: 500;
        }
        .dh-breadcrumb .bc-sep { opacity: .35; font-size: .68rem; }
        .dh-breadcrumb .bc-cur { font-weight: 600; color: var(--g700); }
        .dh-page-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.1rem; font-weight: 700; color: var(--g800);
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            margin-top: 1px;
        }
        .dh-topbar-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .dh-topbar-divider { width: 1px; height: 24px; background: var(--border); }
        .dh-topbar-user {
            display: flex; align-items: center; gap: 8px;
            padding: 5px 12px 5px 5px;
            border-radius: 99px; border: 1px solid var(--border);
            background: var(--white); cursor: default;
            transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
        }
        .dh-topbar-user:hover { border-color: var(--g200); box-shadow: var(--shadow-sm); }
        .dh-topbar-avatar {
            width: 30px; height: 30px; border-radius: 50%;
            background: linear-gradient(135deg, var(--g600), var(--g400));
            display: flex; align-items: center; justify-content: center;
            font-size: .78rem; font-weight: 800; color: #fff; flex-shrink: 0;
            overflow: hidden;
        }
        .dh-topbar-avatar iframe { width: 100%; height: 100%; border: 0; }
        .dh-topbar-username { font-size: .86rem; font-weight: 600; color: var(--g800); }
        .dh-status-dot {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 4px 12px; border-radius: 99px;
            background: var(--g50); border: 1px solid var(--g100);
            font-size: .76rem; font-weight: 600; color: var(--g700);
        }

        /* Content */
        .dh-content { flex: 1; padding: 28px; }

        /* ── COMPONENT OVERRIDES ── */
        .card { border: 1px solid var(--border-soft); border-radius: var(--r-lg); box-shadow: var(--shadow-sm); background: var(--white); }
        .card-header {
            background: var(--g25) !important; border-bottom: 1px solid var(--border-soft) !important;
            border-radius: var(--r-lg) var(--r-lg) 0 0 !important;
            color: var(--g800) !important; font-weight: 700; font-size: .93rem; padding: .9rem 1.2rem;
        }
        .table thead th {
            background: var(--g25) !important; color: var(--g700);
            border-bottom: 1px solid var(--border) !important;
            font-weight: 700; font-size: .75rem; text-transform: uppercase;
            letter-spacing: .5px; padding: 12px 16px; white-space: nowrap;
        }
        .table tbody td { border-color: var(--border-soft); padding: 12px 16px; vertical-align: middle; font-size: .92rem; }
        .table-hover tbody tr:hover { background: var(--g25); }
        .btn { font-size: .88rem; font-weight: 600; }
        .btn-primary { background: var(--g600) !important; border-color: var(--g600) !important; color: #fff !important; }
        .btn-primary:hover, .btn-primary:focus { background: var(--g700) !important; border-color: var(--g700) !important; box-shadow: 0 4px 12px rgba(46,125,50,.3) !important; }
        .btn-success { background: var(--g400) !important; border-color: var(--g400) !important; color: #fff !important; }
        .btn-success:hover { background: var(--g500) !important; border-color: var(--g500) !important; }
        .form-control, .form-select { border-color: var(--border); border-radius: var(--r-sm); font-size: .92rem; color: var(--text); }
        .form-control:focus, .form-select:focus { border-color: var(--g400); box-shadow: 0 0 0 3px rgba(67,160,71,.15); }
        .form-label { font-weight: 700; color: var(--g800); font-size: .8rem; text-transform: uppercase; letter-spacing: .3px; margin-bottom: 5px; }
        .badge { font-size: .74rem; font-weight: 600; padding: .32em .62em; }
        .alert-success { background: var(--g50); border-color: var(--g100); color: var(--g800); }
        .page-link { color: var(--g600); font-size: .88rem; }
        .page-item.active .page-link { background: var(--g600); border-color: var(--g600); }
        .text-primary { color: var(--g600) !important; }
        .text-success { color: var(--g400) !important; }

        /* ── OVERLAY MOBILE ── */
        .dh-overlay {
            display: none; position: fixed; inset: 0;
            background: rgba(0,0,0,.45); z-index: 199;
            backdrop-filter: blur(2px);
        }
        .dh-overlay.active { display: block; }

        /* ── RESPONSIVE ── */
        @media (max-width: 991.98px) {
            .dh-sidebar {
                position: fixed; left: -260px; top: 0;
                height: 100vh; width: var(--sb-width);
                transition: left var(--dur) var(--ease); z-index: 300;
            }
            .dh-sidebar.open { left: 0; }
            .dh-mobile-toggle { display: flex; }
            .dh-content { padding: 16px; }
            .dh-topbar { padding: 0 16px; }
        }
        @media (max-width: 575.98px) {
            .dh-content { padding: 12px; }
            .dh-status-dot { display: none; }
        }
    </style>
</head>
<body>

<!-- Overlay mobile -->
<div class="dh-overlay" id="dhOverlay" onclick="dhCloseSidebar()"></div>

<div class="dh-wrap">

    <!-- ══════════ SIDEBAR ══════════ -->
    <aside class="dh-sidebar" id="dhSidebar">
        <div class="dh-sidebar-inner">

            <!-- Brand -->
            <a href="../index.html" class="dh-brand">
                <div class="dh-brand-logo">
                    <img src="../assets/images/logo2.jpg" alt="Vườn Nhà">
                </div>
                <div>
                    <div class="dh-brand-name">Vườn Nhà</div>
                    <div class="dh-brand-sub">Đơn hàng</div>
                </div>
            </a>

            <!-- Nav -->
            <nav class="dh-nav">
                <div class="dh-nav-label">Điều hướng</div>

                <a href="../index.html" class="dh-nav-link">
                    <i class="bi bi-house"></i><span>Trang chủ</span>
                </a>
                <a href="index.php"
                   class="dh-nav-link <?php echo $current_page === 'index.php' ? 'active' : ''; ?>"
                   data-page="index.php">
                    <i class="bi bi-receipt"></i><span>Danh sách đơn hàng</span>
                </a>
                <?php if (in_array('5', explode(',', $_SESSION['user']['id_dichvu'] ?? ''))): ?>
                <a href="don-hang-cua-toi.php"
                   class="dh-nav-link <?php echo $current_page === 'don-hang-cua-toi.php' ? 'active' : ''; ?>"
                   data-page="don-hang-cua-toi.php">
                    <i class="bi bi-bag-check"></i><span>Đơn hàng của tôi</span>
                </a>
                <?php endif; ?>

                <div class="dh-nav-label" style="margin-top:8px;">Tài khoản</div>

                <a href="../logout.php" class="dh-nav-link-logout">
                    <i class="bi bi-box-arrow-right"></i><span>Đăng xuất</span>
                </a>
            </nav>

            <!-- Footer user -->
            <div class="dh-sidebar-footer">
                <div class="dh-user-chip">
                    <div class="dh-avatar-circle"><?php echo htmlspecialchars($userInitial); ?></div>
                    <div style="min-width:0;">
                        <div class="dh-user-name"><?php echo htmlspecialchars($userName); ?></div>
                        <div class="dh-user-role"><i class="bi bi-person-check" style="font-size:.62rem;"></i> Người dùng</div>
                    </div>
                </div>
            </div>

        </div>
    </aside>

    <!-- ══════════ MAIN ══════════ -->
    <div class="dh-main">

        <!-- Topbar -->
        <header class="dh-topbar">
            <div class="dh-topbar-left">
                <button class="dh-mobile-toggle" onclick="dhOpenSidebar()" aria-label="Mở menu">
                    <i class="bi bi-list" style="font-size:1.1rem;"></i>
                </button>
                <div>
                    <div class="dh-breadcrumb">
                        <span><i class="bi bi-house-door" style="font-size:.78rem;"></i> Vườn Nhà</span>
                        <span class="bc-sep"><i class="bi bi-chevron-right" style="font-size:.68rem;"></i></span>
                        <span class="bc-cur"><?php echo htmlspecialchars($pageLabel); ?></span>
                    </div>
                    <div class="dh-page-title">
                        <i class="bi <?php echo htmlspecialchars($pageIcon); ?>" style="font-size:.9rem;margin-right:6px;opacity:.65;"></i><?php echo htmlspecialchars($pageTitle); ?>
                    </div>
                </div>
            </div>
            <div class="dh-topbar-right">
                <span class="dh-status-dot">
                    <span style="width:7px;height:7px;border-radius:50%;background:var(--g400);display:inline-block;"></span>
                    Đang hoạt động
                </span>
                <div class="dh-topbar-divider"></div>
                <div class="dh-topbar-user">
                    <div class="dh-topbar-avatar">
                        <?php if ($isDriveAvatar): ?>
                            <iframe src="https://drive.google.com/file/d/<?php echo htmlspecialchars($userFileId); ?>/preview" frameborder="0"></iframe>
                        <?php else: ?>
                            <?php echo htmlspecialchars($userInitial); ?>
                        <?php endif; ?>
                    </div>
                    <span class="dh-topbar-username d-none d-sm-inline"><?php echo htmlspecialchars($userName); ?></span>
                </div>
            </div>
        </header>

        <!-- Content -->
        <main class="dh-content" id="main-content">
