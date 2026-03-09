<?php
require_once "auth.php";
require_once "../main/db.php";

$result = $conn->query("SELECT * FROM bookings ORDER BY id DESC");
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Quản lý đơn</title>
    <link rel="stylesheet" href="../admin/layout/orders.css">
</head>
<body class="admin-page">

<div class="admin-layout">
   <?php require_once "../admin/layout/sidebar.php"; ?>


    <main class="main-content">
        <h1>Danh sách đơn hàng</h1>

        <table>
    <tr>
        <th>ID</th>
        <th>Khách</th>
        <th>SĐT</th>
        <th>Dịch vụ</th>
        <th>Diện tích</th>
        <th>Phòng</th>
        <th>Cấp độ</th>
        <th>Giá dự kiến</th>
        <th>Ngày</th>
        <th>Ghi chú</th>
        <th>Nhà cung cấp</th>
        <th>Người thực hiện</th>
        <th>Trạng thái</th>
        <th>Hành động</th>
    </tr>

    <?php while ($row = $result->fetch_assoc()): ?>
    <tr>
        <td><?= $row['id'] ?></td>

        <td><?= htmlspecialchars($row['customer_name']) ?></td>

        <td><?= htmlspecialchars($row['phone']) ?></td>

        <td><?= htmlspecialchars($row['service_type']) ?></td>

        <td><?= $row['area'] ?> m²</td>
        <td><?= $row['rooms'] ?></td>
        <td><?= $row['cleaning_level'] ?></td>
        
<?php
$price_per_m2 = 6000;

if ($row['cleaning_level'] == "Tổng vệ sinh") {
    $price_per_m2 = 9000;
}

$price = $row['area'] * $price_per_m2;
?>
<td><?= number_format($price) ?> đ</td>

        <td><?= $row['booking_date'] ?></td>

        <td style="max-width:250px; text-align:left;">
            <?= nl2br(htmlspecialchars($row['note'])) ?>
        </td>
        <td><?= $row['supplier_name'] ?? '-' ?></td>

        <td><?= $row['executor'] ?? '-' ?></td>
        <td class="<?= $row['status'] ?>">
            <?= strtoupper($row['status']) ?>
        </td>

        <td>
            <a class="btn detail"
   href="order_detail.php?id=<?= $row['id'] ?>">
   🔍 Chi tiết
</a>
            <?php if ($row['status'] == 'pending'): ?>
                <a class="btn approve"
                   href="order_action.php?id=<?= $row['id'] ?>&action=approve">
                   ✔ Duyệt
                </a>

                <a class="btn cancel"
                   href="order_action.php?id=<?= $row['id'] ?>&action=cancel"
                   onclick="return confirm('Huỷ đơn này?')">
                   ✖ Huỷ
                </a>
            <?php else: ?>
                —
            <?php endif; ?>
        </td>
    </tr>
    <?php endwhile; ?>
</table>

    </main>
</div>

</body>
</html>
