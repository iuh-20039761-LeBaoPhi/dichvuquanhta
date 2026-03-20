<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: ../../index.html");
    exit;
}

// --- 1. THỐNG KÊ TỔNG QUAN (KPI) ---
$kpi = [
    'revenue' => 0,
    'total_orders' => 0,
    'total_users' => 0,
    'completed_rate' => 0
];

// Tổng doanh thu (chỉ tính đơn hoàn tất)
$res = $conn->query("SELECT SUM(shipping_fee) as total FROM orders WHERE status = 'completed'");
$kpi['revenue'] = $res->fetch_assoc()['total'] ?? 0;

// Tổng đơn hàng
$res = $conn->query("SELECT COUNT(*) as total FROM orders");
$kpi['total_orders'] = $res->fetch_assoc()['total'];

// Tổng người dùng (khách hàng)
$res = $conn->query("SELECT COUNT(*) as total FROM users WHERE role = 'customer'");
$kpi['total_users'] = $res->fetch_assoc()['total'];

// Tỷ lệ hoàn tất
$res = $conn->query("SELECT COUNT(*) as total FROM orders WHERE status = 'completed'");
$completed_count = $res->fetch_assoc()['total'];
$kpi['completed_rate'] = $kpi['total_orders'] > 0 ? round(($completed_count / $kpi['total_orders']) * 100, 1) : 0;


// --- 2. THỐNG KÊ THEO THỜI GIAN (7 ngày gần nhất) ---
$dates = [];
$orders_data = [];
$revenue_data = [];

// Khởi tạo mảng 7 ngày với giá trị 0
for ($i = 6; $i >= 0; $i--) {
    $d = date('Y-m-d', strtotime("-$i days"));
    $dates[$d] = ['orders' => 0, 'revenue' => 0];
}

$sql = "SELECT DATE(created_at) as d, COUNT(*) as c, SUM(CASE WHEN status='completed' THEN shipping_fee ELSE 0 END) as r 
        FROM orders 
        WHERE created_at >= DATE(NOW()) - INTERVAL 7 DAY 
        GROUP BY DATE(created_at)";
$res = $conn->query($sql);
while ($row = $res->fetch_assoc()) {
    if (isset($dates[$row['d']])) {
        $dates[$row['d']]['orders'] = $row['c'];
        $dates[$row['d']]['revenue'] = $row['r'];
    }
}

// Chuyển dữ liệu sang mảng tuần tự cho Chart.js
$chart_labels = [];
$chart_orders = [];
$chart_revenue = [];
foreach ($dates as $date => $data) {
    $chart_labels[] = date('d/m', strtotime($date));
    $chart_orders[] = $data['orders'];
    $chart_revenue[] = $data['revenue'];
}


// --- 3. THỐNG KÊ THEO LOẠI DỊCH VỤ & HÀNG HÓA ---
// Dịch vụ
$svc_labels = [];
$svc_data = [];
$svc_map = [
    'slow' => 'Chậm',
    'standard' => 'Tiêu chuẩn',
    'fast' => 'Nhanh',
    'express' => 'Hỏa tốc',
    'instant' => 'Ngay lập tức',
    'bulk' => 'Số lượng lớn (cũ)'
];
$res = $conn->query("SELECT service_type, COUNT(*) as c FROM orders GROUP BY service_type");
while ($row = $res->fetch_assoc()) {
    $svc_labels[] = $svc_map[$row['service_type']] ?? $row['service_type'];
    $svc_data[] = $row['c'];
}

// Loại hàng
$pkg_labels = [];
$pkg_data = [];
$pkg_map = ['document' => 'Tài liệu', 'food' => 'Đồ ăn', 'clothes' => 'Quần áo', 'electronic' => 'Điện tử', 'other' => 'Khác'];
$res = $conn->query("SELECT package_type, COUNT(*) as c FROM orders GROUP BY package_type");
while ($row = $res->fetch_assoc()) {
    $pkg_labels[] = $pkg_map[$row['package_type']] ?? $row['package_type'];
    $pkg_data[] = $row['c'];
}


// --- 4. TOP NGƯỜI DÙNG TIÊU BIỂU ---
$top_users = [];
$sql = "SELECT u.fullname, u.username, COUNT(o.id) as total_orders, 
        SUM(CASE WHEN o.status='completed' THEN o.shipping_fee ELSE 0 END) as total_spent 
        FROM orders o 
        JOIN users u ON o.user_id = u.id 
        GROUP BY o.user_id 
        ORDER BY total_orders DESC 
        LIMIT 5";
