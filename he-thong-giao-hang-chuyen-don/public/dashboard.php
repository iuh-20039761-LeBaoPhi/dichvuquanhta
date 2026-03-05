<?php
session_start();
require_once __DIR__ . '/../config/db.php';
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

// Nếu là Admin thì chuyển ngay sang trang quản lý, không cho ở lại đây
if (isset($_SESSION['role']) && $_SESSION['role'] === 'admin') {
    header("Location: admin_stats.php");
    exit;
}

// Nếu là Shipper thì chuyển sang dashboard shipper
if (isset($_SESSION['role']) && $_SESSION['role'] === 'shipper') {
    header("Location: shipper_dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Dashboard | FastGo</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/styles.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_user.php'; ?>

    <main class="container" style="padding: 40px 20px; min-height: 60vh;">
        <h2 class="section-title">Chào mừng, <?php echo htmlspecialchars($_SESSION['username']); ?>!</h2>

        <div
            style="margin-top: 20px; display: grid; gap: 20px; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
            <!-- Card 1 -->
            <div class="service-card">
                <h3>📦 Đặt đơn mới</h3>
                <p>Tạo đơn hàng vận chuyển ngay lập tức.</p>
                <a href="create_order.php" class="btn-primary" style="margin-top: 10px; display:inline-block;">Tạo đơn
                    ngay</a>
            </div>

            <!-- Card 2 -->
            <div class="service-card">
                <h3>🔍 Lịch sử đơn hàng</h3>
                <p>Xem lại trạng thái và chi tiết các đơn hàng bạn đã tạo.</p>
                <a href="order_history.php" class="btn-secondary"
                    style="margin-top: 10px; color: #0a2a66; border-color: #0a2a66; display:inline-block; text-decoration:none;">Xem
                    lịch sử</a>
            </div>

            <!-- Card 4: Sổ địa chỉ (MỚI) -->
            <div class="service-card">
                <h3>📒 Sổ địa chỉ</h3>
                <p>Quản lý danh sách địa chỉ giao nhận thường dùng.</p>
                <a href="address_book.php" class="btn-secondary"
                    style="margin-top: 10px; color: #0a2a66; border-color: #0a2a66; display:inline-block; text-decoration:none;">Quản
                    lý</a>
            </div>

            <!-- Card 3 -->
            <div class="service-card">
                <h3>👤 Thông tin tài khoản</h3>
                <p>Cập nhật thông tin cá nhân và mật khẩu.</p>
                <a href="profile.php" class="btn-secondary"
                    style="margin-top: 10px; color: #0a2a66; border-color: #0a2a66; display:inline-block; text-decoration:none;">Quản
                    lý hồ sơ</a>
            </div>
        </div>

    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>


</body>

</html>
