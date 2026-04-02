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
        $name = trim((string)($admin['name'] ?? $admin['ten'] ?? 'Admin'));
        $email = trim((string)($admin['email'] ?? 'admin@example.com'));
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
                    --admin-accent: #16a34a;
                }

                body {
                    background: radial-gradient(circle at top right, #ebf4ff 0%, var(--admin-bg) 42%, #eef2f8 100%);
                    color: var(--admin-text);
                }

                .admin-shell {
                    border: 1px solid var(--admin-border);
                    border-radius: 18px;
                    overflow: hidden;
                    box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
                    background: var(--admin-panel);
                }

                .admin-sidebar {
                    background: linear-gradient(180deg, var(--admin-sidebar-a), var(--admin-sidebar-b));
                    position: relative;
                }

                .admin-sidebar::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 45%);
                    pointer-events: none;
                }

                .admin-sidebar > * {
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
                    background: linear-gradient(90deg, #22c55e, #16a34a);
                    color: #fff;
                    box-shadow: 0 8px 20px rgba(22, 163, 74, 0.35);
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
                }
            </style>
        </head>
        <body>
        <div class="container-fluid p-2 p-lg-3">
            <div class="row min-vh-100 admin-shell">
                <aside class="col-12 col-lg-2 admin-sidebar text-white p-3">
                    <div class="d-flex align-items-center gap-2 mb-4">
                        <div class="admin-brand-logo">
                            <img src="../assets/logomvb.png" alt="logo">
                        </div>
                        <div>
                            <div class="fw-bold">Chăm Sóc Mẹ và Bé</div>
                            <small class="text-secondary">ADMIN PANEL</small>
                        </div>
                    </div>

                    <small class="text-secondary d-block mb-2">MENU CHINH</small>
                    <div class="list-group list-group-flush mb-3">
                        <a href="index.php" class="<?= admin_h(admin_menu_link_class($activeKey, 'dashboard')) ?>"><i class="bi bi-speedometer2"></i>Tong quan</a>
                        <a href="quan-ly-hoa-don.php" class="<?= admin_h(admin_menu_link_class($activeKey, 'orders')) ?>"><i class="bi bi-receipt"></i>Quan ly don hang</a>
                        <a href="quan-ly-nhan-vien.php" class="<?= admin_h(admin_menu_link_class($activeKey, 'employees')) ?>"><i class="bi bi-people"></i>Quan ly nhan vien</a>
                    </div>

                    <div class="mt-auto pt-3 border-top border-secondary-subtle">
                        <a href="logout.php" class="btn btn-outline-light w-100"><i class="bi bi-box-arrow-right me-1"></i>Dang xuat</a>
                    </div>
                </aside>

                <section class="col-12 col-lg-10 p-0 d-flex flex-column admin-main">
                    <header class="admin-topbar px-3 py-2 d-flex align-items-center justify-content-between">
                        <h1 class="h5 admin-page-title fw-bold mb-0"><?= admin_h($title) ?></h1>
                        <div class="d-flex align-items-center gap-2">
                
                            <span class="badge bg-success-subtle text-success-emphasis px-3 py-2 rounded-pill border border-success-subtle"><?= admin_h($name !== '' ? $name : $email) ?></span>
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
