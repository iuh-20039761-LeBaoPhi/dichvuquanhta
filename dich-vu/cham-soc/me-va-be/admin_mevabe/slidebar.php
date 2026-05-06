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
            // Đảm bảo luôn redirect đúng file login.php trong cùng thư mục
            $currentDir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
            header('Location: ' . $currentDir . '/login.php');
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
                    --admin-bg: #fff5f7;
                    --admin-panel: #ffffff;
                    --admin-border: #fce7f3;
                    --admin-title: #831843;
                    --admin-text: #4a044e;
                    --admin-muted: #be185d;
                    --admin-sidebar-a: #db2777;
                    --admin-sidebar-b: #9d174d;
                    --admin-accent: #ec4899;
                }

                body {
                    background: radial-gradient(circle at top right, #fdf2f8 0%, var(--admin-bg) 42%, #fff1f2 100%);
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
                    box-shadow: 0 14px 40px rgba(131, 24, 67, 0.08);
                    background: var(--admin-panel);
                    --bs-gutter-x: 0;
                    margin-left: 0;
                    margin-right: 0;
                    align-items: flex-start;
                }

                .admin-sidebar {
                    background: linear-gradient(180deg, var(--admin-sidebar-a), var(--admin-sidebar-b));
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
                    background: radial-gradient(circle at top left, rgba(236, 72, 153, 0.18), transparent 45%);
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
                    box-shadow: 0 4px 14px rgba(131, 24, 67, 0.25);
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
                    border-color: rgba(255, 255, 255, 0.3);
                }

                .admin-menu-toggle i {
                    font-size: 1.2rem;
                    line-height: 1;
                }

                .admin-sidebar .list-group-item {
                    background: transparent;
                    color: rgba(255, 241, 242, 0.9);
                    transition: all 0.2s ease;
                }

                .admin-sidebar .list-group-item:hover {
                    background: rgba(255, 255, 255, 0.12);
                    color: #fff;
                    transform: translateX(2px);
                }

                .admin-sidebar .list-group-item.active {
                    background: linear-gradient(90deg, #ec4899, #db2777);
                    color: #fff;
                    box-shadow: 0 8px 20px rgba(219, 39, 119, 0.35);
                }

                .admin-topbar {
                    background: linear-gradient(180deg, #ffffff, #fff5f7);
                    border-bottom: 1px solid var(--admin-border);
                }

                .admin-page-title {
                    color: var(--admin-title);
                    letter-spacing: 0.2px;
                }

                .admin-main {
                    background: linear-gradient(180deg, #fffafd, #fff5f7);
                    min-width: 0;
                }

                .card {
                    border: 1px solid var(--admin-border);
                    border-radius: 14px;
                    box-shadow: 0 6px 20px rgba(131, 24, 67, 0.05);
                }

                .card-header {
                    border-bottom: 1px solid #fce7f3;
                    border-top-left-radius: 14px !important;
                    border-top-right-radius: 14px !important;
                    background-color: #fff1f2 !important;
                    color: #831843 !important;
                }

                .table thead th {
                    background: #fff1f2 !important;
                    color: #831843;
                    border-bottom-color: #fce7f3;
                    font-weight: 700;
                }

                .table tbody td {
                    border-color: #fdf2f8;
                }

                .table tbody tr:hover {
                    background: #fff5f7;
                }

                /* Override Bootstrap Colors to match Pink theme */
                .btn-success {
                    background-color: #ec4899;
                    border-color: #ec4899;
                }
                .btn-success:hover, .btn-success:focus, .btn-success:active {
                    background-color: #db2777 !important;
                    border-color: #db2777 !important;
                }
                .text-success { color: #db2777 !important; }
                .bg-success { background-color: #ec4899 !important; }
                .btn-outline-success {
                    color: #ec4899;
                    border-color: #ec4899;
                }
                .btn-outline-success:hover {
                    background-color: #ec4899;
                    color: #fff;
                }
                
                .btn-primary {
                    background-color: #db2777;
                    border-color: #db2777;
                }
                .btn-primary:hover {
                    background-color: #9d174d;
                    border-color: #9d174d;
                }
                .text-primary { color: #db2777 !important; }
                .btn-outline-primary {
                    color: #db2777;
                    border-color: #db2777;
                }
                .btn-outline-primary:hover {
                    background-color: #db2777;
                    color: #fff;
                }

                .badge.bg-success { background-color: #f472b6 !important; }
                .badge.bg-primary { background-color: #db2777 !important; }
                .badge.bg-info { background-color: #ec4899 !important; }
                
                .pagination .page-item.active .page-link {
                    background-color: #db2777;
                    border-color: #db2777;
                }
                .page-link { color: #db2777; }
                .page-link:hover { color: #9d174d; }

                .form-control:focus, .form-select:focus {
                    border-color: #f472b6;
                    box-shadow: 0 0 0 0.25rem rgba(244, 114, 182, 0.25);
                }

                @media (max-width: 991.98px) {
                    .container-fluid {
                        padding: 0 !important;
                    }

                    .admin-shell {
                        border-radius: 0;
                        margin: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        min-height: auto !important; /* Disable fixed minimum height */
                        display: flex !important;
                        flex-direction: column !important;
                    }

                    .admin-sidebar {
                        position: relative !important;
                        top: 0 !important;
                        height: auto !important;
                        min-height: 0 !important;
                        padding: 0.75rem 1rem !important;
                        width: 100% !important;
                        flex: 0 0 auto !important;
                    }

                    .admin-sidebar .d-flex.mb-4,
                    .admin-sidebar div:first-child:not(.collapse) {
                        margin-bottom: 0 !important;
                    }

                    .admin-sidebar-menu {
                        margin-top: 0.5rem;
                        margin-bottom: 0.5rem !important;
                    }

                    .admin-main {
                        padding: 0 !important;
                        margin: 0 !important;
                        flex: 1 1 auto !important;
                        width: 100% !important;
                    }

                    .admin-main main {
                        padding: 1rem 0.75rem !important;
                        margin: 0 !important;
                    }
                    
                    .admin-topbar {
                        display: none !important;
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
                                    <img src="../assets/logomvb.png" alt="logo">
                                </div>
                                <div>
                                    <div class="fw-bold">Chăm Sóc Mẹ và Bé</div>
                                    <small class="text-secondary">ADMIN PANEL</small>
                                </div>
                            </div>
                            <button class="btn btn-outline-light admin-menu-toggle d-lg-none" type="button"
                                data-bs-toggle="collapse" data-bs-target="#adminSidebarMenu" aria-expanded="false"
                                aria-controls="adminSidebarMenu">
                                <i class="bi bi-list"></i>
                            </button>
                        </div>

                        <div id="adminSidebarMenu" class="collapse admin-sidebar-menu list-group list-group-flush mb-3">
                            
                            <a href="index.php" class="<?= admin_h(admin_menu_link_class($activeKey, 'orders')) ?>"><i
                                    class="bi bi-receipt"></i>Quan ly don hang</a>
                            <a href="quan-ly-dich-vu.php"
                                class="<?= admin_h(admin_menu_link_class($activeKey, 'services')) ?>"><i
                                    class="bi bi-grid"></i>Quan ly dich vu</a>
                            <a href="quan-ly-phu-thu.php"
                                class="<?= admin_h(admin_menu_link_class($activeKey, 'phu_thu')) ?>"><i
                                    class="bi bi-percent"></i>Phụ phí đặc biệt</a>
                            <a href="logout.php"
                                class="list-group-item list-group-item-action d-flex align-items-center gap-2 border-0 rounded-3 mt-2 px-3 py-2 fw-semibold"><i
                                    class="bi bi-box-arrow-right"></i>Dang xuat</a>
                        </div>

                    </aside>

                    <section class="col-12 col-lg-10 p-0 d-flex flex-column admin-main">
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
