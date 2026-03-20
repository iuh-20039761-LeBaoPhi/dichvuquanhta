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
            echo '<script>alert("Tài khoản của bạn đã bị khóa."); window.location.href="../logout.php";</script>';
            exit;
        }
    }
    $stmt_lock->close();
}

// Detect current page for active state
$current_page = basename($_SERVER['PHP_SELF']);

// Count unread notifications
$unread_notifications_count = 0;
if (isset($_SESSION['user_id']) && isset($conn)) {
    $stmt_notify = $conn->prepare("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0");
    if ($stmt_notify) {
        $stmt_notify->bind_param("i", $_SESSION['user_id']);
        $stmt_notify->execute();
        $res_notify = $stmt_notify->get_result();
        if ($res_notify && $row_notify = $res_notify->fetch_assoc()) {
            $unread_notifications_count = $row_notify['count'];
        }
        $stmt_notify->close();
    }
}
?>
<!-- FontAwesome 6.4.0 -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
<link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
<header id="header">
    <nav class="navbar container">
        <div class="logo">
            <a href="shipper_dashboard.php" style="text-decoration: none;">
                <h1>Giao Hàng Nhanh</h1>
            </a>
        </div>

        <ul class="nav-menu" id="nav-menu">
            <li class="<?php echo ($current_page === 'shipper_dashboard.php') ? 'active' : ''; ?>">
                <a href="shipper_dashboard.php">Dashboard</a>
            </li>
            <li class="<?php echo ($current_page === 'shipper_orders.php') ? 'active' : ''; ?>">
                <a href="shipper_dashboard.php">Đơn hàng của tôi</a>
            </li>

            <!-- Notification Bell (giống User) -->
            <li class="dropdown <?php echo ($current_page === 'notifications.php') ? 'active' : ''; ?>" id="notification-bell">
                <a href="#" style="font-size: 20px; color: white; padding: 0 10px; position: relative;">
                    🔔
                    <?php if ($unread_notifications_count > 0): ?>
                        <span id="notification-count"
                            style="position: absolute; top: -5px; right: 0; background: #d9534f; color: white; font-size: 10px; padding: 2px 5px; border-radius: 10px; min-width: 18px; text-align: center;"><?php echo $unread_notifications_count; ?></span>
                    <?php endif; ?>
                </a>
                <div class="dropdown-menu" id="notification-dropdown" style="min-width: 300px; right: 0; left: auto;">
                    <div
                        style="padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #eee; color: #333; display: flex; justify-content: space-between; align-items: center;">
                        Thông báo
                        <a href="../notifications.php" style="font-size: 12px; color: #0a2a66; font-weight: normal;">Xem
                            tất cả</a>
                    </div>
                    <div id="notification-list">
                        <div class="notification-item" style="text-align: center; color: #999; padding: 20px;">Đang
                            tải...</div>
                    </div>
                </div>
            </li>

            <!-- Account Dropdown (giống User) -->
            <li class="dropdown <?php echo in_array($current_page, ['shipper_profile.php', 'profile.php']) ? 'active' : ''; ?>">
                <a href="#">👤 <?php echo htmlspecialchars($_SESSION['username'] ?? 'Tài khoản'); ?> ▾</a>
                <ul class="dropdown-menu">
                    <li class="<?php echo ($current_page === 'shipper_profile.php' || $current_page === 'profile.php') ? 'active' : ''; ?>">
                        <a href="shipper_profile.php">Hồ sơ</a>
                    </li>
                    <li><a href="../logout.php">Đăng xuất</a></li>
                </ul>
            </li>
        </ul>

        <button class="hamburger-menu" id="hamburger-btn"><span></span><span></span><span></span></button>
    </nav>
</header>
<!-- Core & Navigation Scripts -->
<script src="../assets/js/main-core.js?v=<?php echo time(); ?>"></script>
<script src="../assets/js/modules/main-navigation.js?v=<?php echo time(); ?>"></script>
