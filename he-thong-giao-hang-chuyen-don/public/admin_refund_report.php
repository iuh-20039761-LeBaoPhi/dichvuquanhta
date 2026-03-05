<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// 1. Security check for admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../index.html");
    exit;
}

// 2. Filtering logic
$date_from = $_GET['date_from'] ?? '';
$date_to = $_GET['date_to'] ?? '';

// 3. Build SQL query
$sql = "SELECT o.*, u.fullname as customer_name 
        FROM orders o 
        LEFT JOIN users u ON o.user_id = u.id 
        WHERE o.payment_status = 'refunded'";

$params = [];
$types = "";

if (!empty($date_from) && !empty($date_to)) {
    $sql .= " AND DATE(o.created_at) BETWEEN ? AND ?";
    $params[] = $date_from;
    $params[] = $date_to;
    $types .= "ss";
}

$sql .= " ORDER BY o.created_at DESC";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$refunded_orders = [];
$total_refunded_amount = 0;
while ($row = $result->fetch_assoc()) {
    $refunded_orders[] = $row;
    // The refunded amount is typically the shipping fee if paid by bank transfer.
    // For simplicity, we sum the shipping fee as a reference for accountants.
    $total_refunded_amount += $row['shipping_fee'];
}
$stmt->close();

// 4. Export to CSV
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=bao_cao_hoan_tien_' . date('Y-m-d') . '.csv');
    $output = fopen('php://output', 'w');

    // Add BOM to fix UTF-8 in Excel
    fputs($output, $bom = (chr(0xEF) . chr(0xBB) . chr(0xBF)));

    // Header
    fputcsv($output, ['Mã đơn', 'Ngày tạo', 'Khách hàng', 'Phí ship', 'Thu hộ (COD)', 'Lý do/Ghi chú hoàn tiền']);

    // Data
    foreach ($refunded_orders as $order) {
        fputcsv($output, [
            $order['order_code'],
            date('d/m/Y H:i', strtotime($order['created_at'])),
            $order['customer_name'] ?? $order['name'],
            $order['shipping_fee'],
            $order['cod_amount'],
            $order['admin_note']
        ]);
    }
    fclose($output);
    exit;
}

?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Báo cáo Đơn hàng Hoàn tiền | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Báo cáo Đơn hàng đã Hoàn tiền</h2>
            <a href="admin_stats.php" class="back-link">← Quay lại Thống kê</a>
        </div>

        <!-- Filter Form -->
        <form method="GET" class="filter-bar" style="background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            <label for="date_from">Từ ngày:</label>
            <input type="date" name="date_from" id="date_from" value="<?php echo htmlspecialchars($date_from); ?>">
            <label for="date_to">Đến ngày:</label>
            <input type="date" name="date_to" id="date_to" value="<?php echo htmlspecialchars($date_to); ?>">
            <button type="submit" class="btn-filter">Lọc</button>
            <a href="admin_refund_report.php" class="btn-reset">Reset</a>
            <a href="?<?php echo http_build_query(array_merge($_GET, ['export' => 'csv'])); ?>" class="btn-primary"
                style="margin-left: auto; text-decoration: none;">
                📥 Xuất CSV
            </a>
        </form>

        <!-- Summary -->
        <div
            style="background: #e9ecef; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between;">
            <div><strong>Tổng số đơn hoàn tiền:</strong>
                <?php echo count($refunded_orders); ?>
            </div>
            <div><strong>Tổng phí ship (tham khảo):</strong> <span style="color:#d9534f; font-weight:bold;">
                    <?php echo number_format($total_refunded_amount); ?>đ
                </span></div>
        </div>

        <!-- Table -->
        <div class="table-section">
            <table class="order-table">
                <thead>
                    <tr>
                        <th>Mã đơn</th>
                        <th>Ngày tạo</th>
                        <th>Khách hàng</th>
                        <th>Phí ship</th>
                        <th>Thu hộ (COD)</th>
                        <th>Lý do/Ghi chú hoàn tiền</th>
                        <th>Chi tiết</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($refunded_orders)): ?>
                        <tr>
                            <td colspan="7" style="text-align:center; padding: 20px;">Không có đơn hàng hoàn tiền nào.</td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($refunded_orders as $order): ?>
                            <tr>
                                <td><strong>
                                        <?php echo htmlspecialchars($order['order_code']); ?>
                                    </strong></td>
                                <td>
                                    <?php echo date('d/m/Y H:i', strtotime($order['created_at'])); ?>
                                </td>
                                <td>
                                    <?php echo htmlspecialchars($order['customer_name'] ?? $order['name']); ?>
                                </td>
                                <td style="color:#d9534f;">
                                    <?php echo number_format($order['shipping_fee']); ?>đ
                                </td>
                                <td>
                                    <?php echo number_format($order['cod_amount']); ?>đ
                                </td>
                                <td style="max-width: 300px; white-space: pre-wrap;">
                                    <?php echo htmlspecialchars($order['admin_note']); ?>
                                </td>
                                <td>
                                    <a href="order_detail.php?id=<?php echo $order['id']; ?>" class="btn-action">Xem</a>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>