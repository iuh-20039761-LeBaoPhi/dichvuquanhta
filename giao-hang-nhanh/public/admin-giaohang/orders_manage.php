<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

// --- THỐNG KÊ ĐƠN HÀNG ---
$stats = ['pending' => 0, 'shipping' => 0, 'completed' => 0, 'cancelled' => 0];
$total_orders = 0;

$stat_sql = "SELECT status, COUNT(*) as count FROM orders GROUP BY status";
$stat_result = $conn->query($stat_sql);
if ($stat_result) {
    while ($row = $stat_result->fetch_assoc()) {
        $st = $row['status'] ? $row['status'] : 'pending';
        if (isset($stats[$st]))
            $stats[$st] = $row['count'];
        $total_orders += $row['count'];
    }
}

// Xử lý tìm kiếm & lọc
$search = $_GET['search'] ?? '';
$status = $_GET['status'] ?? '';
$issue = $_GET['issue'] ?? '';
$page = isset($_GET['page']) ? (int) $_GET['page'] : 1;
$limit = 10;
$offset = ($page - 1) * $limit;
if ($page < 1) $page = 1;

// 1. Truy vấn đếm
$count_sql = "SELECT COUNT(*) as total FROM orders WHERE 1=1";
$sql = "SELECT * FROM orders WHERE 1=1";
$params = [];
$types = "";

if (!empty($search)) {
    $condition = " AND (order_code LIKE ? OR client_order_code LIKE ? OR name LIKE ? OR phone LIKE ?)";
    $sql .= $condition;
    $count_sql .= $condition;
    $searchTerm = "%$search%";
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= "ssss";
}

if (!empty($status)) {
    $condition = " AND status = ?";
    $sql .= $condition;
    $count_sql .= $condition;
    $params[] = $status;
    $types .= "s";
}

if ($issue === 'has_admin_note') {
    $condition = " AND (admin_note IS NOT NULL AND admin_note != '')";
    $sql .= $condition;
    $count_sql .= $condition;
}

$stmt_count = $conn->prepare($count_sql);
if (!empty($params)) {
    $stmt_count->bind_param($types, ...$params);
}
$stmt_count->execute();
$total_records = $stmt_count->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_records / $limit);
$stmt_count->close();

