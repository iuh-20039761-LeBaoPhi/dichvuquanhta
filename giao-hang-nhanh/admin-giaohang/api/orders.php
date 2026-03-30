<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    admin_api_json(['success' => false, 'message' => 'Method không được hỗ trợ.'], 405);
}

$stats = ['pending' => 0, 'shipping' => 0, 'completed' => 0, 'cancelled' => 0];
$totalOrders = 0;
$statResult = $conn->query("SELECT trang_thai AS status, COUNT(*) AS total FROM don_hang GROUP BY trang_thai");
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
    $where[] = "(ma_don_hang LIKE ? OR ma_don_hang_khach LIKE ? OR ten_nguoi_gui LIKE ? OR so_dien_thoai_nguoi_gui LIKE ?)";
    $term = '%' . $search . '%';
    array_push($params, $term, $term, $term, $term);
    $types .= 'ssss';
}

if ($status !== '') {
    $where[] = "trang_thai = ?";
    $params[] = $status;
    $types .= 's';
}

if ($issue === 'has_admin_note') {
    $where[] = "(ghi_chu_quan_tri IS NOT NULL AND ghi_chu_quan_tri != '')";
}

$whereSql = empty($where) ? '' : (' WHERE ' . implode(' AND ', $where));

$countSql = "SELECT COUNT(*) AS total FROM don_hang" . $whereSql;
$stmtCount = $conn->prepare($countSql);
if ($types !== '') {
    $stmtCount->bind_param($types, ...$params);
}
$stmtCount->execute();
$countResult = $stmtCount->get_result()->fetch_assoc();
$totalRecords = intval($countResult['total'] ?? 0);
$stmtCount->close();

$sql = "SELECT id,
               ma_don_hang AS order_code,
               ma_don_hang_khach AS client_order_code,
               ten_nguoi_gui AS name,
               so_dien_thoai_nguoi_gui AS phone,
               ten_nguoi_nhan AS receiver_name,
               so_dien_thoai_nguoi_nhan AS receiver_phone,
               thoi_gian_lay_hang AS pickup_time,
               loai_dich_vu AS service_type,
               phi_van_chuyen AS shipping_fee,
               trang_thai_thanh_toan AS payment_status,
               trang_thai AS status,
               ghi_chu_quan_tri AS admin_note,
               tao_luc AS created_at
        FROM don_hang" . $whereSql . " ORDER BY id DESC LIMIT ? OFFSET ?";
$paramsWithPage = $params;
$paramsWithPage[] = $limit;
$paramsWithPage[] = $offset;
$typesWithPage = $types . 'ii';

$stmt = $conn->prepare($sql);
$stmt->bind_param($typesWithPage, ...$paramsWithPage);
$stmt->execute();
$result = $stmt->get_result();

$serviceMap = [
    'giao_tieu_chuan' => 'Tiêu chuẩn',
    'giao_nhanh' => 'Nhanh',
    'giao_hoa_toc' => 'Hỏa tốc',
    'giao_ngay_lap_tuc' => 'Ngay lập tức',
    'so_luong_lon' => 'Số lượng lớn',
    'quoc_te_tiet_kiem' => 'Quốc tế tiết kiệm',
    'quoc_te_hoa_toc' => 'Quốc tế hỏa tốc',
];
$statusMap = ['pending' => 'Chờ xử lý', 'shipping' => 'Đang giao', 'completed' => 'Hoàn tất', 'cancelled' => 'Đã hủy'];
$paymentStatusMap = [
    'paid' => 'Đã thanh toán',
    'unpaid' => 'Chưa thanh toán',
    'refunded' => 'Đã hoàn tiền',
];

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
        'payment_status_label' => $paymentStatusMap[$row['payment_status'] ?? ''] ?? ($row['payment_status'] ?? ''),
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
