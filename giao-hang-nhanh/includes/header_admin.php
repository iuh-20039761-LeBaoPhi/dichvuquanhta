<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- FIX: Kiểm tra tài khoản bị khóa (Force Logout) ---
if (isset($_SESSION['user_id']) && isset($conn)) {
    $stmt_lock = $conn->prepare("SELECT is_locked FROM users WHERE id = ?");
    if ($stmt_lock) {
        $stmt_lock->bind_param("i", $_SESSION['user_id']);
        $stmt_lock->execute();
        $res_lock = $stmt_lock->get_result();
        if ($res_lock && $row_lock = $res_lock->fetch_assoc()) {
            if ($row_lock['is_locked'] == 1) {
                echo '<script>alert("Tài khoản của bạn đã bị khóa."); window.location.href="../logout.php";</script>';
                exit;
            }
        }
        $stmt_lock->close();
    }
}

// Detect current page for active state
$current_page = basename($_SERVER['PHP_SELF']);
?>
<!-- FontAwesome 6.4.0 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">

<header id="header" class="header-admin">
    <nav class="navbar">
        <div class="header-left">
            <button class="hamburger-menu" id="hamburger-btn">
                <span></span>
                <span></span>
                <span></span>
            </button>
            <div class="logo">
                <h1>
                    <a href="admin_stats.php" class="header-logo-link">
                        Giao Hàng <span class="header-accent">Nhanh</span> <small class="header-badge">Admin</small>
                    </a>
                </h1>
            </div>
        </div>

        <div class="header-center">
            <ul class="nav-menu" id="nav-menu">
                <li class="<?php echo ($current_page === 'admin_stats.php') ? 'active' : ''; ?>">
                    <a href="admin_stats.php">📊 Dashboard</a>
                </li>

                <!-- Submenu: Quản lý -->
                <li class="has-submenu <?php echo in_array($current_page, ['orders_manage.php', 'users_manage.php', 'admin_refund_report.php']) ? 'active' : ''; ?>">
                    <a href="#" class="submenu-toggle">📦 Quản lý <span class="arrow">▼</span></a>
                    <ul class="submenu">
                        <li class="<?php echo ($current_page === 'orders_manage.php') ? 'active' : ''; ?>"><a href="orders_manage.php">Đơn hàng</a></li>
                        <li class="<?php echo ($current_page === 'users_manage.php') ? 'active' : ''; ?>"><a href="users_manage.php">Người dùng</a></li>
                        <li class="<?php echo ($current_page === 'admin_refund_report.php') ? 'active' : ''; ?>"><a href="admin_refund_report.php">Hoàn tiền</a></li>
                    </ul>
                </li>

                <!-- Submenu: Nội dung -->
                <li class="has-submenu <?php echo in_array($current_page, ['contact_manage.php']) ? 'active' : ''; ?>">
                    <a href="#" class="submenu-toggle">📝 Nội dung <span class="arrow">▼</span></a>
                    <ul class="submenu">
                        <li class="<?php echo ($current_page === 'contact_manage.php') ? 'active' : ''; ?>"><a href="contact_manage.php">Liên hệ</a></li>
                    </ul>
                </li>

                <li class="<?php echo ($current_page === 'admin_settings.php') ? 'active' : ''; ?>">
                    <a href="admin_settings.php">⚙️ Cài đặt</a>
                </li>
            </ul>
        </div>

        <div class="header-right">
            <!-- Notifications -->
            <div class="header-action-item notification-wrapper">
                <?php
                $unread_count = 0;
                if (isset($_SESSION['user_id']) && isset($conn)) {
                    $stmt_count = $conn->prepare("SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = 0");
                    if ($stmt_count) {
                        $stmt_count->bind_param("i", $_SESSION['user_id']);
                        $stmt_count->execute();
                        $stmt_count->bind_result($total_n);
                        if ($stmt_count->fetch()) {
                            $unread_count = (int)$total_n;
                        }
                        $stmt_count->close();
                    }
                }
                ?>
                <a href="#" class="notification-link" id="admin-notification-bell" title="Thông báo">
                    <i class="fa-regular fa-bell"></i>
                    <?php if ($unread_count > 0): ?>
                        <span class="notification-badge"><?php echo $unread_count; ?></span>
                    <?php endif; ?>
                </a>
                <div class="header-dropdown notification-dropdown" id="admin-notification-dropdown">
                    <div class="dropdown-header">
                        <span>Thông báo</span>
                        <a href="../notifications.php">Xem tất cả</a>
                    </div>
                    <div class="dropdown-body">
                        <div class="empty-state">Không có thông báo mới</div>
                    </div>
                </div>
            </div>

            <!-- View Site -->
            <div class="header-action-item">
                <a href="../../index.html" target="_blank" class="btn-view-site-pill" title="Xem trang chủ">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>

            <!-- Profile Dropdown -->
            <div class="header-action-item profile-dropdown-wrapper">
                <div class="profile-toggle" id="profile-toggle">
                    <div class="profile-avatar">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <span class="profile-name"><?php echo htmlspecialchars($_SESSION['username'] ?? 'Admin'); ?></span>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
                <ul class="profile-menu">
                    <li class="<?php echo ($current_page === 'admin_profile.php') ? 'active' : ''; ?>">
                        <a href="admin_profile.php"><i class="fa-solid fa-circle-user"></i> Hồ sơ cá nhân</a>
                    </li>
                    <li class="divider"></li>
                    <li>
                        <a href="../logout.php" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</header>
<!-- Core & Navigation Scripts -->
<script src="../assets/js/main-core.js?v=<?php echo time(); ?>"></script>
<script src="../assets/js/modules/main-navigation.js?v=<?php echo time(); ?>"></script>
