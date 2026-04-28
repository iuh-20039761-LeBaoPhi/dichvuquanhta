<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$currentPage = basename($_SERVER['PHP_SELF'] ?? '');
$unreadCount = 0;
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
                    <a href="index.php" class="header-logo-link">
                        Admin <span class="header-accent">Giao Hàng</span> <small class="header-badge">Standalone</small>
                    </a>
                </h1>
            </div>
        </div>

        <div class="header-center">
            <ul class="nav-menu" id="nav-menu">
                <li class="<?php echo in_array($currentPage, ['index.php', 'admin_stats.php'], true) ? 'active' : ''; ?>">
                    <a href="index.php">Dashboard</a>
                </li>
                <li class="has-submenu <?php echo in_array($currentPage, ['orders_manage.php', 'users_manage.php', 'articles_manage.php', 'admin_service_content.php'], true) ? 'active' : ''; ?>">
                    <a href="#" class="submenu-toggle">Quản lý <span class="arrow">▼</span></a>
                    <ul class="submenu">
                        <li class="<?php echo $currentPage === 'orders_manage.php' ? 'active' : ''; ?>"><a href="orders_manage.php">Đơn hàng</a></li>
                        <li class="<?php echo $currentPage === 'users_manage.php' ? 'active' : ''; ?>"><a href="users_manage.php">Người dùng</a></li>
                        <li class="<?php echo $currentPage === 'admin_service_content.php' ? 'active' : ''; ?>"><a href="admin_service_content.php">Nội dung dịch vụ</a></li>
                        <li class="<?php echo $currentPage === 'articles_manage.php' ? 'active' : ''; ?>"><a href="articles_manage.php">Cẩm nang</a></li>
                    </ul>
                </li>
                <li class="<?php echo $currentPage === 'contact_manage.php' ? 'active' : ''; ?>">
                    <a href="contact_manage.php">Liên hệ</a>
                </li>
                <li class="<?php echo $currentPage === 'admin_pricing.php' ? 'active' : ''; ?>">
                    <a href="admin_pricing.php">Bảng giá</a>
                </li>
                <li class="<?php echo $currentPage === 'pricing_support.php' ? 'active' : ''; ?>">
                    <a href="pricing_support.php">Dữ liệu giá</a>
                </li>
                <li class="<?php echo $currentPage === 'admin_guide.php' ? 'active' : ''; ?>">
                    <a href="admin_guide.php">Hướng dẫn</a>
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
                <a href="index.php" class="btn-view-site-pill" title="Tổng quan">
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
