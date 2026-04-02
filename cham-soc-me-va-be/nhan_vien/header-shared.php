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

if (!function_exists('render_nhan_vien_header_styles')) {
    function render_nhan_vien_header_styles(): void
    {
        ?>
        <style>
            .nv-topbar {
                background: linear-gradient(95deg, #0b4ea2 0%, #0e61c0 45%, #1a73e8 100%);
                border-radius: 14px;
                box-shadow: 0 10px 30px rgba(11, 78, 162, 0.24);
            }
            .nv-brand {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                text-decoration: none;
                color: #fff;
                font-weight: 700;
                letter-spacing: 0.2px;
            }
            .nv-brand img {
                width: 34px;
                height: 34px;
                border-radius: 8px;
                object-fit: cover;
                background: #fff;
                padding: 3px;
            }
            .nv-title {
                color: #e9f2ff;
                font-size: 0.95rem;
                margin: 0;
                opacity: 0.95;
            }
            .nv-avatar-btn {
                border: 1px solid rgba(255, 255, 255, 0.35);
                color: #fff;
                background: rgba(255, 255, 255, 0.12);
                border-radius: 999px;
                padding: 4px 10px 4px 4px;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
            }
            .nv-avatar-btn:hover {
                background: rgba(255, 255, 255, 0.18);
                color: #fff;
            }
            .nv-avatar {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(255, 255, 255, 0.65);
                background: #fff;
            }
            .nv-menu {
                min-width: 220px;
                border: 0;
                border-radius: 12px;
                box-shadow: 0 12px 28px rgba(17, 24, 39, 0.18);
            }
        </style>
        <?php
    }
}

if (!function_exists('render_nhan_vien_header')) {
    function render_nhan_vien_header(array $user, string $title = 'Quan ly hoa don'): void
    {
        $name = trim((string)($user['ten'] ?? 'Nhan vien'));
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
        <header class="nv-topbar px-3 px-md-4 py-3 mb-3">
            <div class="d-flex align-items-center justify-content-between gap-3">
                <div class="d-flex align-items-center gap-3">
                    <a class="nv-brand" href="../index.html">
                        <img src="../assets/logomvb.png" alt="logo">
                        <span>DVQT Chăm Sóc Mẹ và Bé</span>
                    </a>
                    <p class="nv-title d-none d-md-block"><?= $titleEsc ?></p>
                </div>
                <div class="dropdown">
                    <button class="btn nv-avatar-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <img class="nv-avatar" src="<?= $avatarEsc ?>" alt="avatar">
                        <span class="d-none d-sm-inline"><?= $nameEsc ?></span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end nv-menu">
                        <li class="px-3 py-2 border-bottom">
                            <div class="fw-semibold"><?= $nameEsc ?></div>
                            <div class="text-muted small"><?= $phoneEsc ?></div>
                        </li>
                        <li><a class="dropdown-item" href="../index.html"><i class="bi bi-house me-2"></i>Trang chu</a></li>
                        <li><a class="dropdown-item text-danger" href="../logout.php"><i class="bi bi-box-arrow-right me-2"></i>Dang xuat</a></li>
                    </ul>
                </div>
            </div>
        </header>
        <?php
    }
}
