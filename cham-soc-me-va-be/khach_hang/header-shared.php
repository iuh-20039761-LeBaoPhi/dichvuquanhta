<?php
declare(strict_types=1);

if (!function_exists('kh_header_escape')) {
    function kh_header_escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
    }
}

if (!function_exists('render_khach_hang_header_styles')) {
    function render_khach_hang_header_styles(): void
    {
        ?>
        <style>
            .kh-topbar {
                background: linear-gradient(95deg, #0b4ea2 0%, #0e61c0 45%, #1a73e8 100%);
                border-radius: 14px;
                box-shadow: 0 10px 30px rgba(11, 78, 162, 0.24);
            }
            .kh-brand {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                text-decoration: none;
                color: #fff;
                font-weight: 700;
                letter-spacing: 0.2px;
            }
            .kh-brand img {
                width: 34px;
                height: 34px;
                border-radius: 8px;
                object-fit: cover;
                background: #fff;
                padding: 3px;
            }
            .kh-title {
                color: #e9f2ff;
                font-size: 0.95rem;
                margin: 0;
                opacity: 0.95;
            }
            .kh-avatar-btn {
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
            .kh-avatar-btn:hover {
                background: rgba(255, 255, 255, 0.18);
                color: #fff;
            }
            .kh-avatar {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(255, 255, 255, 0.65);
                background: #fff;
            }
            .kh-menu {
                min-width: 220px;
                border: 0;
                border-radius: 12px;
                box-shadow: 0 12px 28px rgba(17, 24, 39, 0.18);
            }
        </style>
        <?php
    }
}

if (!function_exists('render_khach_hang_header')) {
    function render_khach_hang_header(array $user, string $title = 'Hoa don cua ban'): void
    {
        $name = trim((string)($user['ten'] ?? 'Khach hang'));
        if ($name === '') {
            $name = 'Khach hang';
        }

        $phone = trim((string)($user['sodienthoai'] ?? ''));
        $avatar = trim((string)($user['anh_dai_dien'] ?? ''));
        if ($avatar === '') {
            $avatar = '../assets/logomvb.png';
        }

        $nameEsc = kh_header_escape($name);
        $phoneEsc = kh_header_escape($phone);
        $avatarEsc = kh_header_escape($avatar);
        $titleEsc = kh_header_escape($title);
        ?>
        <header class="kh-topbar px-3 px-md-4 py-3 mb-3">
            <div class="d-flex align-items-center justify-content-between gap-3">
                <div class="d-flex align-items-center gap-3">
                    <a class="kh-brand" href="../index.html">
                        <img src="../assets/logomvb.png" alt="logo">
                        <span>DVQT Chăm Sóc Mẹ và Bé</span>
                    </a>
                    <p class="kh-title d-none d-md-block"><?= $titleEsc ?></p>
                </div>
                <div class="dropdown">
                    <button class="btn kh-avatar-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        <img class="kh-avatar" src="<?= $avatarEsc ?>" alt="avatar">
                        <span class="d-none d-sm-inline"><?= $nameEsc ?></span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end kh-menu">
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