// 2. Lấy dữ liệu
$sql .= " ORDER BY id DESC LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$pkg_map = ['document' => 'Tài liệu', 'food' => 'Đồ ăn', 'clothes' => 'Quần áo', 'electronic' => 'Điện tử', 'other' => 'Khác'];
$svc_map = ['slow' => 'Chậm', 'standard' => 'Tiêu chuẩn', 'fast' => 'Nhanh', 'express' => 'Hỏa tốc', 'instant' => 'Ngay lập tức'];
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Quản lý đơn hàng | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>
<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>
    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý đơn hàng</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <div class="stats-grid">
            <div class="stat-card total">
                <i class="fa-solid fa-boxes-stacked stat-icon"></i>
                <h3>Tổng đơn</h3>
                <p class="stat-value"><?php echo number_format($total_orders); ?></p>
            </div>
            <div class="stat-card pending">
                <i class="fa-solid fa-clock stat-icon"></i>
                <h3>Chờ xử lý</h3>
                <p class="stat-value"><?php echo number_format($stats['pending']); ?></p>
            </div>
            <div class="stat-card shipping">
                <i class="fa-solid fa-truck-fast stat-icon"></i>
                <h3>Đang giao</h3>
                <p class="stat-value"><?php echo number_format($stats['shipping']); ?></p>
            </div>
            <div class="stat-card completed">
                <i class="fa-solid fa-circle-check stat-icon"></i>
                <h3>Hoàn tất</h3>
                <p class="stat-value"><?php echo number_format($stats['completed']); ?></p>
            </div>
            <div class="stat-card cancelled">
                <i class="fa-solid fa-circle-xmark stat-icon"></i>
                <h3>Đã hủy</h3>
                <p class="stat-value"><?php echo number_format($stats['cancelled']); ?></p>
            </div>
        </div>

        <div class="dashboard-layout">
            <div class="table-section admin-card" style="padding: 0; overflow: hidden;">
                <div class="table-responsive">
                    <table class="order-table">
                        <thead>
                            <tr>
                                <th>Mã đơn / KH</th>
                                <th>Người gửi / Nhận</th>
                                <th>Lịch / Dịch vụ</th>
                                <th>Thanh toán</th>
                                <th>Trạng thái</th>
                                <th style="text-align: right;">Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($result->num_rows > 0): ?>
                                <?php while ($row = $result->fetch_assoc()): ?>
                                <tr>
                                    <td data-label="Mã đơn / KH">
                                        <div style="font-weight: 700; color: #0a2a66;">#<?php echo $row['order_code']; ?></div>
                                        <?php if ($row['client_order_code']): ?>
                                            <div style="font-size:11px; color:#28a745; font-weight: 600;">Ref: <?php echo htmlspecialchars($row['client_order_code']); ?></div>
                                        <?php endif; ?>
                                    </td>
                                    <td data-label="Người gửi / Nhận">
                                        <div style="font-size:13px; margin-bottom: 4px;">
                                            <i class="fa-solid fa-arrow-up-from-bracket" style="width:16px; color:#64748b;"></i> <?php echo htmlspecialchars($row['name']); ?>
                                        </div>
                                        <div style="font-size:13px;">
                                            <i class="fa-solid fa-arrow-down-to-bracket" style="width:16px; color:#ff7a00;"></i> <?php echo htmlspecialchars($row['receiver_name']); ?>
                                        </div>
                                    </td>
                                    <td data-label="Lịch / Dịch vụ">
                                        <div style="font-size:12px; color: #64748b;">
                                            <i class="fa-regular fa-calendar-alt" style="width:16px;"></i> <?php echo $row['pickup_time'] ? date('d/m/Y', strtotime($row['pickup_time'])) : 'N/A'; ?>
                                        </div>
                                        <div style="font-size:12px; font-weight:bold; color:#ff7a00; margin-top:2px;">
                                            <i class="fa-solid fa-bolt" style="width:16px;"></i> <?php echo $svc_map[$row['service_type']] ?? $row['service_type']; ?>
                                        </div>
                                    </td>
                                    <td data-label="Thanh toán">
                                        <div style="font-size:13px; font-weight: 700; color: #0a2a66; margin-bottom: 4px;"><?php echo number_format($row['shipping_fee']); ?>đ</div>
                                        <span class="status-badge" style="font-size: 10px; padding: 2px 8px; <?php echo ($row['payment_status'] == 'paid') ? 'background: #e8f5e9; color: #2e7d32; border: 1px solid #c8e6c9;' : 'background: #fff3e0; color: #e65100; border: 1px solid #ffe0b2;'; ?>">
                                            <?php echo ($row['payment_status'] == 'paid') ? 'Đã trả' : 'Chưa trả'; ?>
                                        </span>
                                    </td>
                                    <td data-label="Trạng thái">
                                        <span class="status-badge status-<?php echo $row['status']; ?>">
                                            <?php 
                                            $st_labels = ['pending' => 'Chờ lấy','shipping' => 'Đang giao','completed' => 'Hoàn tất','cancelled' => 'Đã hủy'];
                                            echo $st_labels[$row['status']] ?? $row['status']; 
                                            ?>
                                        </span>
                                    </td>
                                    <td style="text-align: right;" data-label="Hành động">
                                        <a href="order_detail.php?id=<?php echo $row['id']; ?>" class="btn-sm btn-view-site-pill" style="background: rgba(10, 42, 102, 0.05); color: #0a2a66; display: inline-flex; align-items: center; gap: 5px; width: 100%; justify-content: center;">
                                            <i class="fa-solid fa-eye"></i> Xem chi tiết
                                        </a>
                                    </td>
                                </tr>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 40px; color: #64748b;">Không có đơn hàng nào khớp với bộ lọc.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
                
                <?php if ($total_pages > 1): ?>
                <div style="padding: 20px; border-top: 1px solid #edf2f7; display: flex; justify-content: center; gap: 10px;">
                    <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                        <a href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo urlencode($status); ?>" 
                           style="width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; border-radius: 8px; text-decoration: none; font-weight: 600; <?php echo $i == $page ? 'background:#0a2a66; color:#fff;' : 'background:#f1f5f9; color:#64748b;'; ?>">
                           <?php echo $i; ?>
                        </a>
                    <?php endfor; ?>
                </div>
                <?php endif; ?>
            </div>

            <aside>
                <div class="admin-card" style="position: sticky; top: 100px;">
                    <h3 style="font-size: 16px; margin-bottom: 20px; color: #0a2a66; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-filter"></i> Bộ lọc nâng cao
                    </h3>
                    <form method="GET" class="form-grid" style="grid-template-columns: 1fr;">
                        <div class="form-group">
                            <label>Tìm kiếm</label>
                            <input type="text" name="search" placeholder="Mã đơn, tên, SĐT..." value="<?php echo htmlspecialchars($search); ?>" class="admin-input">
                        </div>
                        <div class="form-group">
                            <label>Trạng thái</label>
                            <select name="status" class="admin-select">
                                <option value="">-- Tất cả --</option>
                                <option value="pending" <?php echo $status=='pending'?'selected':''; ?>>Chờ xử lý</option>
                                <option value="shipping" <?php echo $status=='shipping'?'selected':''; ?>>Đang giao</option>
                                <option value="completed" <?php echo $status=='completed'?'selected':''; ?>>Hoàn tất</option>
                                <option value="cancelled" <?php echo $status=='cancelled'?'selected':''; ?>>Đã hủy</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Vấn đề khác</label>
                            <select name="issue" class="admin-select">
                                <option value="">-- Tất cả --</option>
                                <option value="has_admin_note" <?php echo $issue=='has_admin_note'?'selected':''; ?>>Có ghi chú Admin</option>
                            </select>
                        </div>
                        <div style="display: grid; gap: 10px; margin-top: 10px;">
                            <button type="submit" class="btn-primary" style="justify-content: center;">
                                <i class="fa-solid fa-magnifying-glass"></i> Áp dụng lọc
                            </button>
                            <a href="orders_manage.php" class="btn-secondary" style="justify-content: center;">
                                <i class="fa-solid fa-rotate-left"></i> Xóa bộ lọc
                            </a>
                        </div>
                    </form>
                </div>
            </aside>
        </div>
    </main>
    <?php include __DIR__ . '/../../includes/footer.php'; ?>
</body>
</html>

