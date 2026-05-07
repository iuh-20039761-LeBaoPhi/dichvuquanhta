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
        $admin = $_SESSION['admin_user'] ?? null;

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
        $base = 'list-group-item list-group-item-action d-flex align-items-center gap-3 border-0 rounded-3 mb-2 px-3 py-2-5 fw-medium';
        return $activeKey === $key ? $base . ' active' : $base;
    }
}

if (!function_exists('admin_render_layout_start')) {
    function admin_render_layout_start(string $title, string $activeKey, array $admin): void
    {
        if (!headers_sent()) {
            header('Content-Type: text/html; charset=utf-8');
        }
        $name = trim((string) ($admin['name'] ?? $admin['ten'] ?? 'Quản trị viên'));
        ?>
        <!DOCTYPE html>
        <html lang="vi">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title><?= admin_h($title) ?></title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --pg:      #1a4d2e;
                    --ag:      #4f6f52;
                    --lime:    #e8f3d6;
                    --white:   #f9fbf9;
                    --border:  #d8e8d8;
                    --text:    #2d3436;
                    --muted:   #6b7280;
                    --sidebar-a: #1a4d2e;
                    --sidebar-b: #2e7d32;
                    --accent:    #43a047;
                }

                *, *::before, *::after { box-sizing: border-box; }

                body {
                    font-family: 'Quicksand', sans-serif;
                    background-color: var(--white);
                    color: var(--text);
                    min-height: 100vh;
                    font-weight: 500;
                }

                /* ── VỎ NGOÀI ── */
                .admin-shell {
                    background: #fff;
                    border-radius: 0;
                    border: none;
                    box-shadow: none;
                    overflow: hidden;
                    margin: 0;
                    min-height: 100vh;
                }

                /* Trên desktop: có bo góc và margin */
                @media (min-width: 992px) {
                    .admin-shell {
                        border-radius: 20px;
                        border: 1px solid var(--border);
                        box-shadow: 0 4px 24px rgba(26,77,46,.07);
                        margin: 1.25rem;
                        min-height: calc(100vh - 2.5rem);
                    }
                }

                /* ── THANH BÊN ── */
                .admin-sidebar {
                    background: linear-gradient(180deg, var(--sidebar-a) 0%, var(--sidebar-b) 100%);
                    min-height: 100vh;
                    padding: 1.75rem 1.25rem !important;
                    position: relative;
                }

                .admin-sidebar::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at 90% 5%, rgba(255,255,255,.08) 0%, transparent 55%);
                    pointer-events: none;
                }

                /* ── LOGO THƯƠNG HIỆU ── */
                .admin-brand-logo {
                    width: 42px; height: 42px;
                    border-radius: 10px;
                    background: #fff;
                    padding: 5px;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 2px 10px rgba(0,0,0,.15);
                    flex-shrink: 0;
                }
                .admin-brand-logo img { width: 100%; height: 100%; object-fit: contain; }

                /* ── MỤC MENU ── */
                .admin-sidebar .list-group-item {
                    background: transparent;
                    color: rgba(255,255,255,.82);
                    border: none;
                    font-size: .9rem;
                    font-weight: 600;
                    border-radius: 10px !important;
                    transition: background .18s, color .18s, transform .15s;
                    margin-bottom: 2px;
                    position: relative;
                    z-index: 1;
                    letter-spacing: .1px;
                }
                .admin-sidebar .list-group-item:hover {
                    background: rgba(255,255,255,.13);
                    color: #fff;
                    transform: translateX(3px);
                }
                .admin-sidebar .list-group-item.active {
                    background: rgba(255,255,255,.2);
                    color: #fff;
                    font-weight: 700;
                    border-left: 3px solid rgba(255,255,255,.75) !important;
                }
                .admin-sidebar .list-group-item i {
                    font-size: 1rem; width: 20px; text-align: center; flex-shrink: 0;
                }
                .sidebar-section-label {
                    font-size: .7rem; font-weight: 700; letter-spacing: 1px;
                    text-transform: uppercase; color: rgba(255,255,255,.4);
                    padding: .6rem .75rem .2rem; margin-top: .5rem;
                }
                .admin-sidebar .list-group-item.logout-item { color: rgba(255,255,255,.6); }
                .admin-sidebar .list-group-item.logout-item:hover {
                    background: rgba(220,38,38,.18); color: #fca5a5;
                }

                /* ── KHU VỰC CHÍNH ── */
                .admin-main { background: #fff; }

                /* ── THANH TIÊU ĐỀ ── */
                .admin-topbar {
                    padding: 1rem 1.75rem;
                    border-bottom: 1px solid var(--border);
                    background: #fff;
                    display: flex; justify-content: space-between; align-items: center; gap: 12px;
                }
                .admin-topbar-title {
                    font-family: 'Playfair Display', serif;
                    font-size: 1.1rem; font-weight: 700;
                    color: var(--pg); margin: 0;
                }
                .admin-topbar-user {
                    display: flex; align-items: center; gap: 10px;
                    font-size: .875rem; color: var(--muted);
                }
                .admin-topbar-avatar {
                    width: 34px; height: 34px; border-radius: 50%;
                    background: linear-gradient(135deg, var(--sidebar-a), var(--accent));
                    display: flex; align-items: center; justify-content: center;
                    color: #fff; font-size: .85rem; font-weight: 700; flex-shrink: 0;
                }

                /* ── THẺ & BẢNG ── */
                .card {
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    box-shadow: 0 2px 8px rgba(26,77,46,.04);
                }
                .card-header {
                    background: transparent !important;
                    border-bottom: 1px solid var(--border);
                    padding: 1rem 1.25rem;
                    font-weight: 700; color: var(--pg);
                }

                /* ── NÚT BẤM ── */
                .btn-success, .bg-success {
                    background-color: var(--accent) !important;
                    border-color: var(--accent) !important;
                }
                .btn-primary {
                    background-color: var(--sidebar-b) !important;
                    border-color: var(--sidebar-b) !important;
                }

                /* ── TIỆN ÍCH ── */
                .py-2-5 { padding-top: .625rem !important; padding-bottom: .625rem !important; }

                /* ── RESPONSIVE ── */
                @media (max-width: 991.98px) {
                    .admin-shell { border-radius: 0; margin: 0; border: none; box-shadow: none; }
                    .admin-sidebar { min-height: auto; padding: 1rem !important; }
                    .admin-topbar { padding: .75rem 1rem; }
                }
            </style>
        </head>

        <body>
            <div class="container-fluid px-lg-4">
                <div class="row admin-shell">
                    <!-- SIDEBAR -->
                    <aside class="col-12 col-lg-2 admin-sidebar text-white">
                        <div class="d-flex align-items-center justify-content-between mb-4 mt-2">
                            <div class="d-flex align-items-center gap-3">
                                <div class="admin-brand-logo">
                                    <img src="../assets/images/logo2.jpg" alt="logo">
                                </div>
                                <div class="lh-sm">
                                    <div class="fw-bold text-white small" style="letter-spacing: .4px;">Chăm Sóc Vườn</div>
                                    <div class="small" style="color:rgba(255,255,255,.55);">Quản trị viên</div>
                                </div>
                            </div>
                            <button class="btn btn-link text-white p-0 d-lg-none" type="button" data-bs-toggle="collapse" data-bs-target="#adminSidebarMenu">
                                <i class="bi bi-grid-fill fs-3"></i>
                            </button>
                        </div>

                        <div id="adminSidebarMenu" class="collapse d-lg-block">
                            <div class="list-group list-group-flush">
                                <a href="index.php" class="<?= admin_menu_link_class($activeKey, 'orders') ?>">
                                    <i class="bi bi-receipt-cutoff"></i> Quản Lý Đơn Hàng
                                </a>
                                <a href="quan-ly-dich-vu.php" class="<?= admin_menu_link_class($activeKey, 'services') ?>">
                                    <i class="bi bi-flower1"></i> Quản Lý Dịch Vụ
                                </a>
                                <a href="quan-ly-phu-thu.php" class="<?= admin_menu_link_class($activeKey, 'phu_thu') ?>">
                                    <i class="bi bi-tag"></i> Phụ Phí Đặc Biệt
                                </a>

                                <div class="sidebar-section-label">Hệ thống</div>

                                <a href="logout.php" class="list-group-item list-group-item-action d-flex align-items-center gap-3 border-0 rounded-3 mb-2 px-3 py-2-5 fw-medium logout-item">
                                    <i class="bi bi-box-arrow-right"></i> Đăng xuất
                                </a>
                            </div>
                        </div>
                    </aside>

                    <!-- MAIN CONTENT -->
                    <section class="col-12 col-lg-10 p-0 admin-main">
                        <header class="admin-topbar">
                            <h5 class="admin-topbar-title d-none d-lg-block"><?= admin_h($title) ?></h5>
                            <div class="admin-topbar-user ms-auto">
                                <span>Xin chào, <strong style="color: var(--admin-title)"><?= admin_h($name) ?></strong></span>
                                <div class="vr"></div>
                                <div class="admin-topbar-avatar" title="<?= admin_h($name) ?>">
                                    <?= mb_strtoupper(mb_substr($name, 0, 1, 'UTF-8'), 'UTF-8') ?>
                                </div>
                            </div>
                        </header>
                        <main class="p-4">
        <?php
    }
}

if (!function_exists('admin_render_layout_end')) {
    function admin_render_layout_end(): void
    {
        ?>
                        </main>
                    </section>
                </div>
            </div>
            <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        </body>
        </html>
        <?php
    }
}