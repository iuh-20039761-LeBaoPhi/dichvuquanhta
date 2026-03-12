<?php
session_start();
require_once "../main/db.php";

if (!isset($_SESSION['customer_id'])) {
    header("Location: /dichvuthuexe/main/login.php");
    exit;
}

$cid = $_SESSION['customer_id'];

// Tổng đơn
$totalOrders = $conn->query("
    SELECT COUNT(*) total FROM driver_orders 
    WHERE customer_id = $cid
")->fetch_assoc()['total'];

// Đơn đang xử lý
$activeOrders = $conn->query("
    SELECT COUNT(*) total FROM driver_orders 
    WHERE customer_id = $cid AND status != 'Hoàn thành'
")->fetch_assoc()['total'];

// Tổng tiền
$totalSpent = $conn->query("
    SELECT SUM(total_price) total FROM driver_orders 
    WHERE customer_id = $cid AND status = 'Hoàn thành'
")->fetch_assoc()['total'] ?? 0;

// Danh sách đơn
$orders = $conn->query("
    SELECT * FROM driver_orders
    WHERE customer_id = $cid
    ORDER BY created_at DESC
");
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Dashboard khách hàng</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="assets/customer.css">
    <link rel="stylesheet" href="assets/layout.css">
</head>
<body>

<?php include "../partials/header.php"; ?>

<div class="customer-layout">

    <?php include "partials/customer_sidebar.php"; ?>

    <main class="customer-content">
        <h2 class="section-title">👤 Dashboard của tôi</h2>

        <!-- STATS -->
        <div class="stats">
            ...
        </div>

        <h3 class="sub-title">📋 Đơn gần đây</h3>

        <table class="order-table">
            ...
        </table>
    </main>

</div>

<?php include "../partials/footer.php"; ?>

</body>
</html>
