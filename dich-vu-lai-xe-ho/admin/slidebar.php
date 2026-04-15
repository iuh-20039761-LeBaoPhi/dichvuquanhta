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
        $base = 'list-group-item list-group-item-action d-flex align-items-center gap-2 border-0 rounded-3 mb-1 px-3 py-2 fw-semibold';
        return $activeKey === $key ? $base . ' active' : $base;
    }
}

if (!function_exists('admin_render_layout_start')) {
    function admin_render_layout_start(string $title, string $activeKey, array $admin): void
    {
        $name = trim((string) ($admin['name'] ?? $admin['ten'] ?? 'Admin'));
        $email = trim((string) ($admin['email'] ?? 'admin@example.com'));
        ?>
        <!DOCTYPE html>
        <html lang="vi">

        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title><?= admin_h($title) ?></title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
            <style>
                :root {
                    --admin-bg: #f3f6fb;
                    --admin-panel: #ffffff;
                    --admin-border: #dbe4f0;
                    --admin-title: #0f172a;
                    --admin-text: #334155;
                    --admin-muted: #64748b;
                    --admin-sidebar-a: #0b2239;
                    --admin-sidebar-b: #123551;
                    --admin-accent: #007bff;
                }

                body {
                    background: radial-gradient(circle at top right, #ebf4ff 0%, var(--admin-bg) 42%, #eef2f8 100%);
                    color: var(--admin-text);
                    scrollbar-gutter: stable;
                }

                html,
                body {
                    overflow-x: hidden;
                }

                .admin-shell {
                    border: 1px solid var(--admin-border);
                    border-radius: 18px;
                    overflow: visible;
                    box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
                    background: var(--admin-panel);
                    --bs-gutter-x: 0;
                    margin-left: 0;
                    margin-right: 0;
                    align-items: flex-start;
                }

                .admin-sidebar {
                    background: linear-gradient(180deg, #007bff, #0056b3);
                    position: -webkit-sticky;
                    position: sticky;
                    top: 0;
                    z-index: 1020;
                    align-self: flex-start;
                    display: flex;
                    flex-direction: column;
                    max-height: 100vh;
                    overflow-y: auto;
                }

                @media (min-width: 992px) {
                    .admin-sidebar {
                        height: 100vh;
                        max-height: 100vh;
                        overflow-y: auto;
                    }
                }

                .admin-sidebar::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at top left, rgba(0, 123, 255, 0.18), transparent 45%);
                    pointer-events: none;
                }

                .admin-sidebar>* {
                    position: relative;
                    z-index: 1;
                }

                .admin-brand-logo {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #fff;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
                }

                .admin-brand-logo img {
                    width: 20px;
                    height: 20px;
                    object-fit: contain;
                }

                .admin-sidebar .list-group {
                    background: transparent;
                }

                .admin-menu-toggle {
                    width: 38px;
                    height: 38px;
                    padding: 0;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                .admin-menu-toggle i {
                    font-size: 1.2rem;
                    line-height: 1;
                }

                .admin-sidebar .list-group-item {
                    background: transparent;
                    color: rgba(241, 245, 249, 0.9);
                    transition: all 0.2s ease;
                }

                .admin-sidebar .list-group-item:hover {
                    background: rgba(255, 255, 255, 0.12);
                    color: #fff;
                    transform: translateX(2px);
                }

                .admin-sidebar .list-group-item.active {
                    background: linear-gradient(90deg, #007bff, #00b4d8);
                    color: #fff;
                    box-shadow: 0 8px 20px rgba(0, 123, 255, 0.35);
                }

                .admin-topbar {
                    background: linear-gradient(180deg, #ffffff, #f8fafc);
                    border-bottom: 1px solid var(--admin-border);
                }

                .admin-page-title {
                    color: var(--admin-title);
                    letter-spacing: 0.2px;
                }

                .admin-main {
                    background: linear-gradient(180deg, #f9fbff, #f4f7fc);
                    min-width: 0;
                }

                .card {
                    border: 1px solid var(--admin-border);
                    border-radius: 14px;
                    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
                }

                .card-header {
                    border-bottom: 1px solid #e7edf6;
                    border-top-left-radius: 14px !important;
                    border-top-right-radius: 14px !important;
                }

                .table thead th {
                    background: #edf3fb !important;
                    color: #1e3a5f;
                    border-bottom-color: #dbe4f0;
                    font-weight: 700;
                }

                .table tbody td {
                    border-color: #e7edf6;
                }

                .table tbody tr:hover {
                    background: #f8fbff;
                }

                @media (max-width: 991.98px) {
                    .admin-shell {
                        border-radius: 12px;
                    }

                    .admin-sidebar {
                        position: -webkit-sticky !important;
                        position: sticky !important;
                        top: 0 !important;
                        max-height: 70vh;
                        overflow-y: auto;
                    }

                    .admin-sidebar-menu {
                        margin-top: 0.5rem;
                    }
                }

                @media (min-width: 992px) {
                    .admin-sidebar-menu.collapse {
                        display: block !important;
                        height: auto !important;
                    }
                }
            </style>
        </head>

        <body>
            <div class="container-fluid p-2 p-lg-3">
                <div class="row min-vh-100 admin-shell">
                    <aside class="col-12 col-lg-2 admin-sidebar text-white p-3">
                        <div class="d-flex align-items-center justify-content-between mb-4">
                            <div class="d-flex align-items-center gap-2">
                                <div class="admin-brand-logo">
                                    <img src="../assets/logo_main.png" alt="logo">
                                </div>
                                <div>
                                    <div class="fw-bold">Dịch Vụ Thuê Tài Xế</div>
                                    <small class="text-white-50">ADMIN PANEL</small>
                                </div>
                            </div>
                            <button class="btn btn-outline-light admin-menu-toggle d-lg-none" type="button"
                                data-bs-toggle="collapse" data-bs-target="#adminSidebarMenu" aria-expanded="false"
                                aria-controls="adminSidebarMenu">
                                <i class="bi bi-list"></i>
                            </button>
                        </div>

                        <div id="adminSidebarMenu" class="collapse admin-sidebar-menu list-group list-group-flush mb-3">
                            <a href="index.php" class="<?= admin_h(admin_menu_link_class($activeKey, 'dashboard')) ?>"><i
                                    class="bi bi-speedometer2"></i>Tổng quan</a>
                            <a href="quan-ly-don-hang.php" class="<?= admin_h(admin_menu_link_class($activeKey, 'orders')) ?>"><i
                                    class="bi bi-receipt"></i>Quản lý đơn hàng</a>
                            <a href="quan-ly-dich-vu.php"
                                class="<?= admin_h(admin_menu_link_class($activeKey, 'services')) ?>"><i
                                    class="bi bi-grid"></i>Quản lý dịch vụ</a>
                            <a href="quan-ly-tai-xe.php"
                                class="<?= admin_h(admin_menu_link_class($activeKey, 'drivers')) ?>"><i
                                    class="bi bi-people"></i>Quản lý tài xế</a>
                            <a href="logout.php"
                                class="list-group-item list-group-item-action d-flex align-items-center gap-2 border-0 rounded-3 mt-2 px-3 py-2 fw-semibold"><i
                                    class="bi bi-box-arrow-right"></i>Đăng xuất</a>
                        </div>

                    </aside>

                    <section class="col-12 col-lg-10 p-0 d-flex flex-column admin-main">
                        <header class="admin-topbar px-3 py-2 d-flex align-items-center justify-content-between">
                            <h1 class="h5 admin-page-title fw-bold mb-0"><?= admin_h($title) ?></h1>
                            <div class="d-flex align-items-center gap-2">
                                <span
                                    class="badge bg-primary-subtle text-primary-emphasis px-3 py-2 rounded-pill border border-primary-subtle"><?= admin_h($name !== '' ? $name : $email) ?></span>
                            </div>
                        </header>
                        <main class="flex-grow-1 p-3">
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
?>