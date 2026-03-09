<?php
require_once "auth.php";
require_once "../main/db.php";

/*
    FILTER theo MST (mock bằng SĐT)
*/
$tax_code = $_GET['tax_code'] ?? '';

$sql = "
    SELECT * FROM bookings
    WHERE invoice_status = 'issued'
";

$params = [];
if ($tax_code) {
    $sql .= " AND phone LIKE ?";
    $params[] = "%$tax_code%";
}

$sql .= " ORDER BY created_at DESC";

$stmt = $conn->prepare($sql);

if (!empty($params)) {
    $stmt->bind_param("s", ...$params);
}

$stmt->execute();
$result = $stmt->get_result();
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Danh sách hóa đơn</title>
    <link rel="stylesheet" href="layout/admin.css">
    <style>
        .badge {
            padding:4px 8px;
            background:#2ecc71;
            color:#fff;
            border-radius:4px;
            font-size:13px;
        }
        .btn {
            padding:5px 10px;
            background:#3498db;
            color:#fff;
            text-decoration:none;
            border-radius:4px;
            font-size:13px;
        }
        .filter-box {
            margin-bottom:15px;
        }
        .filter-box input {
            padding:6px 10px;
        }
    </style>
</head>
<body class="admin-page">

<div class="admin-layout">

    <?php require_once "layout/sidebar.php"; ?>

    <main class="main-content">
        <h1>📄 Danh sách hóa đơn đã xuất</h1>

        <!-- FILTER -->
        <div class="filter-box">
            <form method="get">
                <input type="text"
                       name="tax_code"
                       placeholder="Nhập SĐT / MST khách hàng"
                       value="<?= htmlspecialchars($tax_code) ?>">
                <button class="btn" type="submit">Lọc</button>
            </form>
        </div>

        <table>
            <tr>
                <th>ID đơn</th>
                <th>Khách hàng</th>
                <th>SĐT (MST mock)</th>
                <th>Ngày đặt</th>
                <th>Trạng thái</th>
                <th>Mã hóa đơn</th>
                <th>Hóa đơn</th>
                <th>Chi tiết</th>
            </tr>

        <?php if ($result->num_rows > 0): ?>
            <?php while ($row = $result->fetch_assoc()): ?>
                <tr>
                    <td><?= $row['id'] ?></td>
                    <td><?= htmlspecialchars($row['customer_name']) ?></td>
                    <td><?= htmlspecialchars($row['phone']) ?></td>
                    <td><?= $row['created_at'] ?></td>
                    <td><?= strtoupper($row['status']) ?></td>
                    <td><?= htmlspecialchars($row['invoice_code']) ?></td>
                    <td><span class="badge">Đã xuất</span></td>
                    <td>
                        <a class="btn"
                           href="invoice_detail.php?id=<?= $row['id'] ?>">
                           Xem
                        </a>
                    </td>
                </tr>
            <?php endwhile; ?>
        <?php else: ?>
            <tr>
                <td colspan="8">Chưa có hóa đơn nào</td>
            </tr>
        <?php endif; ?>

        </table>

        <br>
        <a href="bookings.php">← Quay lại quản lý đơn hàng</a>
    </main>

</div>

</body>
</html>
