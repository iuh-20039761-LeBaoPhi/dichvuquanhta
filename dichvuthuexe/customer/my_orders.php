<?php
session_start();
require_once "../main/db.php";

if (!isset($_SESSION['customer_id'])) {
    header("Location: login.php");
    exit;
}

$cid = $_SESSION['customer_id'];

$result = $conn->query("
    SELECT * FROM driver_orders
    WHERE customer_id = $cid
    ORDER BY created_at DESC
");
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đơn của tôi</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="assets/customer.css">
    <link rel="stylesheet" href="assets/layout.css">
</head>
<body>

<?php include "../partials/header.php"; ?>

<div class="customer-layout">

    <?php include "partials/customer_sidebar.php"; ?>

    <main class="customer-content">
        <h2 class="section-title">📋 Đơn của tôi</h2>

        <table class="order-table">
            <tr>
                <th>Thời gian</th>
                <th>Điểm đón → đến</th>
                <th>Trạng thái</th>
                <th>Giá</th>
            </tr>

            <?php while ($o = $result->fetch_assoc()) { ?>
            <tr>
                <td><?= $o['pickup_time'] ?></td>
                <td><?= $o['pickup_location'] ?> → <?= $o['destination'] ?></td>
                <td>
                    <span class="status <?= $o['status'] ?>">
                        <?= $o['status'] ?>
                    </span>
                </td>
                <td><?= number_format($o['total_price']) ?> đ</td>
            </tr>
            <?php } ?>
        </table>
    </main>

</div>


<?php include "../partials/footer.php"; ?>

</body>
</html>
