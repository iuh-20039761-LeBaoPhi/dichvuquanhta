<?php
require_once "auth.php";
require_once "../main/db.php";

$result = $conn->query("
    SELECT * FROM bookings
    ORDER BY created_at DESC
");
?>

<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Quản lý đơn hàng</title>
    <link rel="stylesheet" href="layout/admin.css">
    <style>
        .btn {
            padding:6px 12px;
            background:#1abc9c;
            color:#fff;
            text-decoration:none;
            border-radius:4px;
            font-size:13px;
        }
        .btn.disabled {
            background:#ccc;
            pointer-events:none;
        }
        .badge {
            padding:4px 8px;
            border-radius:4px;
            font-size:12px;
            color:#fff;
        }
        .pending { background:#f39c12; }
        .approved { background:#2ecc71; }
        .cancelled { background:#e74c3c; }
    </style>
</head>
<body class="admin-page">

<div class="admin-layout">

    <?php require_once "layout/sidebar.php"; ?>

    <main class="main-content">
        <h1>📋 Quản lý đơn đặt lịch</h1>

        <table>
            <tr>
                <th>ID</th>
                <th>Khách hàng</th>
                <th>SĐT</th>
                <th>Ngày tạo</th>
                <th>Trạng thái</th>
                <th>Hóa đơn</th>
                <th>Thao tác</th>
            </tr>

            <?php if ($result->num_rows > 0): ?>
                <?php while ($row = $result->fetch_assoc()): ?>
                <tr>
                    <td><?= $row['id'] ?></td>
                    <td><?= htmlspecialchars($row['customer_name']) ?></td>
                    <td><?= htmlspecialchars($row['phone']) ?></td>
                    <td><?= $row['created_at'] ?></td>

                    <td>
                        <span class="badge <?= $row['status'] ?>">
                            <?= strtoupper($row['status']) ?>
                        </span>
                    </td>

                    <td>
                        <?= $row['invoice_status'] == 'issued'
                            ? 'Đã xuất'
                            : 'Chưa xuất' ?>
                    </td>

                    <td>
                        <?php if ($row['status'] == 'approved' && $row['invoice_status'] == 'none'): ?>
                            <a class="btn"
                               href="../modules/invoice/create_invoice.php?booking_id=<?= $row['id'] ?>">
                                Xuất hóa đơn
                            </a>

                        <?php elseif ($row['invoice_status'] == 'issued'): ?>
                            <span class="btn disabled">Đã xuất</span>

                        <?php else: ?>
                            <span class="btn disabled">Chưa đủ điều kiện</span>
                        <?php endif; ?>
                    </td>
                </tr>
                <?php endwhile; ?>
            <?php else: ?>
                <tr>
                    <td colspan="7">Chưa có đơn hàng nào</td>
                </tr>
            <?php endif; ?>
        </table>

    </main>

</div>

</body>
</html>
