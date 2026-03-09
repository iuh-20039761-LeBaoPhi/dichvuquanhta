<?php

require_once "auth.php";

$conn = new mysqli("localhost", "root", "", "cleaning_service");
if ($conn->connect_error) die("DB error");

$result = $conn->query("SELECT * FROM bookings ORDER BY created_at DESC");
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Admin - Quản lý đơn hàng</title>
    <link rel="stylesheet" href="../admin/layout/admin.css">
</head>
<body>

<h2>📋 Quản lý đơn hàng</h2>

<table>
    <tr>
        <th>ID</th>
        <th>Khách hàng</th>
        <th>SĐT</th>
        <th>Dịch vụ</th>
        <th>Ngày</th>
        <th>Ghi chú</th>
        <th>Trạng thái</th>
        <th>Hành động</th>
    </tr>

    <?php while ($row = $result->fetch_assoc()): ?>
    <tr>
        <td><?= $row['id'] ?></td>
        <td><?= htmlspecialchars($row['customer_name']) ?></td>
        <td><?= $row['phone'] ?></td>
        <td><?= $row['service_type'] ?></td>
        <td><?= $row['booking_date'] ?></td>
        <td><?= nl2br(htmlspecialchars($row['note'])) ?></td>

        <td class="<?= $row['status'] ?>">
            <?= $row['status'] ?>
        </td>

        <td>
            <?php if ($row['status'] == 'pending'): ?>
                <a class="btn approve"
                   href="update_status.php?id=<?= $row['id'] ?>&status=approved">
                   ✔ Duyệt
                </a>

                <a class="btn cancel"
                   href="update_status.php?id=<?= $row['id'] ?>&status=cancelled"
                   onclick="return confirm('Hủy đơn này?')">
                   ✖ Hủy
                </a>
            <?php else: ?>
                —
            <?php endif; ?>
        </td>
    </tr>
    <?php endwhile; ?>

</table>

</body>
</html>


