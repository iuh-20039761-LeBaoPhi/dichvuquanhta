<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- FIX: Kiểm tra tài khoản bị khóa (Force Logout) ---
if (isset($_SESSION['user_id']) && isset($conn)) {
    $stmt_lock = $conn->prepare("SELECT is_locked FROM users WHERE id = ?");
    $stmt_lock->bind_param("i", $_SESSION['user_id']);
    $stmt_lock->execute();
    $res_lock = $stmt_lock->get_result();
    if ($res_lock && $row_lock = $res_lock->fetch_assoc()) {
        if ($row_lock['is_locked'] == 1) {
            echo '<script>alert("Tài khoản của bạn đã bị khóa."); window.location.href="logout.php";</script>';
            exit;
        }
    }
    $stmt_lock->close();
}

// Detect current page for active state
$current_page = basename($_SERVER['PHP_SELF']);
?>
<link rel="stylesheet" href="assets/css/admin_styles.css?v=<?php echo time(); ?>">
<header id="header" class="header-admin">
    <nav class="navbar">
        <div class="logo">
            <h1>
                <a href="../../index.html" class="header-logo-link">
                    FastGo <span class="header-accent">Admin</span>
                </a>
            </h1>
        </div>

        <button class="hamburger-menu" id="hamburger-btn">
            <span></span>
            <span></span>
            <span></span>
        </button>

        <ul class="nav-menu" id="nav-menu">
            <li class="<?php echo ($current_page === 'admin_stats.php') ? 'active' : ''; ?>">
                <a href="admin_stats.php">📊 Dashboard</a>
            </li>

            <!-- Submenu: Quản lý -->
            <li
                class="has-submenu <?php echo in_array($current_page, ['orders_manage.php', 'users_manage.php', 'services_manage.php']) ? 'active' : ''; ?>">
                <a href="#" class="submenu-toggle">📦 Quản lý <span class="arrow">▼</span></a>
                <ul class="submenu">
                    <li class="<?php echo ($current_page === 'orders_manage.php') ? 'active' : ''; ?>">
                        <a href="orders_manage.php">Đơn hàng</a>
                    </li>
                    <li class="<?php echo ($current_page === 'users_manage.php') ? 'active' : ''; ?>">
                        <a href="users_manage.php">Người dùng</a>
                    </li>
                    <li class="<?php echo ($current_page === 'services_manage.php') ? 'active' : ''; ?>">
                        <a href="services_manage.php">Dịch vụ</a>
                    </li>
                </ul>
            </li>

            <!-- Submenu: Nội dung -->
            <li
                class="has-submenu <?php echo in_array($current_page, ['testimonials_manage.php', 'faq_manage.php', 'contact_manage.php']) ? 'active' : ''; ?>">
                <a href="#" class="submenu-toggle">📝 Nội dung <span class="arrow">▼</span></a>
                <ul class="submenu">
                    <li class="<?php echo ($current_page === 'testimonials_manage.php') ? 'active' : ''; ?>">
                        <a href="testimonials_manage.php">Đánh giá</a>
                    </li>
                    <li class="<?php echo ($current_page === 'faq_manage.php') ? 'active' : ''; ?>">
                        <a href="faq_manage.php">FAQ</a>
                    </li>
                    <li class="<?php echo ($current_page === 'contact_manage.php') ? 'active' : ''; ?>">
                        <a href="contact_manage.php">Liên hệ</a>
                    </li>
                </ul>
            </li>

            <li class="<?php echo ($current_page === 'admin_settings.php') ? 'active' : ''; ?>">
                <a href="admin_settings.php">⚙️ Cài đặt</a>
            </li>
            <li class="<?php echo ($current_page === 'admin_profile.php') ? 'active' : ''; ?>">
                <a href="admin_profile.php">👤 Tài khoản</a>
            </li>
            <li><a href="index.php" target="_blank" class="btn-view-site">Xem trang chủ ↗</a></li>
            <li class="logout-item">
                <a href="logout.php" class="btn-logout">🚪 Đăng xuất</a>
            </li>
        </ul>
    </nav>
</header>
