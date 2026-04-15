<?php
declare(strict_types=1);

if (!function_exists('kh_header_escape')) {
    function kh_header_escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('kh_avatar_path')) {
    function kh_avatar_path(string $value): string
    {
        $avatar = trim(str_replace('\\', '/', $value));
        if ($avatar === '') {
            return '../assets/logo_main.png';
        }

        if (preg_match('/^(https?:)?\/\//i', $avatar) || strpos($avatar, 'data:image/') === 0) {
            return $avatar;
        }

        if (strpos($avatar, '../') === 0) {
            return $avatar;
        }

        $assetPos = strpos($avatar, 'assets/');
        if ($assetPos !== false) {
            return '../' . ltrim(substr($avatar, $assetPos), '/');
        }

        if (strpos($avatar, './') === 0) {
            $avatar = substr($avatar, 2);
        }

        return '../' . ltrim($avatar, '/');
    }
}

if (!function_exists('kh_menu_link_class')) {
    function kh_menu_link_class(string $activeKey, string $key): string
    {
        $base = 'list-group-item list-group-item-action d-flex align-items-center gap-2 rounded-3 mb-1 px-3 py-2 fw-semibold';
        return $activeKey === $key ? $base . ' active' : $base;
    }
}

if (!function_exists('render_khach_hang_header_styles')) {
    function render_khach_hang_header_styles(): void
    {
        ?>
        <style>
            :root {
                --kh-border: #bbdef5;
                --kh-title: #1a5d9c;
                --kh-text: #2c5282;
                --kh-sidebar-a: #0056b3;
                --kh-sidebar-b: #007bff;
                --kh-accent: #00b4d8;
            }

            html,
            body {
                overflow-x: hidden;
            }

            body {
                color: var(--kh-text);
                scrollbar-gutter: stable;
                background: linear-gradient(180deg, #e8f4ff 0%, #f0f8ff 48%, #f5faff 100%);
            }

            .kh-admin-shell {
                border: 1px solid var(--kh-border);
                border-radius: 18px;
                overflow: visible;
                box-shadow: 0 16px 40px rgba(0, 123, 255, 0.16);
                background: #ffffff;
                --bs-gutter-x: 0;
                margin-left: 0;
                margin-right: 0;
                align-items: flex-start;
            }

            .kh-admin-sidebar {
                background: linear-gradient(180deg, var(--kh-sidebar-a), var(--kh-sidebar-b));
                position: -webkit-sticky;
                position: sticky;
                top: 0;
                z-index: 1020;
                align-self: flex-start;
                display: flex;
                flex-direction: column;
                min-height: 100vh;
                max-height: 100vh;
                overflow-y: auto;
            }

            .kh-admin-sidebar::after {
                content: '';
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at top left, rgba(0, 123, 255, 0.2), transparent 48%);
                pointer-events: none;
            }

            .kh-admin-sidebar > * {
                position: relative;
                z-index: 1;
            }

            .kh-admin-brand {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #fff;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 18px rgba(0, 123, 255, 0.28);
            }

            .kh-admin-brand img {
                width: 20px;
                height: 20px;
                object-fit: contain;
            }

            .kh-admin-menu-toggle {
                width: 38px;
                height: 38px;
                padding: 0;
                border-radius: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .kh-admin-menu-toggle i {
                font-size: 1.2rem;
                line-height: 1;
            }

            .kh-admin-sidebar .list-group {
                background: transparent;
            }

            .kh-admin-sidebar .list-group-item {
                background: transparent;
                color: rgba(241, 245, 249, 0.9);
                transition: all 0.2s ease;
                border: 0;
            }

            .kh-admin-sidebar .list-group-item:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #fff;
                transform: translateX(2px);
            }

            .kh-admin-sidebar .list-group-item.active {
                background: linear-gradient(90deg, #007bff, var(--kh-accent));
                color: #fff;
                box-shadow: 0 8px 22px rgba(0, 123, 255, 0.42);
            }

            .kh-admin-main {
                min-width: 0;
                background: linear-gradient(180deg, #f5faff, #eef6ff);
            }

            .kh-admin-topbar {
                background: linear-gradient(180deg, #ffffff, #f0f8ff);
                border-bottom: 1px solid var(--kh-border);
            }

            .kh-admin-title {
                color: var(--kh-title);
                letter-spacing: 0.2px;
            }

            .kh-admin-avatar-btn {
                border: 1px solid #bbdef5;
                color: #1a5d9c;
                background: #f5faff;
                border-radius: 999px;
                padding: 3px 10px 3px 3px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
            }

            .kh-admin-avatar-btn:hover {
                background: #e3f2fd;
                color: #0d4a7a;
            }

            .kh-admin-avatar {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #bbdef5;
                background: #fff;
            }

            .kh-admin-menu {
                min-width: 220px;
                border: 0;
                border-radius: 12px;
                box-shadow: 0 14px 30px rgba(0, 123, 255, 0.2);
            }

            .kh-admin-page {
                min-width: 0;
            }

            @media (max-width: 991.98px) {
                .kh-admin-shell {
                    border-radius: 12px;
                }

                .kh-admin-sidebar {
                    position: relative;
                    top: auto;
                    min-height: auto;
                    max-height: none;
                    overflow: visible;
                }

                .kh-admin-sidebar-menu {
                    margin-top: 0.5rem;
                }
            }

            @media (min-width: 992px) {
                .kh-admin-sidebar-menu.collapse {
                    display: block !important;
                    height: auto !important;
                }
            }
        </style>
        <?php
    }
}

if (!function_exists('render_khach_hang_header')) {
    function render_khach_hang_header(array $user, string $title = 'Đơn hàng của bạn', string $activeKey = 'orders'): void
    {
        $name = trim((string)($user['ten'] ?? $user['hovaten'] ?? 'Khách hàng'));
        if ($name === '') {
            $name = 'Khách hàng';
        }

        $phone = trim((string)($user['sodienthoai'] ?? ''));
        $avatar = kh_avatar_path((string)($user['anh_dai_dien'] ?? ''));

        $nameEsc = kh_header_escape($name);
        $phoneEsc = kh_header_escape($phone);
        $avatarEsc = kh_header_escape($avatar);
        $titleEsc = kh_header_escape($title);
        ?>
        <div class="container-fluid p-2 p-lg-3">
            <div class="row min-vh-100 kh-admin-shell">
                <aside class="col-12 col-lg-2 kh-admin-sidebar text-white p-3">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <div class="d-flex align-items-center gap-2">
                            <div class="kh-admin-brand">
                                <img src="../assets/logo_main.png" alt="logo">
                            </div>
                            <div>
                                <div class="fw-bold">Dịch Vụ Thuê Tài Xế</div>
                                <small class="text-white-50">CUSTOMER PANEL</small>
                            </div>
                        </div>
                        <button
                            class="btn btn-outline-light kh-admin-menu-toggle d-lg-none"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#khSidebarMenu"
                            aria-expanded="false"
                            aria-controls="khSidebarMenu"
                        >
                            <i class="bi bi-list"></i>
                        </button>
                    </div>

                    <div id="khSidebarMenu" class="collapse kh-admin-sidebar-menu list-group list-group-flush mb-3">
                        <a href="thong-tin-khach-hang.php" class="<?= kh_header_escape(kh_menu_link_class($activeKey, 'profile')) ?>"><i class="bi bi-person-vcard"></i>Thông tin cá nhân</a>
                        <a href="danh-sach-don-hang.php" class="<?= kh_header_escape(kh_menu_link_class($activeKey, 'orders')) ?>"><i class="bi bi-receipt"></i>Danh sách đơn hàng</a>
                        <a href="../index.html" class="<?= kh_header_escape(kh_menu_link_class($activeKey, 'home')) ?>"><i class="bi bi-house"></i>Trang chủ</a>
                        <a href="../logout.php" class="list-group-item list-group-item-action d-flex align-items-center gap-2 rounded-3 mt-2 px-3 py-2 fw-semibold"><i class="bi bi-box-arrow-right"></i>Đăng xuất</a>
                    </div>
                </aside>

                <section class="col-12 col-lg-10 p-0 d-flex flex-column kh-admin-main">
                    <header class="kh-admin-topbar px-3 py-2 d-flex align-items-center justify-content-between">
                        <h1 class="h5 kh-admin-title fw-bold mb-0"><?= $titleEsc ?></h1>
                        <div class="dropdown">
                            <button class="btn kh-admin-avatar-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <img class="kh-admin-avatar" src="<?= $avatarEsc ?>" alt="avatar">
                                <span class="d-none d-sm-inline"><?= $nameEsc ?></span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end kh-admin-menu">
                                <li class="px-3 py-2 border-bottom">
                                    <div class="fw-semibold"><?= $nameEsc ?></div>
                                    <div class="text-muted small"><?= $phoneEsc ?></div>
                                </li>
                                <li><a class="dropdown-item" href="thong-tin-khach-hang.php"><i class="bi bi-person-circle me-2"></i>Thông tin cá nhân</a></li>
                                <li><a class="dropdown-item" href="danh-sach-don-hang.php"><i class="bi bi-receipt me-2"></i>Danh sách đơn hàng</a></li>
                                <li><a class="dropdown-item" href="../index.html"><i class="bi bi-house me-2"></i>Trang chủ</a></li>
                                <li><a class="dropdown-item text-danger" href="../logout.php"><i class="bi bi-box-arrow-right me-2"></i>Đăng xuất</a></li>
                            </ul>
                        </div>
                    </header>
                    <main class="flex-grow-1 p-3 kh-admin-page">
        <?php
    }
}

if (!function_exists('render_khach_hang_layout_end')) {
    function render_khach_hang_layout_end(): void
    {
        ?>
                    </main>
                </section>
            </div>
        </div>
        <?php
    }
}
?>