<?php
require_once "../main/db.php";  
require_once "auth.php";

$result = $conn->query("
    SELECT 
        driver_orders.*,
        drivers.name AS driver_name
    FROM driver_orders
    LEFT JOIN drivers ON driver_orders.driver_id = drivers.id
    ORDER BY driver_orders.created_at DESC
");

?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Admin - Đơn thuê tài xế</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="../assets/admin.css">
    <link rel="stylesheet" href="../assets/sidebar.css">

</head>
<body>

<?php include "sidebar.php"; ?>

<div class="main-content">


<section>
    <h2 class="section-title">Danh sách đơn đặt tài xế</h2>

   <table>
<tr>
    <th>ID</th>
    <th>Khách</th>
    <th>SĐT</th>
    <th>Loại xe</th>
    <th>Đón → Đến</th>
    <th>Thời gian</th>
    <th>Trạng thái</th>
    <th>Hành động</th>
</tr>

<?php while ($row = $result->fetch_assoc()) { ?>
<tr>
    <td><?= $row['id'] ?></td>
    <td><?= $row['customer_name'] ?></td>
    <td><?= $row['phone'] ?></td>
    <td><?= $row['vehicle_type'] ?></td>
    <td>
        <?= $row['pickup_location'] ?><br>
        → <?= $row['destination'] ?>
    </td>
    <td><?= $row['pickup_time'] ?></td>
    <td><?= $row['status'] ?></td>

    <td>
        <?php if ($row['driver_id'] == NULL) { ?>

            <!-- CHƯA CÓ TÀI XẾ -->
            <form action="assign_driver.php" method="POST">
                <input type="hidden" name="order_id" value="<?= $row['id'] ?>">

                <select name="driver_id" required>
                    <option value="">Chọn tài xế</option>
                    <?php
                    $drivers = $conn->query("SELECT * FROM drivers WHERE status='free'");
                    while ($d = $drivers->fetch_assoc()) {
                        echo "<option value='{$d['id']}'>{$d['name']}</option>";
                    }
                    ?>
                </select>

                <button type="submit">Gán</button>
            </form>

        <?php } else { ?>

            <!-- ĐÃ CÓ TÀI XẾ -->
            <div style="color:green;font-weight:bold;">
                ✔ <?= $row['driver_name'] ?>
            </div>

            <form action="change_driver.php" method="POST" style="margin-top:5px">
                <input type="hidden" name="order_id" value="<?= $row['id'] ?>">
                <input type="hidden" name="old_driver_id" value="<?= $row['driver_id'] ?>">
                <button type="submit">🔁 Đổi tài xế</button>
            </form>

                <?php } ?>

        <!-- NÚT TRẠNG THÁI -->
        <div style="margin-top:6px">
            <a href="update.php?id=<?= $row['id'] ?>&s=done">✔</a>
            <a href="update.php?id=<?= $row['id'] ?>&s=cancel">✖</a>
        </div>

    </td>
</tr>
<?php } ?>
</table>

        
</section>

</body>
</html>
