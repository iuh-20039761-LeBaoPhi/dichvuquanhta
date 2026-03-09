<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$user_res = $conn->query("SELECT * FROM users WHERE id = $id");
if ($user_res->num_rows == 0)
    die("User not found");
$user = $user_res->fetch_assoc();

// Lấy lịch sử đơn hàng (Nếu là khách: đơn đã đặt, Nếu là shipper: đơn đã giao)
$orders = [];
if ($user['role'] == 'customer') {
    $sql_orders = "SELECT * FROM orders WHERE user_id = $id ORDER BY created_at DESC LIMIT 20";
} elseif ($user['role'] == 'shipper') {
    $sql_orders = "SELECT * FROM orders WHERE shipper_id = $id ORDER BY created_at DESC LIMIT 20";
} else {
    $sql_orders = "SELECT * FROM orders WHERE 1=0"; // Admin không có đơn
}
$res_orders = $conn->query($sql_orders);
while ($r = $res_orders->fetch_assoc())
    $orders[] = $r;

// Lấy log hoạt động (từ bảng order_logs)
$logs = [];
$sql_logs = "SELECT l.*, o.order_code FROM order_logs l JOIN orders o ON l.order_id = o.id WHERE l.user_id = $id ORDER BY l.changed_at DESC LIMIT 20";
$res_logs = $conn->query($sql_logs);
while ($r = $res_logs->fetch_assoc())
    $logs[] = $r;
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Lịch sử hoạt động: <?php echo htmlspecialchars($user['username']); ?></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Lịch sử: <span
                    style="color:#ff7a00"><?php echo htmlspecialchars($user['fullname']); ?></span>
                (<?php echo ucfirst($user['role']); ?>)</h2>
            <a href="users_manage.php" class="back-link">← Quay lại danh sách</a>
        </div>

        <div class="history-section">
            <h3>📦 Đơn hàng gần đây (20 đơn mới nhất)</h3>
            <?php if (empty($orders)): ?>
                <p>Chưa có dữ liệu đơn hàng.</p>
            <?php else: ?>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Mã đơn</th>
                            <th>Ngày tạo</th>
                            <th>Dịch vụ</th>
                            <th>Trạng thái</th>
                            <th>Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($orders as $o): ?>
                            <tr>
                                <td><strong><?php echo $o['order_code']; ?></strong></td>
                                <td><?php echo date('d/m/Y H:i', strtotime($o['created_at'])); ?></td>
                                <td><?php echo $o['service_type']; ?></td>
                                <td><span
                                        class="status-badge status-<?php echo $o['status']; ?>"><?php echo $o['status']; ?></span>
                                </td>
                                <td><a href="order_detail.php?id=<?php echo $o['id']; ?>" style="color:#0a2a66;">Xem</a></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>

        <div class="history-section">
            <h3>📝 Nhật ký thao tác (Log thay đổi trạng thái)</h3>
            <?php if (empty($logs)): ?>
                <p>Chưa có nhật ký hoạt động.</p>
            <?php else: ?>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Thời gian</th>
                            <th>Đơn hàng</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($logs as $l): ?>
                            <tr>
                                <td><?php echo date('d/m/Y H:i', strtotime($l['changed_at'])); ?></td>
                                <td><a
                                        href="order_detail.php?id=<?php echo $l['order_id']; ?>">#<?php echo $l['order_code']; ?></a>
                                </td>
                                <td>Đổi trạng thái từ <strong><?php echo $l['old_status']; ?></strong> sang
                                    <strong><?php echo $l['new_status']; ?></strong>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
    </main>
    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>

