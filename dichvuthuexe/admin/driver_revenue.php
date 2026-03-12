<?php
require_once "../main/db.php";
require_once "auth.php";

$result = $conn->query("
    SELECT 
        drivers.name AS driver_name,
        COUNT(driver_orders.id) AS total_orders,
        SUM(driver_orders.total_price) AS total_revenue
    FROM driver_orders
    JOIN drivers 
        ON driver_orders.completed_driver_id = drivers.id
    WHERE driver_orders.status = 'done'
    GROUP BY driver_orders.completed_driver_id
");

?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Doanh thu theo tài xế</title>
      <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="../assets/admin.css">
    <link rel="stylesheet" href="../assets/sidebar.css">
</head>
<body>

<?php include "sidebar.php"; ?>

<div class="main-content">
    <h2>🚖 Doanh thu theo tài xế</h2>

    <table>
        <tr>
            <th>Tài xế</th>
            <th>Số đơn</th>
            <th>Doanh thu</th>
        </tr>

        <?php while ($row = $result->fetch_assoc()) { ?>
        <tr>
            <td><?= $row['driver_name'] ?></td>
            <td><?= $row['total_orders'] ?></td>
            <td><?= number_format($row['total_revenue']) ?> đ</td>
        </tr>
        <?php } ?>
    </table>
</div>

</body>
</html>
