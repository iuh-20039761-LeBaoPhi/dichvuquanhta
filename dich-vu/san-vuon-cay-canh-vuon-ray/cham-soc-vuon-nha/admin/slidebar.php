<?php
declare(strict_types=1);

if (!function_exists('admin_start_session')) {
    function admin_start_session(): void
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            session_start();
        }
    }
}

if (!function_exists('admin_h')) {
    function admin_h(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('admin_require_login')) {
    function admin_require_login(): array
    {
        admin_start_session();

        $isLogged = !empty($_SESSION['admin_logged_in']);
        $admin    = $_SESSION['admin_user'] ?? null;

        if (!$isLogged || !is_array($admin)) {
            header('Location: login.php');
            exit;
        }

        return $admin;
    }
}

if (!function_exists('admin_menu_link_class')) {
    function admin_menu_link_class(string $activeKey, string $key): string
    {
        $base = 'nav-link d-flex align-items-center gap-2 rounded-3 px-3 py-2 mb-1 fw-semibold';
        return $activeKey === $key ? $base . ' active' : $base;
    }
}

if (!function_exists('admin_render_layout_start')) {
    function admin_render_layout_start(string $title, string $activeKey, array $admin): void
    {
        if (!headers_sent()) {
            header('Content-Type: text/html; charset=utf-8');
        }
        $name  = trim((string) ($admin['name'] ?? $admin['ten'] ?? 'Quản trị viên'));
        $email = trim((string) ($admin['email'] ?? ''));
        $initials = mb_strtoupper(mb_substr($name, 0, 1, 'UTF-8'), 'UTF-8');

        /* Map activeKey → icon + label cho topbar breadcrumb */
        $pageMap = [
            'orders'   => ['bi-clipboard2-check', 'Quản lý đơn chăm sóc vườn'],
            'services' => ['bi-flower1',           'Quản lý dịch vụ vườn'],
            'phu_thu'  => ['bi-tag',               'Phụ phí đặc biệt'],
        ];
        $pageIcon  = $pageMap[$activeKey][0] ?? 'bi-tree';
        $pageLabel = $pageMap[$activeKey][1] ?? $title;
        ?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= admin_h($title) ?> — Quản trị Vườn Nhà</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <style>
        /* ═══════════════════════════════════════════════
           VƯỜN NHÀ ADMIN — DESIGN SYSTEM
           Theme: Forest Green · Earthy · Premium
        ═══════════════════════════════════════════════ */
        :root {
            /* Màu chủ đạo */
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

            /* Màu đất / nâu ấm */
            --earth: #5d4037;
            --earth-light: #8d6e63;
            --sand: #f5f0e8;
            --sand-dark: #ede0cc;

            /* Màu vàng lá */
            --leaf: #f9a825;
            --leaf-light: #fff8e1;

            /* Neutral */
            --white: #ffffff;
            --bg:    #f4f8f4;
            --surface: #ffffff;
            --border: #dceadc;
            --border-soft: #eaf3ea;
            --text: #1c2b1e;
            --muted: #5a7060;
            --placeholder: #9ab09a;

            /* Sidebar */
            --sb-from: #0d2b14;
            --sb-to:   #1e5c35;
            --sb-active-bg: rgba(255,255,255,.15);
            --sb-active-border: rgba(255,255,255,.6);
            --sb-text: rgba(255,255,255,.82);
            --sb-text-hover: #ffffff;

            /* Shadows */
            --shadow-sm: 0 1px 4px rgba(13,43,20,.08);
            --shadow-md: 0 4px 16px rgba(13,43,20,.10);
            --shadow-lg: 0 8px 32px rgba(13,43,20,.12);
            --shadow-xl: 0 16px 48px rgba(13,43,20,.14);

            /* Radius */
            --r-sm: 8px;
            --r-md: 12px;
            --r-lg: 16px;
            --r-xl: 20px;
            --r-2xl: 24px;

            /* Transition */
            --ease: cubic-bezier(.4,0,.2,1);
            --dur: 200ms;

            /* ── Alias tương thích ngược với các trang con ── */
            --pg:        #1a4d2e;
            --ag:        #4f6f52;
            --lime:      #e8f5e9;
            --accent:    #43a047;
            --sidebar-a: #0d2b14;
            --sidebar-b: #2e7d32;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body {
            height: 100%;
            overflow-x: hidden;
            scrollbar-gutter: stable;
        }

        body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            background: var(--bg);
            color: var(--text);
            font-size: 15.5px;
            line-height: 1.7;
            font-weight: 400;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* ── SCROLLBAR ── */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--g200); border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--g300); }

        /* ══════════════════════════════════════
           LAYOUT SHELL
        ══════════════════════════════════════ */
        .admin-wrap {
            display: flex;
            min-height: 100vh;
        }

        /* ══════════════════════════════════════
           SIDEBAR
        ══════════════════════════════════════ */
        .admin-sidebar {
            width: 240px;
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
            transition: width var(--dur) var(--ease);
        }

        /* Texture overlay */
        .admin-sidebar::before {
            content: '';
            position: absolute;
            inset: 0;
            background:
                radial-gradient(ellipse at 10% 0%, rgba(255,255,255,.07) 0%, transparent 50%),
                radial-gradient(ellipse at 90% 100%, rgba(67,160,71,.12) 0%, transparent 50%);
            pointer-events: none;
        }

        .sidebar-inner {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            height: 100%;
            padding: 20px 14px 16px;
        }

        /* Brand */
        .sidebar-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 4px 6px 20px;
            border-bottom: 1px solid rgba(255,255,255,.1);
            margin-bottom: 20px;
            text-decoration: none;
        }
        .sidebar-brand-logo {
            width: 42px; height: 42px;
            border-radius: var(--r-md);
            background: rgba(255,255,255,.95);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,.2);
            overflow: hidden;
            transition: transform var(--dur) var(--ease);
        }
        .sidebar-brand:hover .sidebar-brand-logo { transform: scale(1.06); }
        .sidebar-brand-logo img { width: 100%; height: 100%; object-fit: cover; }
        .sidebar-brand-text { min-width: 0; }
        .sidebar-brand-name {
            font-size: 1rem;
            font-weight: 800;
            color: #fff;
            line-height: 1.2;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sidebar-brand-sub {
            font-size: .78rem;
            color: rgba(255,255,255,.45);
            font-weight: 500;
            letter-spacing: .2px;
        }

        /* Nav section label */
        .sidebar-label {
            font-size: .74rem;
            font-weight: 700;
            letter-spacing: .7px;
            text-transform: uppercase;
            color: rgba(255,255,255,.35);
            padding: 16px 10px 6px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .sidebar-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(255,255,255,.08);
        }

        /* Nav links */
        .sidebar-nav { flex: 1; }
        .nav-link {
            color: var(--sb-text);
            font-size: .94rem;
            font-weight: 500;
            border-radius: var(--r-md) !important;
            transition: background var(--dur) var(--ease), color var(--dur) var(--ease), transform var(--dur) var(--ease);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 9px 12px !important;
        }
        .nav-link i {
            font-size: 1.05rem;
            width: 22px;
            text-align: center;
            flex-shrink: 0;
            opacity: .75;
        }
        .nav-link:hover {
            background: rgba(255,255,255,.1);
            color: var(--sb-text-hover);
            transform: translateX(3px);
        }
        .nav-link:hover i { opacity: 1; }
        .nav-link.active {
            background: var(--sb-active-bg);
            color: #fff;
            font-weight: 700;
            box-shadow: inset 3px 0 0 var(--sb-active-border);
        }
        .nav-link.active i { opacity: 1; }

        /* Logout link */
        .nav-link-logout {
            color: rgba(255,255,255,.45);
            font-size: .94rem;
            font-weight: 500;
            border-radius: var(--r-md) !important;
            transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 9px 12px;
            text-decoration: none;
            margin-bottom: 4px;
        }
        .nav-link-logout i { font-size: 1.05rem; width: 22px; text-align: center; }
        .nav-link-logout:hover {
            background: rgba(220,38,38,.18);
            color: #fca5a5;
        }

        /* Sidebar footer (user info) */
        .sidebar-footer {
            border-top: 1px solid rgba(255,255,255,.1);
            padding-top: 14px;
            margin-top: auto;
        }
        .sidebar-user {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: var(--r-md);
            background: rgba(255,255,255,.07);
        }
        .sidebar-avatar {
            width: 36px; height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--g400), var(--g600));
            display: flex; align-items: center; justify-content: center;
            font-size: .9rem; font-weight: 800; color: #fff;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(0,0,0,.2);
        }
        .sidebar-user-name {
            font-size: .88rem;
            font-weight: 700;
            color: rgba(255,255,255,.9);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .sidebar-user-role {
            font-size: .75rem;
            color: rgba(255,255,255,.45);
            margin-top: 1px;
        }

        /* ══════════════════════════════════════
           MAIN AREA
        ══════════════════════════════════════ */
        .admin-main {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            background: var(--bg);
        }

        /* ── TOPBAR ── */
        .admin-topbar {
            background: var(--white);
            border-bottom: 1px solid var(--border-soft);
            padding: 0 28px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--shadow-sm);
        }
        .topbar-left {
            display: flex;
            align-items: center;
            gap: 14px;
            min-width: 0;
        }
        .topbar-mobile-toggle {
            display: none;
            width: 38px; height: 38px;
            border: 1px solid var(--border);
            border-radius: var(--r-sm);
            background: transparent;
            color: var(--g800);
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background var(--dur) var(--ease);
        }
        .topbar-mobile-toggle:hover { background: var(--g50); }
        .topbar-breadcrumb {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: .82rem;
            color: var(--muted);
            font-weight: 500;
        }
        .topbar-breadcrumb .bc-sep {
            opacity: .35;
            font-size: .7rem;
        }
        .topbar-breadcrumb .bc-current {
            font-weight: 600;
            color: var(--g700);
        }
        .topbar-page-title {
            font-family: 'Playfair Display', serif;
            font-size: 1.15rem;
            font-weight: 700;
            color: var(--g800);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 1px;
        }
        .topbar-right {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }
        .topbar-badge-env {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            border-radius: 99px;
            background: var(--g50);
            border: 1px solid var(--g100);
            font-size: .78rem;
            font-weight: 600;
            color: var(--g700);
        }
        .topbar-divider {
            width: 1px; height: 24px;
            background: var(--border);
        }
        .topbar-user-chip {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 5px 12px 5px 5px;
            border-radius: 99px;
            border: 1px solid var(--border);
            background: var(--white);
            cursor: default;
            transition: border-color var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
        }
        .topbar-user-chip:hover {
            border-color: var(--g200);
            box-shadow: var(--shadow-sm);
        }
        .topbar-avatar {
            width: 32px; height: 32px;
            border-radius: 50%;
            background: linear-gradient(135deg, var(--g600), var(--g400));
            display: flex; align-items: center; justify-content: center;
            font-size: .82rem; font-weight: 800; color: #fff;
            flex-shrink: 0;
        }
        .topbar-user-name {
            font-size: .88rem;
            font-weight: 600;
            color: var(--g800);
        }

        /* ── CONTENT ── */
        .admin-content {
            flex: 1;
            padding: 28px;
        }

        /* ══════════════════════════════════════
           COMPONENT OVERRIDES
        ══════════════════════════════════════ */

        /* Cards */
        .card {
            border: 1px solid var(--border-soft);
            border-radius: var(--r-lg);
            box-shadow: var(--shadow-sm);
            background: var(--white);
        }
        .card-header {
            background: var(--g25) !important;
            border-bottom: 1px solid var(--border-soft) !important;
            border-radius: var(--r-lg) var(--r-lg) 0 0 !important;
            color: var(--g800) !important;
            font-weight: 700;
            font-size: .95rem;
            padding: 1rem 1.35rem;
        }

        /* Tables */
        .table thead th {
            background: var(--g25) !important;
            color: var(--g700);
            border-bottom: 1px solid var(--border) !important;
            font-weight: 700;
            font-size: .78rem;
            text-transform: uppercase;
            letter-spacing: .5px;
            padding: 14px 18px;
            white-space: nowrap;
        }
        .table tbody td {
            border-color: var(--border-soft);
            padding: 14px 18px;
            vertical-align: middle;
            font-size: .94rem;
        }
        .table-hover tbody tr:hover { background: var(--g25); }

        /* Buttons */
        .btn {
            font-size: .9rem;
            font-weight: 600;
        }
        .btn-primary {
            background: var(--g600) !important;
            border-color: var(--g600) !important;
            color: #fff !important;
        }
        .btn-primary:hover, .btn-primary:focus {
            background: var(--g700) !important;
            border-color: var(--g700) !important;
            box-shadow: 0 4px 12px rgba(46,125,50,.3) !important;
        }
        .btn-success {
            background: var(--g400) !important;
            border-color: var(--g400) !important;
            color: #fff !important;
        }
        .btn-success:hover, .btn-success:focus {
            background: var(--g500) !important;
            border-color: var(--g500) !important;
            box-shadow: 0 4px 12px rgba(67,160,71,.3) !important;
        }
        .btn-outline-primary {
            color: var(--g600) !important;
            border-color: var(--g600) !important;
        }
        .btn-outline-primary:hover {
            background: var(--g600) !important;
            color: #fff !important;
        }
        .btn-outline-success {
            color: var(--g400) !important;
            border-color: var(--g400) !important;
        }
        .btn-outline-success:hover {
            background: var(--g400) !important;
            color: #fff !important;
        }
        .text-primary { color: var(--g600) !important; }
        .text-success { color: var(--g400) !important; }
        .bg-success   { background: var(--g400) !important; }
        .bg-primary   { background: var(--g600) !important; }
        .badge.bg-success { background: var(--g400) !important; }
        .badge.bg-primary { background: var(--g600) !important; }

        /* Form controls */
        .form-control, .form-select {
            border-color: var(--border);
            border-radius: var(--r-sm);
            font-size: .94rem;
            color: var(--text);
            padding: .5rem .85rem;
        }
        .form-control:focus, .form-select:focus {
            border-color: var(--g400);
            box-shadow: 0 0 0 3px rgba(67,160,71,.15);
        }
        .form-label {
            font-weight: 700;
            color: var(--g800);
            font-size: .82rem;
            text-transform: uppercase;
            letter-spacing: .3px;
            margin-bottom: 6px;
        }

        /* Alerts */
        .alert {
            font-size: .94rem;
        }
        .alert-success {
            background: var(--g50);
            border-color: var(--g100);
            color: var(--g800);
        }

        /* Badges */
        .badge {
            font-size: .76rem;
            font-weight: 600;
            padding: .35em .65em;
        }

        /* Pagination */
        .page-link {
            color: var(--g600);
            font-size: .9rem;
        }
        .page-item.active .page-link {
            background: var(--g600);
            border-color: var(--g600);
        }

        /* ══════════════════════════════════════
           MOBILE OVERLAY SIDEBAR
        ══════════════════════════════════════ */
        .sidebar-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,.45);
            z-index: 199;
            backdrop-filter: blur(2px);
        }
        .sidebar-overlay.active { display: block; }

        /* ══════════════════════════════════════
           RESPONSIVE
        ══════════════════════════════════════ */
        @media (max-width: 991.98px) {
            .admin-sidebar {
                position: fixed;
                left: -260px;
                top: 0;
                height: 100vh;
                width: 240px;
                transition: left var(--dur) var(--ease);
                z-index: 300;
            }
            .admin-sidebar.open { left: 0; }
            .topbar-mobile-toggle { display: flex; }
            .admin-content { padding: 18px; }
            .admin-topbar { padding: 0 18px; }
        }

        @media (max-width: 575.98px) {
            .admin-content { padding: 14px; }
            .topbar-badge-env { display: none; }
        }
    </style>
