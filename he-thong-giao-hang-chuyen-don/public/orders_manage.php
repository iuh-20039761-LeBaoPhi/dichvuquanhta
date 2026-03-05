<?php
session_start();
require_once __DIR__ . '/../config/db.php';

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
$limit = 10; // Số đơn hàng trên mỗi trang
$offset = ($page - 1) * $limit;
if ($page < 1)
    $page = 1;

// 1. Truy vấn đếm tổng số bản ghi (để tính số trang)
$count_sql = "SELECT COUNT(*) as total FROM orders WHERE 1=1";
$sql = "SELECT * FROM orders WHERE 1=1";
$params = [];
$types = "";

if (!empty($search)) {
    $condition = " AND (order_code LIKE ? OR name LIKE ? OR phone LIKE ?)";
    $sql .= $condition;
    $count_sql .= $condition;
    $searchTerm = "%$search%";
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $params[] = $searchTerm;
    $types .= "sss";
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

// Thực hiện đếm trước
$stmt_count = $conn->prepare($count_sql);
if (!empty($params)) {
    $stmt_count->bind_param($types, ...$params);
}
$stmt_count->execute();
$total_records = $stmt_count->get_result()->fetch_assoc()['total'];
$total_pages = ceil($total_records / $limit);
$stmt_count->close();

// 2. Truy vấn lấy dữ liệu phân trang
$sql .= " ORDER BY id DESC";
$sql .= " LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý đơn hàng | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin-pages.css?v=<?php echo time(); ?>">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý đơn hàng</h2>
            <a href="dashboard.php" class="back-link">← Quay lại Dashboard</a>
        </div>

        <!-- Thống kê -->
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-icon">📦</div>
                <h3>Tổng đơn hàng</h3>
                <p class="stat-value"><?php echo number_format($total_orders); ?></p>
            </div>
            <div class="stat-card pending">
                <div class="stat-icon">⏳</div>
                <h3>Chờ xử lý</h3>
                <p class="stat-value"><?php echo number_format($stats['pending']); ?></p>
            </div>
            <div class="stat-card shipping">
                <div class="stat-icon">🚚</div>
                <h3>Đang giao</h3>
                <p class="stat-value"><?php echo number_format($stats['shipping']); ?></p>
            </div>
            <div class="stat-card completed">
                <div class="stat-icon">✅</div>
                <h3>Hoàn tất</h3>
                <p class="stat-value"><?php echo number_format($stats['completed']); ?></p>
            </div>
            <div class="stat-card cancelled">
                <div class="stat-icon">❌</div>
                <h3>Đã hủy</h3>
                <p class="stat-value"><?php echo number_format($stats['cancelled']); ?></p>
            </div>
        </div>

        <!-- Layout chính: Bảng (Trái) - Bộ lọc (Phải) -->
        <div class="dashboard-layout">
            <!-- Cột trái: Bảng dữ liệu -->
            <div class="table-section">
                <table class="order-table">
                    <thead>
                        <tr>
                            <th>Mã đơn</th>
                            <th>Người gửi / Người nhận</th>
                            <th>SĐT</th>
                            <th>Dịch vụ</th>
                            <th>Loại dịch vụ</th>
                            <th>Phí ship</th>
                            <th>Thu hộ (COD)</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php if ($result->num_rows > 0): ?>
                        <?php while ($row = $result->fetch_assoc()): ?>
                        <tr <?php echo ($row['status'] === 'cancelled') ? 'style="background-color: #ffe6e6;"' : ''; ?>>
                            <td><strong
                                    style="color:#0a2a66;"><?php echo htmlspecialchars($row['order_code']); ?></strong>
                                <?php if (!empty($row['admin_note'])): ?>
                                <div style="margin-top:4px;"><span
                                        style="background:#fff3cd; color:#856404; padding:2px 5px; border-radius:3px; font-size:11px; border:1px solid #ffeeba;">⚠️
                                        Có Note</span></div>
                                <?php endif; ?>
                            </td>
                            <td>
                                <strong>Gửi:</strong> <?php echo htmlspecialchars($row['name']); ?><br>
                                <strong>Nhận:</strong>
                                <?php echo htmlspecialchars($row['receiver_name'] ?? '---'); ?><br>
                                <span
                                    style="font-size:12px; color:#666;"><?php echo htmlspecialchars($row['pickup_address']); ?></span>
                            </td>
                            <td>
                                Gửi: <?php echo htmlspecialchars($row['phone']); ?><br>
                                Nhận: <?php echo htmlspecialchars($row['receiver_phone'] ?? '---'); ?>
                            </td>
                            <td>
                                <?php
                                        $pkg_map = [
                                            'document' => 'Tài liệu',
                                            'food' => 'Đồ ăn',
                                            'clothes' => 'Quần áo',
                                            'electronic' => 'Điện tử',
                                            'other' => 'Khác'
                                        ];
                                        echo $pkg_map[$row['package_type']] ?? $row['package_type'];
                                        ?>
                            </td>
                            <td>
                                <?php
                                        $svc_map = [
                                            'slow' => 'Chậm',
                                            'standard' => 'Tiêu chuẩn',
                                            'fast' => '<span style="color:#0a7d4f; font-weight:bold;">Nhanh</span>',
                                            'express' => '<span style="color:#d9534f; font-weight:bold;">Hỏa tốc</span>',
                                            'bulk' => '<span style="color:#0a2a66; font-weight:bold;">Số lượng lớn (cũ)</span>'
                                        ];
                                        echo $svc_map[$row['service_type'] ?? 'standard'] ?? ($row['service_type'] ?? 'standard');
                                        ?>
                            </td>
                            <td style="color:#d9534f; font-weight:bold;">
                                <?php echo number_format($row['shipping_fee'] ?? 0); ?>đ
                            </td>
                            <td><?php echo number_format($row['cod_amount']); ?>đ</td>
                            <td>
                                <?php
                                        $st = $row['status'] ?? 'pending';
                                        $class = 'status-' . $st;
                                        $label = match ($st) {
                                            'pending' => 'Chờ xử lý',
                                            'shipping' => 'Đang giao',
                                            'completed' => 'Hoàn tất',
                                            'cancelled' => 'Đã hủy',
                                            default => $st
                                        };
                                        ?>
                                <span class="status-badge <?php echo $class; ?>"><?php echo $label; ?></span>
                            </td>
                            <td><?php echo isset($row['created_at']) ? date('d/m/Y H:i', strtotime($row['created_at'])) : 'N/A'; ?>
                            </td>
                            <td>
                                <a href="order_detail.php?id=<?php echo $row['id']; ?>" class="btn-action">Chi tiết</a>
                                <?php if ($row['status'] !== 'cancelled' && $row['status'] !== 'completed'): ?>
                                <a href="cancel_order.php?id=<?php echo $row['id']; ?>" class="btn-action"
                                    style="color: #d9534f; border-color: #d9534f; margin-left: 5px;"
                                    onclick="return confirm('Bạn chắc chắn muốn hủy đơn này?');">Hủy</a>
                                <?php endif; ?>
                            </td>
                        </tr>
                        <?php endwhile; ?>
                        <?php else: ?>
                        <tr>
                            <td colspan="10" style="text-align:center; padding: 30px;">Không tìm thấy đơn hàng nào phù
                                hợp.</td>
                        </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
                <!-- Phân trang -->
                <?php if ($total_pages > 1): ?>
                <div style="margin-top: 20px; display: flex; justify-content: center; gap: 5px;">
                    <!-- Nút Previous -->
                    <?php if ($page > 1): ?>
                    <a href="?page=<?php echo $page - 1; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo urlencode($status); ?>&issue=<?php echo urlencode($issue); ?>"
                        class="btn-action" style="text-decoration: none;">&laquo; Trước</a>
                    <?php endif; ?>

                    <!-- Các trang số -->
                    <?php for ($i = 1; $i <= $total_pages; $i++): ?>
                    <a href="?page=<?php echo $i; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo urlencode($status); ?>&issue=<?php echo urlencode($issue); ?>"
                        class="btn-action"
                        style="text-decoration: none; <?php echo ($i == $page) ? 'background-color: #0a2a66; color: white;' : ''; ?>">
                        <?php echo $i; ?>
                    </a>
                    <?php endfor; ?>

                    <!-- Nút Next -->
                    <?php if ($page < $total_pages): ?>
                    <a href="?page=<?php echo $page + 1; ?>&search=<?php echo urlencode($search); ?>&status=<?php echo urlencode($status); ?>&issue=<?php echo urlencode($issue); ?>"
                        class="btn-action" style="text-decoration: none;">Sau &raquo;</a>
                    <?php endif; ?>
                </div>
                <p style="text-align: center; margin-top: 10px; font-size: 14px; color: #666;">Hiển thị trang
                    <?php echo $page; ?> / <?php echo $total_pages; ?> (Tổng <?php echo $total_records; ?> đơn)
                </p>
                <?php endif; ?>
            </div>

            <!-- Cột phải: Sidebar bộ lọc -->
            <aside class="filter-sidebar">
                <h3>Bộ lọc tìm kiếm</h3>
                <form class="filter-form" method="GET">
                    <div class="form-group">
                        <label>Từ khóa</label>
                        <input type="text" name="search" placeholder="Mã đơn, Tên, SĐT..."
                            value="<?php echo htmlspecialchars($search); ?>">
                    </div>

                    <div class="form-group">
                        <label>Trạng thái</label>
                        <select name="status">
                            <option value="">-- Tất cả --</option>
                            <option value="pending" <?php if ($status == 'pending')
                                echo 'selected'; ?>>Chờ xử lý</option>
                            <option value="shipping" <?php if ($status == 'shipping')
                                echo 'selected'; ?>>Đang giao
                            </option>
                            <option value="completed" <?php if ($status == 'completed')
                                echo 'selected'; ?>>Hoàn tất
                            </option>
                            <option value="cancelled" <?php if ($status == 'cancelled')
                                echo 'selected'; ?>>Đã hủy
                            </option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Vấn đề / Ghi chú</label>
                        <select name="issue">
                            <option value="">-- Tất cả --</option>
                            <option value="has_admin_note" <?php if ($issue == 'has_admin_note')
                                echo 'selected'; ?>>⚠️
                                Đơn có ghi chú Admin</option>
                        </select>
                    </div>

                    <button type="submit" class="btn-filter">Áp dụng bộ lọc</button>
                    <a href="orders_manage.php" class="btn-reset">Đặt lại</a>
                </form>
            </aside>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>

</html>