$res = $conn->query($sql);
while ($row = $res->fetch_assoc()) {
    $top_users[] = $row;
}
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Thống kê hệ thống | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="../assets/css/admin.css?v=<?php echo time(); ?>">
    <!-- Chart.js CDN -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <!-- Chart.js DataLabels Plugin -->
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
    <style>
    </style>
</head>

<body>
    <?php include __DIR__ . '/../../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Báo cáo thống kê</h2>
            <a href="orders_manage.php" class="back-link">← Quản lý đơn hàng</a>
        </div>

        <!-- 1. KPI CARDS -->
        <div class="stats-grid">
            <div class="stat-card total">
                <div class="stat-icon">💰</div>
                <h3>Doanh thu (Ship)</h3>
                <p class="stat-value">
                    <?php echo number_format($kpi['revenue']); ?>đ
                </p>
            </div>
            <div class="stat-card shipping">
                <div class="stat-icon">📦</div>
                <h3>Tổng đơn hàng</h3>
                <p class="stat-value">
                    <?php echo number_format($kpi['total_orders']); ?>
                </p>
            </div>
            <div class="stat-card completed">
                <div class="stat-icon">📈</div>
                <h3>Tỷ lệ hoàn tất</h3>
                <p class="stat-value">
                    <?php echo $kpi['completed_rate']; ?>%
                </p>
            </div>
            <div class="stat-card pending">
                <div class="stat-icon">👥</div>
                <h3>Khách hàng</h3>
                <p class="stat-value">
                    <?php echo number_format($kpi['total_users']); ?>
                </p>
            </div>
        </div>

        <!-- 2. CHARTS ROW 1 -->
        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-header">Đơn hàng & Doanh thu (7 ngày qua)</div>
                <div style="height: 320px; position: relative;">
                    <canvas id="revenueChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">Top khách hàng thân thiết</div>
                <div style="overflow-x: auto;">
                    <table class="order-table" style="margin-top:10px; width: 100%;">
                        <thead>
                            <tr>
                                <th>Khách hàng</th>
                                <th>Đơn</th>
                                <th>Chi tiêu</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($top_users as $u): ?>
                            <tr>
                                <td>
                                    <strong>
                                        <?php echo htmlspecialchars($u['fullname']); ?>
                                    </strong><br>
                                    <small style="color:#666">@
                                        <?php echo htmlspecialchars($u['username']); ?>
                                    </small>
                                </td>
                                <td style="text-align:center; font-weight:bold;">
                                    <?php echo $u['total_orders']; ?>
                                </td>
                                <td style="color:#d9534f">
                                    <?php echo number_format($u['total_spent']); ?>đ
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 3. CHARTS ROW 2 -->
        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-header">Phân loại dịch vụ</div>
                <div style="height: 250px; position: relative; width: 100%; display:flex; justify-content:center;">
                    <canvas id="serviceChart"></canvas>
                </div>
            </div>
            <div class="chart-card">
                <div class="chart-header">Phân loại hàng hóa</div>
                <div style="height: 250px; position: relative; width: 100%; display:flex; justify-content:center;">
                    <canvas id="packageChart"></canvas>
                </div>
            </div>
        </div>

    </main>

    <?php include __DIR__ . '/../../includes/footer.php'; ?>

    <!-- Truyền dữ liệu từ PHP sang JS -->
    <script>
    window.chartData = {
        revenue: {
            labels: <?php echo json_encode($chart_labels); ?>,
            revenue: <?php echo json_encode($chart_revenue); ?>,
            orders: <?php echo json_encode($chart_orders); ?>
        },
        service: {
            labels: <?php echo json_encode($svc_labels); ?>,
            data: <?php echo json_encode($svc_data); ?>
        },
        package: {
            labels: <?php echo json_encode($pkg_labels); ?>,
            data: <?php echo json_encode($pkg_data); ?>
        }
    };
    </script>
    <!-- Nhúng tệp JS riêng cho trang thống kê -->
    <script src="../assets/js/admin-stats.js?v=<?php echo time(); ?>"></script>
</body>

</html>