</head>
<body>

<!-- Overlay cho mobile -->
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

<div class="admin-wrap">

    <!-- ══════════════ SIDEBAR ══════════════ -->
    <aside class="admin-sidebar" id="adminSidebar">
        <div class="sidebar-inner">

            <!-- Brand -->
            <a href="index.php" class="sidebar-brand">
                <div class="sidebar-brand-logo">
                    <img src="../assets/images/logo2.jpg" alt="Vườn Nhà">
                </div>
                <div class="sidebar-brand-text">
                    <div class="sidebar-brand-name">Vườn Nhà</div>
                    <div class="sidebar-brand-sub">Bảng điều khiển</div>
                </div>
            </a>

            <!-- Nav chính -->
            <nav class="sidebar-nav">
                <div class="sidebar-label">Quản lý</div>

                <a href="index.php" class="<?= admin_menu_link_class($activeKey, 'orders') ?>">
                    <i class="bi bi-clipboard2-check"></i>
                    <span>Quản lý đơn hàng</span>
                </a>
                <a href="quan-ly-dich-vu.php" class="<?= admin_menu_link_class($activeKey, 'services') ?>">
                    <i class="bi bi-flower1"></i>
                    <span>Quản lý dịch vụ</span>
                </a>
                <a href="quan-ly-phu-thu.php" class="<?= admin_menu_link_class($activeKey, 'phu_thu') ?>">
                    <i class="bi bi-tag-fill"></i>
                    <span>Phụ phí đặc biệt</span>
                </a>

                <div class="sidebar-label" style="margin-top:8px;">Hệ thống</div>

                <a href="logout.php" class="nav-link-logout">
                    <i class="bi bi-box-arrow-right"></i>
                    <span>Đăng xuất</span>
                </a>
            </nav>

            <!-- Footer user -->
            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-avatar"><?= admin_h($initials) ?></div>
                    <div style="min-width:0;">
                        <div class="sidebar-user-name"><?= admin_h($name) ?></div>
                        <div class="sidebar-user-role"><i class="bi bi-shield-check" style="font-size:.65rem;"></i> Quản trị viên</div>
                    </div>
                </div>
            </div>

        </div>
    </aside>

    <!-- ══════════════ MAIN ══════════════ -->
    <div class="admin-main">

        <!-- Topbar -->
        <header class="admin-topbar">
            <div class="topbar-left">
                <button class="topbar-mobile-toggle" onclick="openSidebar()" aria-label="Mở menu">
                    <i class="bi bi-list" style="font-size:1.1rem;"></i>
                </button>
                <div>
                    <div class="topbar-breadcrumb">
                        <span><i class="bi bi-house-door" style="font-size:.82rem;"></i> Vườn Nhà</span>
                        <span class="bc-sep"><i class="bi bi-chevron-right" style="font-size:.7rem;"></i></span>
                        <span class="bc-current"><?= admin_h($pageLabel) ?></span>
                    </div>
                    <div class="topbar-page-title">
                        <i class="bi <?= admin_h($pageIcon) ?>" style="font-size:.95rem;margin-right:7px;opacity:.65;"></i><?= admin_h($title) ?>
                    </div>
                </div>
            </div>
            <div class="topbar-right">
                <span class="topbar-badge-env">
                    <span style="width:7px;height:7px;border-radius:50%;background:var(--g400);display:inline-block;"></span>
                    Đang hoạt động
                </span>
                <div class="topbar-divider"></div>
                <div class="topbar-user-chip">
                    <div class="topbar-avatar"><?= admin_h($initials) ?></div>
                    <span class="topbar-user-name d-none d-sm-inline"><?= admin_h($name) ?></span>
                </div>
            </div>
        </header>

        <!-- Content -->
        <main class="admin-content">
<?php
    }
}

if (!function_exists('admin_render_layout_end')) {
    function admin_render_layout_end(): void
    {
        ?>
        </main>
    </div><!-- /.admin-main -->
</div><!-- /.admin-wrap -->

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
    function openSidebar() {
        document.getElementById('adminSidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        document.getElementById('adminSidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('active');
        document.body.style.overflow = '';
    }
    // Đóng sidebar khi resize lên desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 992) closeSidebar();
    });
</script>
</body>
</html>
<?php
    }
}
