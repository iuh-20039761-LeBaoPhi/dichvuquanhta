<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

$id = isset($_GET['id']) ? intval($_GET['id']) : 0;
$user_res = $conn->query("SELECT * FROM users WHERE id = $id");
if ($user_res->num_rows == 0) die("User not found");
$user = $user_res->fetch_assoc();

$orders = [];
if ($user['role'] == 'customer') {
    $sql_orders = "SELECT * FROM orders WHERE user_id = $id ORDER BY created_at DESC LIMIT 20";
} elseif ($user['role'] == 'shipper') {
    $sql_orders = "SELECT * FROM orders WHERE shipper_id = $id ORDER BY created_at DESC LIMIT 20";
} else {
    $sql_orders = "SELECT * FROM orders WHERE 1=0";
}
$res_orders = $conn->query($sql_orders);
while ($r = $res_orders->fetch_assoc()) $orders[] = $r;

$logs = [];
$sql_logs = "SELECT l.*, o.order_code FROM order_logs l JOIN orders o ON l.order_id = o.id WHERE l.user_id = $id ORDER BY l.created_at DESC LIMIT 20";
$res_logs = $conn->query($sql_logs);
while ($r = $res_logs->fetch_assoc()) $logs[] = $r;
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Lịch sử: <?php echo htmlspecialchars($user['fullname']); ?> | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Lịch sử hoạt động: <span style="color:#0a2a66"><?php echo htmlspecialchars($user['fullname']); ?></span></h2>
            <div style="display: flex; gap: 10px;">
                <span class="status-badge" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;"><?php echo strtoupper($user['role']); ?></span>
                <a href="users_manage.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Danh sách</a>
            </div>
        </div>

        <div class="dashboard-layout" style="grid-template-columns: 1.5fr 1fr; gap: 30px;">
            <div class="admin-card" style="padding: 0;">
                <div class="admin-card-header" style="padding: 20px 30px; border-bottom: 1px solid #edf2f7; margin-bottom: 0;">
                    <h3><i class="fa-solid fa-boxes-packing"></i> Đơn hàng liên quan (Gần đây)</h3>
                </div>
                <div class="table-responsive">
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Mã đơn</th>
                                <th>Thời gian</th>
                                <th>Trạng thái</th>
                                <th style="text-align: right;">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($orders)): ?>
                                <tr><td colspan="4" style="text-align:center; padding: 40px; color: #64748b;">Chưa có dữ liệu đơn hàng nào.</td></tr>
                            <?php else: ?>
                                <?php foreach ($orders as $o): ?>
                                    <tr>
                                        <td style="font-weight: 700; color: #0a2a66;">#<?php echo $o['order_code']; ?></td>
                                        <td style="font-size: 13px; color: #64748b;"><?php echo date('d/m/Y', strtotime($o['created_at'])); ?></td>
                                        <td><span class="status-badge status-<?php echo $o['status']; ?>"><?php echo $o['status']; ?></span></td>
                                        <td style="text-align: right;">
                                            <a href="order_detail.php?id=<?php echo $o['id']; ?>" class="btn-sm"><i class="fa-solid fa-eye"></i></a>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="admin-card" style="padding: 0;">
                <div class="admin-card-header" style="padding: 20px 30px; border-bottom: 1px solid #edf2f7; margin-bottom: 0;">
                    <h3><i class="fa-solid fa-file-invoice"></i> Nhật ký thao tác (Log)</h3>
                </div>
                <div class="table-responsive">
                    <table class="order-table" style="font-size: 12px;">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($logs)): ?>
                                <tr><td colspan="2" style="text-align:center; padding: 40px; color: #64748b;">Chưa có nhật ký hoạt động.</td></tr>
                            <?php else: ?>
                                <?php foreach ($logs as $l): ?>
                                    <tr>
                                        <td style="color: #64748b;"><i class="fa-regular fa-clock"></i> <?php echo date('H:i d/m', strtotime($l['created_at'])); ?></td>
                                        <td>
                                            Cập nhật <a href="order_detail.php?id=<?php echo $l['order_id']; ?>" style="font-weight: 700; color: #0a2a66; text-decoration: none;">#<?php echo $l['order_code']; ?></a><br>
                                            <span style="opacity: 0.7; font-size: 11px;"><?php echo $l['old_status']; ?> ➔ <?php echo $l['new_status']; ?></span>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>
    <?php include __DIR__ . '/../../includes/footer.php'; ?>
</body>
</html>

