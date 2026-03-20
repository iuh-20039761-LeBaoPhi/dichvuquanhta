<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// 1. Security check for admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../../index.html");
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
    $total_refunded_amount += $row['shipping_fee'];
}
$stmt->close();

// 4. Export to CSV
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=bao_cao_hoan_tien_' . date('Y-m-d') . '.csv');
    $output = fopen('php://output', 'w');
    fputs($output, $bom = (chr(0xEF) . chr(0xBB) . chr(0xBF)));
    fputcsv($output, ['Mã đơn', 'Ngày tạo', 'Khách hàng', 'Phí ship', 'Thu hộ (COD)', 'Lý do/Ghi chú hoàn tiền']);
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
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Báo cáo Hoàn tiền</h2>
            <div style="display: flex; gap: 10px;">
                <a href="?<?php echo http_build_query(array_merge($_GET, ['export' => 'csv'])); ?>" class="btn-primary" style="background: #10b981; border: none;">
                    <i class="fa-solid fa-file-export"></i> Xuất Excel (CSV)
                </a>
                <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
            </div>
        </div>

        <div class="stats-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="stat-card" style="border-right: 4px solid #0a2a66;">
                <h3 style="font-size: 14px; color: #64748b;">Tổng số đơn hoàn</h3>
                <p class="stat-value" style="font-size: 32px;"><?php echo count($refunded_orders); ?></p>
            </div>
            <div class="stat-card" style="border-right: 4px solid #ef4444;">
                <h3 style="font-size: 14px; color: #64748b;">Tổng giá trị hoàn phí</h3>
                <p class="stat-value" style="font-size: 32px; color: #ef4444;"><?php echo number_format($total_refunded_amount); ?>đ</p>
            </div>
        </div>

        <div class="admin-card" style="margin-top: 25px;">
            <div class="admin-card-header">
                <h3><i class="fa-solid fa-filter"></i> Lọc theo thời gian</h3>
            </div>
            <form method="GET" class="form-grid" style="grid-template-columns: 1fr 1fr 1fr 1fr; align-items: flex-end;">
                <div class="form-group">
                    <label>Từ ngày</label>
                    <input type="date" name="date_from" value="<?php echo htmlspecialchars($date_from); ?>" class="admin-input">
                </div>
                <div class="form-group">
                    <label>Đến ngày</label>
                    <input type="date" name="date_to" value="<?php echo htmlspecialchars($date_to); ?>" class="admin-input">
                </div>
                <button type="submit" class="btn-primary" style="justify-content: center;"><i class="fa-solid fa-magnifying-glass"></i> Lọc báo cáo</button>
                <a href="admin_refund_report.php" class="btn-secondary" style="justify-content: center;"><i class="fa-solid fa-rotate-left"></i> Làm mới</a>
            </form>
        </div>

        <div class="admin-card" style="margin-top: 30px; padding: 0;">
            <div class="table-responsive">
                <table class="order-table">
                    <thead>
                        <tr>
                            <th>Mã đơn</th>
                            <th>Ngày hoàn</th>
                            <th>Khách hàng</th>
                            <th>Giá trị hoàn</th>
                            <th>Ghi chú nội bộ</th>
                            <th style="text-align: right;">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if (empty($refunded_orders)): ?>
                            <tr><td colspan="6" style="text-align:center; padding: 60px; color: #64748b;">Không có dữ liệu hoàn tiền trong khoảng thời gian này.</td></tr>
                        <?php else: ?>
                            <?php foreach ($refunded_orders as $order): ?>
                                <tr>
                                    <td style="font-weight: 700; color: #0a2a66;">#<?php echo htmlspecialchars($order['order_code']); ?></td>
                                    <td style="font-size: 13px; color: #64748b;"><?php echo date('d/m/Y H:i', strtotime($order['created_at'])); ?></td>
                                    <td>
                                        <div style="font-weight: 600;"><?php echo htmlspecialchars($order['customer_name'] ?? $order['name']); ?></div>
                                        <div style="font-size: 11px; color: #94a3b8;">ID KH: #<?php echo $order['user_id'] ?: 'N/A'; ?></div>
                                    </td>
                                    <td style="color: #ef4444; font-weight: 700;"><?php echo number_format($order['shipping_fee']); ?>đ</td>
                                    <td style="font-size: 13px; color: #475569; font-style: italic; max-width: 250px;"><?php echo htmlspecialchars($order['admin_note'] ?: '(Không có ghi chú)'); ?></td>
                                    <td style="text-align: right;">
                                        <a href="order_detail.php?id=<?php echo $order['id']; ?>" class="btn-sm" style="color: #0a2a66; background: rgba(10,42,102,0.05); border-radius: 6px; padding: 5px 12px; text-decoration: none;">Chi tiết</a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </main>
    <?php include __DIR__ . '/../../includes/footer.php'; ?>
</body>
</html>

