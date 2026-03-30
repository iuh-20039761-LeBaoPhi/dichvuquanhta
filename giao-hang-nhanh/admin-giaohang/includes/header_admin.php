<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($conn)) {
    require_once __DIR__ . '/../config/db.php';
}

if (isset($_SESSION['user_id']) && isset($conn)) {
    $stmtLock = $conn->prepare("SELECT bi_khoa AS is_locked FROM nguoi_dung WHERE id = ? LIMIT 1");
    if ($stmtLock) {
        $stmtLock->bind_param("i", $_SESSION['user_id']);
        $stmtLock->execute();
        $lockedRow = $stmtLock->get_result()->fetch_assoc();
        $stmtLock->close();

        if ($lockedRow && (int) ($lockedRow['is_locked'] ?? 0) === 1) {
            echo '<script>alert("Tài khoản của bạn đã bị khóa."); window.location.href="logout.php";</script>';
            exit;
        }
    }
}

$currentPage = basename($_SERVER['PHP_SELF'] ?? '');
$unreadCount = 0;
if (isset($_SESSION['user_id']) && isset($conn)) {
    $stmtCount = $conn->prepare("SELECT COUNT(*) AS total FROM thong_bao WHERE nguoi_dung_id = ? AND da_doc = 0");
    if ($stmtCount) {
        $stmtCount->bind_param("i", $_SESSION['user_id']);
        $stmtCount->execute();
        $countRow = $stmtCount->get_result()->fetch_assoc();
        $unreadCount = (int) ($countRow['total'] ?? 0);
        $stmtCount->close();
    }
}
?>
<link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

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
                        Admin <span class="header-accent">Giao Hàng</span> <small class="header-badge">Standalone</small>
                    </a>
                </h1>
            </div>
        </div>

        <div class="header-center">
            <ul class="nav-menu" id="nav-menu">
                <li class="<?php echo $currentPage === 'admin_stats.php' ? 'active' : ''; ?>">
                    <a href="admin_stats.php">Dashboard</a>
                </li>
                <li class="has-submenu <?php echo in_array($currentPage, ['orders_manage.php', 'users_manage.php', 'admin_refund_report.php'], true) ? 'active' : ''; ?>">
                    <a href="#" class="submenu-toggle">Quản lý <span class="arrow">▼</span></a>
                    <ul class="submenu">
                        <li class="<?php echo $currentPage === 'orders_manage.php' ? 'active' : ''; ?>"><a href="orders_manage.php">Đơn hàng</a></li>
                        <li class="<?php echo $currentPage === 'users_manage.php' ? 'active' : ''; ?>"><a href="users_manage.php">Người dùng</a></li>
                        <li class="<?php echo $currentPage === 'admin_refund_report.php' ? 'active' : ''; ?>"><a href="admin_refund_report.php">Hoàn tiền</a></li>
                    </ul>
                </li>
                <li class="<?php echo $currentPage === 'contact_manage.php' ? 'active' : ''; ?>">
                    <a href="contact_manage.php">Liên hệ</a>
                </li>
                <li class="<?php echo $currentPage === 'admin_settings.php' ? 'active' : ''; ?>">
                    <a href="admin_settings.php">Cài đặt</a>
                </li>
            </ul>
        </div>

        <div class="header-right">
            <div class="header-action-item notification-wrapper">
                <a href="#" class="notification-link" id="admin-notification-bell" title="Thông báo">
                    <i class="fa-regular fa-bell"></i>
                    <?php if ($unreadCount > 0): ?>
                        <span class="notification-badge"><?php echo $unreadCount; ?></span>
                    <?php endif; ?>
                </a>
                <div class="header-dropdown notification-dropdown" id="admin-notification-dropdown">
                    <div class="dropdown-header">
                        <span>Thông báo</span>
                        <a href="notifications.php">Xem tất cả</a>
                    </div>
                    <div class="dropdown-body">
                        <div class="empty-state">Không có thông báo mới</div>
                    </div>
                </div>
            </div>

            <div class="header-action-item">
                <a href="admin_stats.php" class="btn-view-site-pill" title="Tổng quan">
                    <i class="fa-solid fa-house"></i>
                </a>
            </div>

            <div class="header-action-item profile-dropdown-wrapper">
                <div class="profile-toggle" id="profile-toggle">
                    <div class="profile-avatar">
                        <i class="fa-solid fa-user-tie"></i>
                    </div>
                    <span class="profile-name"><?php echo htmlspecialchars($_SESSION['username'] ?? 'Admin'); ?></span>
                    <i class="fa-solid fa-chevron-down caret"></i>
                </div>
                <ul class="profile-menu">
                    <li class="<?php echo $currentPage === 'admin_profile.php' ? 'active' : ''; ?>">
                        <a href="admin_profile.php"><i class="fa-solid fa-circle-user"></i> Hồ sơ cá nhân</a>
                    </li>
                    <li class="divider"></li>
                    <li>
                        <a href="logout.php" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
</header>
<script src="assets/js/modules/main-navigation.js?v=<?php echo time(); ?>"></script>
