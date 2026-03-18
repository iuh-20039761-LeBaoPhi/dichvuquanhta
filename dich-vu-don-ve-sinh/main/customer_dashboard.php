<?php
session_start();
require_once "db.php";

if (!isset($_SESSION['customer'])) {
    header("Location: login_customer.php");
    exit;
}

$customer = $_SESSION['customer'];   // ✅ THÊM DÒNG NÀY
$id = (int)$customer['id'];

$result = $conn->query("
    SELECT service_type, booking_date, status, created_at
    FROM bookings
    WHERE customer_id = $id
    ORDER BY id DESC
");


?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài khoản của tôi | Vệ Sinh Care</title>
    <link rel="stylesheet" href="../css/dashboard_customer.css">
</head>
<body class="customer-page">

<div class="customer-layout">

    <!-- ===== Sidebar ===== -->
    <aside class="customer-sidebar">
    <h2>👤 <?= htmlspecialchars($customer['name']) ?></h2>

    <a href="customer_dashboard.php" class="active">📋 Đơn của tôi</a>
    <a href="index.php">🏠 Trang chủ</a>
    <a href="logout.php">🚪 Đăng xuất</a>
</aside>

    <!-- ===== Main ===== -->
    <main class="customer-main">
        <h1>📋 Đơn dịch vụ của bạn</h1>

        <?php if ($result->num_rows == 0): ?>
            <p class="empty">Bạn chưa có đơn nào.</p>
        <?php else: ?>
        <table class="order-table">
            <tr>
                <th>Dịch vụ</th>
                <th>Ngày làm</th>
                <th>Trạng thái</th>
                <th>Ngày đặt</th>
            </tr>

            <?php while ($row = $result->fetch_assoc()): ?>
            <tr>
                <td><?= htmlspecialchars($row['service_type']) ?></td>
                <td><?= $row['booking_date'] ?></td>
                <td class="status <?= $row['status'] ?>">
                    <?= strtoupper($row['status']) ?>
                </td>
                <td><?= date("d/m/Y", strtotime($row['created_at'])) ?></td>
            </tr>
            <?php endwhile; ?>
        </table>
        <?php endif; ?>
    </main>

</div>

</body>
</html>
