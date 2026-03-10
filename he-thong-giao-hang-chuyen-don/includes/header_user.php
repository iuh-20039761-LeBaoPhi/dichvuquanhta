<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- FIX: Khởi tạo biến để tránh lỗi Undefined variable ---
$unread_notifications_count = 0;

// Nếu đã đăng nhập và có kết nối DB, thực hiện đếm
if (isset($_SESSION['user_id']) && isset($conn)) {
    // --- FIX: Kiểm tra tài khoản bị khóa (Force Logout) ---
    $stmt_lock = $conn->prepare("SELECT is_locked FROM users WHERE id = ?");
    $stmt_lock->bind_param("i", $_SESSION['user_id']);
    $stmt_lock->execute();
    $res_lock = $stmt_lock->get_result();
    if ($res_lock && $row_lock = $res_lock->fetch_assoc()) {
        if ($row_lock['is_locked'] == 1) {
            echo '<script>alert("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin."); window.location.href="logout.php";</script>';
            exit;
        }
    }
    $stmt_lock->close();

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
<header id="header">
    <nav class="navbar container">
        <div class="logo">
            <a href="index.php" style="text-decoration: none;">
                <h1>FastGo</h1>
            </a>
        </div>
        <ul class="nav-menu" id="nav-menu">
            <li class="<?php echo ($current_page === 'dashboard.php') ? 'active' : ''; ?>">
                <a href="dashboard.php">Dashboard</a>
            </li>
            <li class="<?php echo ($current_page === 'create_order.php') ? 'active' : ''; ?>">
                <a href="create_order.php">Tạo đơn hàng</a>
            </li>
            <li class="<?php echo ($current_page === 'order_history.php') ? 'active' : ''; ?>">
                <a href="order_history.php">Lịch sử đơn</a>
            </li>
            <!-- Notification Bell (MỚI) -->
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
                        <a href="notifications.php" style="font-size: 12px; color: #0a2a66; font-weight: normal;">Xem
                            tất cả</a>
                    </div>
                    <div id="notification-list">
                        <div class="notification-item" style="text-align: center; color: #999; padding: 20px;">Đang
                            tải...</div>
                    </div>
                </div>
            </li>
            <li class="dropdown <?php echo in_array($current_page, ['address_book.php', 'profile.php']) ? 'active' : ''; ?>">
                <a href="#"><?php echo htmlspecialchars($_SESSION['username'] ?? 'Tài khoản'); ?> ▾</a>
                <ul class="dropdown-menu">
                    <li><a href="address_book.php">Sổ địa chỉ</a></li>
                    <li><a href="profile.php">Hồ sơ</a></li>
                    <li><a href="logout.php">Đăng xuất</a></li>
                </ul>
            </li>
        </ul>
        <button class="hamburger-menu" id="hamburger-btn"><span></span><span></span><span></span></button>
    </nav>
</header>