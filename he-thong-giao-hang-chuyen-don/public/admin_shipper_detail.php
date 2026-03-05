<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$shipper_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Lấy thông tin Shipper
$stmt = $conn->prepare("SELECT * FROM users WHERE id = ? AND role = 'shipper'");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$shipper = $stmt->get_result()->fetch_assoc();

if (!$shipper) {
    die("Shipper không tồn tại hoặc ID không hợp lệ.");
}

// --- TÍNH TOÁN CHỈ SỐ HIỆU SUẤT ---

// 1. Tổng đơn hàng được giao
$stmt = $conn->prepare("SELECT COUNT(*) as total FROM orders WHERE shipper_id = ?");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$total_orders = $stmt->get_result()->fetch_assoc()['total'];

// 2. Đơn hoàn tất
$stmt = $conn->prepare("SELECT COUNT(*) as completed FROM orders WHERE shipper_id = ? AND status = 'completed'");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$completed_orders = $stmt->get_result()->fetch_assoc()['completed'];

// 3. Đơn bị hủy/thất bại
$stmt = $conn->prepare("SELECT COUNT(*) as cancelled FROM orders WHERE shipper_id = ? AND status = 'cancelled'");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$cancelled_orders = $stmt->get_result()->fetch_assoc()['cancelled'];

// 4. Đánh giá trung bình
$stmt = $conn->prepare("SELECT AVG(rating) as avg_rating, COUNT(rating) as count_rating FROM orders WHERE shipper_id = ? AND rating > 0");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$rating_data = $stmt->get_result()->fetch_assoc();
$avg_rating = $rating_data['avg_rating'] ? round($rating_data['avg_rating'], 1) : 0;
$count_rating = $rating_data['count_rating'];

// 5. Tỷ lệ thành công
$success_rate = $total_orders > 0 ? round(($completed_orders / $total_orders) * 100, 1) : 0;

// --- LẤY DANH SÁCH ĐÁNH GIÁ GẦN ĐÂY ---
$feedbacks = [];
$stmt = $conn->prepare("SELECT o.order_code, o.rating, o.feedback, o.created_at, u.fullname as customer_name 
                        FROM orders o 
                        LEFT JOIN users u ON o.user_id = u.id 
                        WHERE o.shipper_id = ? AND o.rating > 0 
                        ORDER BY o.created_at DESC LIMIT 10");
$stmt->bind_param("i", $shipper_id);
$stmt->execute();
$res = $stmt->get_result();
while ($row = $res->fetch_assoc()) {
    $feedbacks[] = $row;
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Hồ sơ hiệu suất Shipper | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Hồ sơ hiệu suất Shipper</h2>
            <a href="users_manage.php" class="back-link">← Quay lại danh sách</a>
        </div>

        <!-- Thông tin cơ bản -->
        <div class="profile-header">
            <div class="avatar-circle">
                <?php echo strtoupper(substr($shipper['username'], 0, 1)); ?>
            </div>
            <div>
                <h2 style="margin: 0; color: #0a2a66;">
                    <?php echo htmlspecialchars($shipper['fullname']); ?>
                </h2>
                <p style="margin: 5px 0; color: #666;">@
                    <?php echo htmlspecialchars($shipper['username']); ?> | 📞
                    <?php echo htmlspecialchars($shipper['phone']); ?>
                </p>
                <p style="margin: 0; font-size: 13px; color: #888;">Tham gia:
                    <?php echo date('d/m/Y', strtotime($shipper['created_at'])); ?>
                </p>
            </div>
            <div style="margin-left: auto;">
                <?php if ($shipper['is_locked']): ?>
                    <span class="status-badge status-cancelled">Đang bị khóa</span>
                <?php else: ?>
                    <span class="status-badge status-completed">Đang hoạt động</span>
                <?php endif; ?>
            </div>
        </div>

        <!-- KPI Stats -->
        <div class="kpi-grid">
            <div class="kpi-card" style="border-top-color: #0a2a66;">
                <div class="kpi-label">Tổng đơn phân công</div>
                <div class="kpi-value">
                    <?php echo number_format($total_orders); ?>
                </div>
            </div>
            <div class="kpi-card" style="border-top-color: #28a745;">
                <div class="kpi-label">Giao thành công</div>
                <div class="kpi-value" style="color: #28a745;">
                    <?php echo number_format($completed_orders); ?>
                </div>
            </div>
            <div class="kpi-card" style="border-top-color: #17a2b8;">
                <div class="kpi-label">Tỷ lệ thành công</div>
                <div class="kpi-value" style="color: #17a2b8;">
                    <?php echo $success_rate; ?>%
                </div>
            </div>
            <div class="kpi-card" style="border-top-color: #ffc107;">
                <div class="kpi-label">Đánh giá trung bình</div>
                <div class="kpi-value" style="color: #ffc107;">
                    <?php echo $avg_rating; ?> <span style="font-size: 16px;">★</span>
                </div>
                <small style="color: #999;">(
                    <?php echo $count_rating; ?> lượt đánh giá)
                </small>
            </div>
        </div>

        <!-- Recent Reviews -->
        <h3 style="color: #0a2a66; margin-bottom: 15px;">💬 Đánh giá từ khách hàng (Gần đây)</h3>
        <?php if (empty($feedbacks)): ?>
            <p style="color: #666; font-style: italic;">Chưa có đánh giá nào.</p>
        <?php else: ?>
            <?php foreach ($feedbacks as $fb): ?>
                <div class="review-card">
                    <div class="review-header">
                        <strong>
                            <?php echo htmlspecialchars($fb['customer_name']); ?>
                        </strong>
                        <span style="color: #888;">
                            <?php echo date('d/m/Y', strtotime($fb['created_at'])); ?>
                        </span>
                    </div>
                    <div style="margin-bottom: 5px;">
                        <span class="star-rating">
                            <?php echo str_repeat('★', $fb['rating']) . str_repeat('☆', 5 - $fb['rating']); ?>
                        </span>
                        <span style="font-size: 13px; color: #666; margin-left: 10px;">Đơn hàng: #
                            <?php echo $fb['order_code']; ?>
                        </span>
                    </div>
                    <p style="margin: 0; color: #333;">"
                        <?php echo htmlspecialchars($fb['feedback']); ?>"
                    </p>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>

    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>

