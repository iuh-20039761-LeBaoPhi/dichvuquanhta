<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

$kpi = [
    'revenue' => 0.0,
    'total_orders' => 0,
    'total_users' => 0,
    'completed_rate' => 0.0,
];

$res = $conn->query("SELECT COALESCE(SUM(phi_van_chuyen), 0) AS total FROM don_hang WHERE trang_thai = 'completed'");
$kpi['revenue'] = floatval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);

$res = $conn->query("SELECT COUNT(*) AS total FROM don_hang");
$kpi['total_orders'] = intval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);

$res = $conn->query("SELECT COUNT(*) AS total FROM nguoi_dung WHERE vai_tro = 'customer'");
$kpi['total_users'] = intval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);

$res = $conn->query("SELECT COUNT(*) AS total FROM don_hang WHERE trang_thai = 'completed'");
$completedCount = intval(($res && $row = $res->fetch_assoc()) ? ($row['total'] ?? 0) : 0);
$kpi['completed_rate'] = $kpi['total_orders'] > 0 ? round(($completedCount / $kpi['total_orders']) * 100, 1) : 0.0;

$timelineIndex = [];
for ($i = 6; $i >= 0; $i--) {
    $date = date('Y-m-d', strtotime("-$i days"));
    $timelineIndex[$date] = ['orders' => 0, 'revenue' => 0.0];
}

$sql = "SELECT DATE(tao_luc) AS d, COUNT(*) AS c,
               COALESCE(SUM(CASE WHEN trang_thai = 'completed' THEN phi_van_chuyen ELSE 0 END), 0) AS r
        FROM don_hang
        WHERE tao_luc >= DATE(NOW()) - INTERVAL 7 DAY
        GROUP BY DATE(tao_luc)";
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
    'giao_tieu_chuan' => 'Tiêu chuẩn',
    'giao_nhanh' => 'Nhanh',
    'giao_hoa_toc' => 'Hỏa tốc',
    'giao_ngay_lap_tuc' => 'Ngay lập tức',
    'so_luong_lon' => 'Số lượng lớn',
    'quoc_te_tiet_kiem' => 'Quốc tế tiết kiệm',
    'quoc_te_hoa_toc' => 'Quốc tế hỏa tốc',
];
$serviceBreakdown = [];
$res = $conn->query("SELECT loai_dich_vu AS service_type, COUNT(*) AS total FROM don_hang GROUP BY loai_dich_vu");
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
$res = $conn->query("SELECT loai_goi_hang AS package_type, COUNT(*) AS total FROM don_hang GROUP BY loai_goi_hang");
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
$sql = "SELECT u.id, u.ho_ten AS fullname, u.ten_dang_nhap AS username, COUNT(o.id) AS total_orders,
               COALESCE(SUM(CASE WHEN o.trang_thai = 'completed' THEN o.phi_van_chuyen ELSE 0 END), 0) AS total_spent
        FROM don_hang o
        JOIN nguoi_dung u ON o.nguoi_dung_id = u.id
        GROUP BY o.nguoi_dung_id, u.id, u.ho_ten, u.ten_dang_nhap
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
