<?php
require_once "auth.php";
require_once "../main/db.php";

$totalOrders = $conn->query("
    SELECT COUNT(*) total 
    FROM driver_orders
")->fetch_assoc()['total'];

$doneOrders = $conn->query("
    SELECT COUNT(*) total 
    FROM driver_orders 
    WHERE status='done'
")->fetch_assoc()['total'];

$revenue = $conn->query("
    SELECT SUM(total_price) AS total
    FROM driver_orders
    WHERE status='done'
")->fetch_assoc()['total'] ?? 0;
?>
<!DOCTYPE html>
<html>
<head>
    <title>Thống kê</title>
    <link rel="stylesheet" href="../assets/admin.css">
    <link rel="stylesheet" href="../assets/sidebar.css">
</head>
<body>

<?php include "sidebar.php"; ?>

<div class="main-content">
    <h2>📊 Thống kê hệ thống</h2>

    <div class="stats">
        <div class="card">
            Tổng đơn<br><b><?= $totalOrders ?></b>
        </div>

        <div class="card">
            Hoàn thành<br><b><?= $doneOrders ?></b>
        </div>

        <div class="card">
            Doanh thu<br>
            <b><?= number_format($revenue) ?> đ</b>
        </div>
    </div>
</div>

</body>
</html>
