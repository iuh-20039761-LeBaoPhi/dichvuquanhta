<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    admin_api_json(['success' => false, 'message' => 'Method không được hỗ trợ.'], 405);
}

$stats = ['pending' => 0, 'shipping' => 0, 'completed' => 0, 'cancelled' => 0];
$totalOrders = 0;
$statResult = $conn->query("SELECT status, COUNT(*) AS total FROM orders GROUP BY status");
if ($statResult) {
    while ($row = $statResult->fetch_assoc()) {
        $statusKey = $row['status'] ?: 'pending';
        if (isset($stats[$statusKey])) {
            $stats[$statusKey] = intval($row['total'] ?? 0);
        }
        $totalOrders += intval($row['total'] ?? 0);
    }
}

$search = trim((string) ($_GET['search'] ?? ''));
$status = trim((string) ($_GET['status'] ?? ''));
$issue = trim((string) ($_GET['issue'] ?? ''));
[$page, $limit, $offset] = admin_api_get_pagination(10, 100);

$where = [];
$params = [];
$types = '';

if ($search !== '') {
    $where[] = "(order_code LIKE ? OR client_order_code LIKE ? OR name LIKE ? OR phone LIKE ?)";
    $term = '%' . $search . '%';
    array_push($params, $term, $term, $term, $term);
    $types .= 'ssss';
}

if ($status !== '') {
    $where[] = "status = ?";
    $params[] = $status;
    $types .= 's';
}

if ($issue === 'has_admin_note') {
    $where[] = "(admin_note IS NOT NULL AND admin_note != '')";
}

$whereSql = empty($where) ? '' : (' WHERE ' . implode(' AND ', $where));

$countSql = "SELECT COUNT(*) AS total FROM orders" . $whereSql;
$stmtCount = $conn->prepare($countSql);
if ($types !== '') {
    $stmtCount->bind_param($types, ...$params);
}
$stmtCount->execute();
$countResult = $stmtCount->get_result()->fetch_assoc();
$totalRecords = intval($countResult['total'] ?? 0);
$stmtCount->close();

$sql = "SELECT id, order_code, client_order_code, name, phone, receiver_name, receiver_phone,
               pickup_time, service_type, shipping_fee, payment_status, status, admin_note, created_at
        FROM orders" . $whereSql . " ORDER BY id DESC LIMIT ? OFFSET ?";
$paramsWithPage = $params;
$paramsWithPage[] = $limit;
$paramsWithPage[] = $offset;
$typesWithPage = $types . 'ii';

$stmt = $conn->prepare($sql);
$stmt->bind_param($typesWithPage, ...$paramsWithPage);
$stmt->execute();
$result = $stmt->get_result();

$serviceMap = ['slow' => 'Chậm', 'standard' => 'Tiêu chuẩn', 'fast' => 'Nhanh', 'express' => 'Hỏa tốc', 'instant' => 'Ngay lập tức', 'bulk' => 'Số lượng lớn'];
$statusMap = ['pending' => 'Chờ lấy', 'shipping' => 'Đang giao', 'completed' => 'Hoàn tất', 'cancelled' => 'Đã hủy'];

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = [
        'id' => intval($row['id'] ?? 0),
        'order_code' => $row['order_code'] ?? '',
        'client_order_code' => admin_api_value_or_null($row['client_order_code'] ?? null),
        'sender_name' => $row['name'] ?? '',
        'sender_phone' => $row['phone'] ?? '',
        'receiver_name' => $row['receiver_name'] ?? '',
        'receiver_phone' => $row['receiver_phone'] ?? '',
        'pickup_time' => admin_api_value_or_null($row['pickup_time'] ?? null),
        'service_type' => $row['service_type'] ?? '',
        'service_label' => $serviceMap[$row['service_type'] ?? ''] ?? ($row['service_type'] ?? ''),
        'shipping_fee' => floatval($row['shipping_fee'] ?? 0),
        'payment_status' => $row['payment_status'] ?? '',
        'payment_status_label' => ($row['payment_status'] ?? '') === 'paid' ? 'Đã trả' : 'Chưa trả',
        'status' => $row['status'] ?? '',
        'status_label' => $statusMap[$row['status'] ?? ''] ?? ($row['status'] ?? ''),
        'has_admin_note' => !empty($row['admin_note']),
        'created_at' => admin_api_value_or_null($row['created_at'] ?? null),
    ];
}
$stmt->close();

admin_api_json([
    'success' => true,
    'data' => [
        'stats' => [
            'total' => $totalOrders,
            'by_status' => $stats,
        ],
        'filters' => [
            'search' => $search,
            'status' => $status,
            'issue' => $issue,
        ],
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => $limit > 0 ? intval(ceil($totalRecords / $limit)) : 0,
        ],
        'orders' => $orders,
    ],
]);
