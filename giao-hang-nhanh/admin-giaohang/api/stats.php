<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

$kpi = [
    'revenue' => 0.0,
    'total_orders' => 0,
    'total_users' => 0,
    'completed_rate' => 0.0,
];

$res = $conn->query("SELECT COALESCE(SUM(shipping_fee), 0) AS total FROM orders WHERE status = 'completed'");
$kpi['revenue'] = floatval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);

$res = $conn->query("SELECT COUNT(*) AS total FROM orders");
$kpi['total_orders'] = intval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);

$res = $conn->query("SELECT COUNT(*) AS total FROM users WHERE role = 'customer'");
$kpi['total_users'] = intval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);

$res = $conn->query("SELECT COUNT(*) AS total FROM orders WHERE status = 'completed'");
$completedCount = intval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);
$kpi['completed_rate'] = $kpi['total_orders'] > 0 ? round(($completedCount / $kpi['total_orders']) * 100, 1) : 0.0;

$timelineIndex = [];
for ($i = 6; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-$i days"));
    $timelineIndex[$date] = ['orders' => 0, 'revenue' => 0.0];
}

$sql = "SELECT DATE(created_at) AS d, COUNT(*) AS c,
               COALESCE(SUM(CASE WHEN status = 'completed' THEN shipping_fee ELSE 0 END), 0) AS r
        FROM orders
        WHERE created_at >= DATE(NOW()) - INTERVAL 7 DAY
        GROUP BY DATE(created_at)";
$res = $conn->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        if (isset($timelineIndex[$row['d']])) {
            $timelineIndex[$row['d']]['orders'] = intval($row['c'] ?? 0);
            $timelineIndex[$row['d']]['revenue'] = floatval($row['r'] ?? 0);
        }
    }
}

$timeline = [
    'labels' => [],
    'orders' => [],
    'revenue' => [],
];
foreach ($timelineIndex as $date => $values) {
    $timeline['labels'][] = date('d/m', strtotime($date));
    $timeline['orders'][] = $values['orders'];
    $timeline['revenue'][] = $values['revenue'];
}

$serviceMap = [
    'slow' => 'Chậm',
    'standard' => 'Tiêu chuẩn',
    'fast' => 'Nhanh',
    'express' => 'Hỏa tốc',
    'bulk' => 'Số lượng lớn',
];
$serviceBreakdown = [];
$res = $conn->query("SELECT service_type, COUNT(*) AS total FROM orders GROUP BY service_type");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $key = (string) ($row['service_type'] ?? '');
        $serviceBreakdown[] = [
            'key' => $key,
            'label' => $serviceMap[$key] ?? $key,
            'total' => intval($row['total'] ?? 0),
        ];
    }
}

$packageMap = [
    'document' => 'Tài liệu',
    'food' => 'Đồ ăn',
    'clothes' => 'Quần áo',
    'electronic' => 'Điện tử',
    'other' => 'Khác',
];
$packageBreakdown = [];
$res = $conn->query("SELECT package_type, COUNT(*) AS total FROM orders GROUP BY package_type");
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $key = (string) ($row['package_type'] ?? '');
        $packageBreakdown[] = [
            'key' => $key,
            'label' => $packageMap[$key] ?? $key,
            'total' => intval($row['total'] ?? 0),
        ];
    }
}

$topUsers = [];
$sql = "SELECT u.id, u.fullname, u.username, COUNT(o.id) AS total_orders,
               COALESCE(SUM(CASE WHEN o.status = 'completed' THEN o.shipping_fee ELSE 0 END), 0) AS total_spent
        FROM orders o
        JOIN users u ON o.user_id = u.id
        GROUP BY o.user_id, u.id, u.fullname, u.username
        ORDER BY total_orders DESC
        LIMIT 5";
$res = $conn->query($sql);
if ($res) {
    while ($row = $res->fetch_assoc()) {
        $topUsers[] = [
            'id' => intval($row['id'] ?? 0),
            'fullname' => $row['fullname'] ?? '',
            'username' => $row['username'] ?? '',
            'total_orders' => intval($row['total_orders'] ?? 0),
            'total_spent' => floatval($row['total_spent'] ?? 0),
        ];
    }
}

admin_api_json([
    'success' => true,
    'data' => [
        'kpi' => $kpi,
        'timeline' => $timeline,
        'service_breakdown' => $serviceBreakdown,
        'package_breakdown' => $packageBreakdown,
        'top_users' => $topUsers,
    ],
]);
