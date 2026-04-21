<?php
declare(strict_types=1);

function session_user_require_customer(string $loginUrl, string $returnPage = 'danh-sach-don-hang.php'): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }
    
    if (!isset($_SESSION['user']) || empty($_SESSION['user']['sodienthoai'])) {
        header('Location: ' . $loginUrl . '?redirect=' . urlencode($returnPage));
        exit;
    }
    
    return $_SESSION['user'];
}

function render_khach_hang_header_styles(): void
{
    ?>
    <style>
        .kh-navbar {
            background: linear-gradient(135deg, #007bff, #00b4d8) !important;
            padding: 12px 0;
        }
        .kh-navbar .navbar-brand {
            color: #fff !important;
            font-weight: 700;
        }
        .kh-navbar .nav-link {
            color: rgba(255,255,255,0.9) !important;
            font-weight: 600;
        }
        .kh-navbar .nav-link:hover {
            color: #fff !important;
        }
        .kh-footer {
            background: #1e3a5f;
            color: #fff;
            padding: 20px 0;
            margin-top: 40px;
        }
    </style>
    <?php
}

function render_khach_hang_header(array $user, string $pageTitle = '', string $activeKey = ''): void
{
    $userName = htmlspecialchars($user['hovaten'] ?? 'Khách hàng');
    ?>
    <nav class="navbar navbar-expand-lg kh-navbar">
        <div class="container">
            <a class="navbar-brand" href="../index.html">
                <img src="../assets/logo_main.png" alt="Logo" style="height: 40px;">
                Thuê Tài Xế
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto">
                    <li class="nav-item"><a class="nav-link" href="../index.html">Trang chủ</a></li>
                    <li class="nav-item"><a class="nav-link" href="../dich-vu.html">Dịch vụ</a></li>
                    <li class="nav-item"><a class="nav-link <?= $activeKey === 'orders' ? 'active' : '' ?>" href="danh-sach-don-hang.php">Đơn hàng</a></li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle" href="#" data-bs-toggle="dropdown">
                            <?= $userName ?>
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="dropdown-item" href="../logout.php">Đăng xuất</a></li>
                        </ul>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
    <?php
}

function render_khach_hang_layout_end(): void
{
    ?>
    <footer class="kh-footer">
        <div class="container text-center">
            <p class="mb-0">&copy; 2026 Dịch Vụ Thuê Tài Xế. Tất cả quyền được bảo lưu.</p>
        </div>
    </footer>
    <?php
}
?>