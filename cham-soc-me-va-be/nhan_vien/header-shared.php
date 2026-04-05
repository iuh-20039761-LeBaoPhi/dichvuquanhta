<?php
declare(strict_types=1);

if (!function_exists('nv_header_escape')) {
    function nv_header_escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('nv_avatar_path')) {
    function nv_avatar_path(string $value): string
    {
        $avatar = trim(str_replace('\\', '/', $value));
        if ($avatar === '') {
            return '../assets/logomvb.png';
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

if (!function_exists('nv_menu_link_class')) {
    function nv_menu_link_class(string $activeKey, string $key): string
    {
        $base = 'list-group-item list-group-item-action d-flex align-items-center gap-2 rounded-3 mb-1 px-3 py-2 fw-semibold';
        return $activeKey === $key ? $base . ' active' : $base;
    }
}

if (!function_exists('render_nhan_vien_header_styles')) {
    function render_nhan_vien_header_styles(): void
    {
        ?>
        <style>
            :root {
                --nv-border: #dbe4f0;
                --nv-title: #0f172a;
                --nv-text: #334155;
                --nv-sidebar-a: #0b2239;
                --nv-sidebar-b: #123551;
                --nv-accent: #16a34a;
            }

            html,
            body {
                overflow-x: hidden;
            }

            body {
                color: var(--nv-text);
                scrollbar-gutter: stable;
            }

            .nv-admin-shell {
                border: 1px solid var(--nv-border);
                border-radius: 18px;
                overflow: visible;
                box-shadow: 0 14px 40px rgba(15, 23, 42, 0.08);
                background: #ffffff;
                --bs-gutter-x: 0;
                margin-left: 0;
                margin-right: 0;
                align-items: flex-start;
            }

            .nv-admin-sidebar {
                background: linear-gradient(180deg, var(--nv-sidebar-a), var(--nv-sidebar-b));
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

            .nv-admin-sidebar::after {
                content: '';
                position: absolute;
                inset: 0;
                background: radial-gradient(circle at top left, rgba(34, 197, 94, 0.18), transparent 45%);
                pointer-events: none;
            }

            .nv-admin-sidebar > * {
                position: relative;
                z-index: 1;
            }

            .nv-admin-brand {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: #fff;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 14px rgba(15, 23, 42, 0.25);
            }

            .nv-admin-brand img {
                width: 20px;
                height: 20px;
                object-fit: contain;
            }

            .nv-admin-menu-toggle {
                width: 38px;
                height: 38px;
                padding: 0;
                border-radius: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .nv-admin-menu-toggle i {
                font-size: 1.2rem;
                line-height: 1;
            }

            .nv-admin-sidebar .list-group {
                background: transparent;
            }

            .nv-admin-sidebar .list-group-item {
                background: transparent;
                color: rgba(241, 245, 249, 0.9);
                transition: all 0.2s ease;
                border: 0;
            }

            .nv-admin-sidebar .list-group-item:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #fff;
                transform: translateX(2px);
            }

            .nv-admin-sidebar .list-group-item.active {
                background: linear-gradient(90deg, #22c55e, var(--nv-accent));
                color: #fff;
                box-shadow: 0 8px 20px rgba(22, 163, 74, 0.35);
            }

            .nv-admin-main {
                min-width: 0;
                background: linear-gradient(180deg, #f9fbff, #f4f7fc);
            }

            .nv-admin-topbar {
                background: linear-gradient(180deg, #ffffff, #f8fafc);
                border-bottom: 1px solid var(--nv-border);
            }

            .nv-admin-title {
                color: var(--nv-title);
                letter-spacing: 0.2px;
            }

            .nv-admin-avatar-btn {
                border: 1px solid #dbe4f0;
                color: #0f172a;
                background: #f8fafc;
                border-radius: 999px;
                padding: 3px 10px 3px 3px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
            }

            .nv-admin-avatar-btn:hover {
                background: #f1f5f9;
                color: #0f172a;
            }

            .nv-admin-avatar {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #e2e8f0;
                background: #fff;
            }

            .nv-admin-menu {
                min-width: 220px;
                border: 0;
                border-radius: 12px;
                box-shadow: 0 12px 28px rgba(17, 24, 39, 0.18);
            }

            .nv-admin-page {
                min-width: 0;
            }

            @media (max-width: 991.98px) {
                .nv-admin-shell {
                    border-radius: 12px;
                }

                .nv-admin-sidebar {
                    position: relative;
                    top: auto;
                    min-height: auto;
                    max-height: none;
                    overflow: visible;
                }

                .nv-admin-sidebar-menu {
                    margin-top: 0.5rem;
                }
            }

            @media (min-width: 992px) {
                .nv-admin-sidebar-menu.collapse {
                    display: block !important;
                    height: auto !important;
                }
            }
        </style>
        <?php
    }
}

if (!function_exists('render_nhan_vien_header')) {
    function render_nhan_vien_header(array $user, string $title = 'Quan ly hoa don', string $activeKey = 'orders'): void
    {
        $name = trim((string)($user['ten'] ?? $user['hovaten'] ?? 'Nhan vien'));
        if ($name === '') {
            $name = 'Nhan vien';
        }

        $phone = trim((string)($user['sodienthoai'] ?? ''));
        $avatar = nv_avatar_path((string)($user['anh_dai_dien'] ?? ''));

        $nameEsc = nv_header_escape($name);
        $phoneEsc = nv_header_escape($phone);
        $avatarEsc = nv_header_escape($avatar);
        $titleEsc = nv_header_escape($title);
        ?>
        <div class="container-fluid p-2 p-lg-3">
            <div class="row min-vh-100 nv-admin-shell">
                <aside class="col-12 col-lg-2 nv-admin-sidebar text-white p-3">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <div class="d-flex align-items-center gap-2">
                            <div class="nv-admin-brand">
                                <img src="../assets/logomvb.png" alt="logo">
                            </div>
                            <div>
                                <div class="fw-bold">Cham Soc Me va Be</div>
                                <small class="text-secondary">STAFF PANEL</small>
                            </div>
                        </div>
                        <button
                            class="btn btn-outline-light nv-admin-menu-toggle d-lg-none"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#nvSidebarMenu"
                            aria-expanded="false"
                            aria-controls="nvSidebarMenu"
                        >
                            <i class="bi bi-list"></i>
                        </button>
                    </div>

                    <div id="nvSidebarMenu" class="collapse nv-admin-sidebar-menu list-group list-group-flush mb-3">
                        <a href="thong-tin-nhan-vien.php" class="<?= nv_header_escape(nv_menu_link_class($activeKey, 'profile')) ?>"><i class="bi bi-person-badge"></i>Thong tin ca nhan</a>
                        <a href="danh-sach-hoa-don.php" class="<?= nv_header_escape(nv_menu_link_class($activeKey, 'orders')) ?>"><i class="bi bi-receipt"></i>Danh sach hoa don</a>
                        <a href="../index.html" class="<?= nv_header_escape(nv_menu_link_class($activeKey, 'home')) ?>"><i class="bi bi-house"></i>Trang chu</a>
                        <a href="../logout.php" class="list-group-item list-group-item-action d-flex align-items-center gap-2 rounded-3 mt-2 px-3 py-2 fw-semibold"><i class="bi bi-box-arrow-right"></i>Dang xuat</a>
                    </div>
                </aside>

                <section class="col-12 col-lg-10 p-0 d-flex flex-column nv-admin-main">
                    <header class="nv-admin-topbar px-3 py-2 d-flex align-items-center justify-content-between">
                        <h1 class="h5 nv-admin-title fw-bold mb-0"><?= $titleEsc ?></h1>
                        <div class="dropdown">
                            <button class="btn nv-admin-avatar-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                <img class="nv-admin-avatar" src="<?= $avatarEsc ?>" alt="avatar">
                                <span class="d-none d-sm-inline"><?= $nameEsc ?></span>
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end nv-admin-menu">
                                <li class="px-3 py-2 border-bottom">
                                    <div class="fw-semibold"><?= $nameEsc ?></div>
                                    <div class="text-muted small"><?= $phoneEsc ?></div>
                                </li>
                                <li><a class="dropdown-item" href="thong-tin-nhan-vien.php"><i class="bi bi-person-circle me-2"></i>Thong tin ca nhan</a></li>
                                <li><a class="dropdown-item" href="danh-sach-hoa-don.php"><i class="bi bi-receipt me-2"></i>Danh sach hoa don</a></li>
                                <li><a class="dropdown-item" href="../index.html"><i class="bi bi-house me-2"></i>Trang chu</a></li>
                                <li><a class="dropdown-item text-danger" href="../logout.php"><i class="bi bi-box-arrow-right me-2"></i>Dang xuat</a></li>
                            </ul>
                        </div>
                    </header>
                    <main class="flex-grow-1 p-3 nv-admin-page">
        <?php
    }
}

if (!function_exists('render_nhan_vien_layout_end')) {
    function render_nhan_vien_layout_end(): void
    {
        ?>
                    </main>
                </section>
            </div>
        </div>
        <?php
    }
}
