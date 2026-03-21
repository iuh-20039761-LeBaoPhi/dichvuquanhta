<?php
session_start();
require_once __DIR__ . '/../../config/db.php';

header('Content-Type: application/json; charset=utf-8');

function respond(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function bind_statement_params(mysqli_stmt $stmt, string $types, array $params): void
{
    if ($types === '' || empty($params)) {
        return;
    }

    $bindArgs = [$types];
    foreach ($params as $index => $value) {
        $bindArgs[] = &$params[$index];
    }

    call_user_func_array([$stmt, 'bind_param'], $bindArgs);
}

function require_shipper(mysqli $conn): array
{
    if (!isset($_SESSION['user_id'])) {
        respond([
            'status' => 'error',
            'message' => 'Phiên đăng nhập đã hết hạn.',
        ], 401);
    }

    $userId = (int) $_SESSION['user_id'];
    $stmt = $conn->prepare(
        "SELECT id, username, fullname, phone, email, role, vehicle_type, is_locked, is_approved, created_at
         FROM users
         WHERE id = ?
         LIMIT 1"
    );

    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể kiểm tra tài khoản shipper.'], 500);
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        respond(['status' => 'error', 'message' => 'Tài khoản shipper không tồn tại.'], 401);
    }

    if (($user['role'] ?? '') !== 'shipper') {
        respond(['status' => 'error', 'message' => 'Bạn không có quyền truy cập khu vực nhà cung cấp.'], 403);
    }

    if ((int) ($user['is_approved'] ?? 0) !== 1) {
        respond(['status' => 'error', 'message' => 'Tài khoản shipper đang chờ quản trị viên phê duyệt.'], 403);
    }

    if ((int) ($user['is_locked'] ?? 0) === 1) {
        respond(['status' => 'error', 'message' => 'Tài khoản shipper đã bị khóa.'], 403);
    }

    return $user;
}

function format_currency_value($value): float
{
    return round((float) $value, 2);
}

function get_status_label(string $status): string
{
    $map = [
        'pending' => 'Chờ xử lý',
        'shipping' => 'Đang giao',
        'completed' => 'Hoàn tất',
        'cancelled' => 'Đã hủy',
    ];

    return $map[$status] ?? 'Không xác định';
}

function get_service_label(string $serviceType): string
{
    $map = [
        'slow' => 'Chậm',
        'standard' => 'Tiêu chuẩn',
        'fast' => 'Nhanh',
        'express' => 'Hỏa tốc',
        'instant' => 'Giao ngay lập tức',
        'bulk' => 'Số lượng lớn',
        'intl_economy' => 'Quốc tế tiết kiệm',
        'intl_express' => 'Quốc tế hỏa tốc',
    ];

    return $map[$serviceType] ?? $serviceType;
}

function get_payment_method_label(string $paymentMethod): string
{
    $normalized = strtolower(trim($paymentMethod));
    return in_array($normalized, ['bank', 'bank_transfer', 'transfer', 'chuyen_khoan'], true)
        ? 'Chuyển khoản'
        : 'Tiền mặt/COD';
}

function get_payment_status_label(string $paymentStatus): string
{
    return $paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán';
}

function decode_order_json(?string $json): array
{
    if (!$json) {
        return [];
    }

    $decoded = json_decode($json, true);
    return is_array($decoded) ? $decoded : [];
}

function get_order_service_meta(array $order): array
{
    return decode_order_json($order['service_meta_json'] ?? null);
}

function get_order_fee_breakdown(array $order): array
{
    return decode_order_json($order['pricing_breakdown_json'] ?? null);
}

function extract_insurance_fee(?string $note): float
{
    if (!$note) {
        return 0;
    }

    if (preg_match('/Bao hiem hang hoa: ([\\d\\.,]+)/i', $note, $matches)) {
        return (float) str_replace(['.', ','], '', $matches[1]);
    }

    return 0;
}

function extract_payer_label(?string $note): string
{
    if ($note && preg_match('/Nguoi tra cuoc: (.*)/i', $note, $matches)) {
        return trim($matches[1]);
    }

    return 'Người gửi';
}

function get_order_payer_label(array $order): string
{
    $payload = decode_order_json($order['booking_payload_json'] ?? null);
    $feePayer = (string) ($payload['fee_payer'] ?? '');
    if ($feePayer === 'nhan') {
        return 'Người nhận';
    }

    return extract_payer_label($order['note'] ?? '');
}

function clean_order_note(?string $note): string
{
    $cleanNote = trim((string) $note);
    $cleanNote = preg_replace('/--- CHI TIET HANG HOA ---\\n(.*?)(?=\\n---|$)/s', '', $cleanNote);
    $cleanNote = preg_replace('/Bao hiem hang hoa: .*/i', '', $cleanNote);
    $cleanNote = preg_replace('/Nguoi tra cuoc: .*/i', '', $cleanNote);
    $cleanNote = preg_replace('/Tep dinh kem: .*/i', '', $cleanNote);
    $cleanNote = str_replace(['--- CHI TIET HANG HOA ---', '---'], '', $cleanNote);
    return trim($cleanNote);
}

function get_public_upload_root(): string
{
    return dirname(__DIR__, 2) . '/public/uploads';
}

function collect_public_files(string $absoluteDir, string $publicPrefix): array
{
    if (!is_dir($absoluteDir)) {
        return [];
    }

    $entries = array_diff(scandir($absoluteDir) ?: [], ['.', '..']);
    $items = [];

    foreach ($entries as $entry) {
        $absolutePath = $absoluteDir . DIRECTORY_SEPARATOR . $entry;
        if (!is_file($absolutePath)) {
            continue;
        }

        $items[] = [
            'name' => $entry,
            'url' => rtrim($publicPrefix, '/') . '/' . rawurlencode($entry),
            'extension' => strtolower(pathinfo($entry, PATHINFO_EXTENSION)),
        ];
    }

    usort($items, static function (array $left, array $right): int {
        return strcmp($left['name'], $right['name']);
    });

    return $items;
}

function get_shipper_report_media(string $orderCode): array
{
    return collect_public_files(
        get_public_upload_root() . '/shipper_reports/' . $orderCode,
        '../uploads/shipper_reports/' . rawurlencode($orderCode)
    );
}

function save_shipper_report_uploads(string $orderCode): array
{
    if (empty($_FILES['media_files']) || !is_array($_FILES['media_files']['name'])) {
        return [];
    }

    $targetDir = get_public_upload_root() . '/shipper_reports/' . $orderCode;
    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        respond(['status' => 'error', 'message' => 'Không thể tạo thư mục báo cáo công việc.'], 500);
    }

    $savedFiles = [];
    $fileCount = count($_FILES['media_files']['name']);
    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;

    for ($index = 0; $index < $fileCount; $index++) {
        if (($_FILES['media_files']['error'][$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }

        $tmpName = (string) ($_FILES['media_files']['tmp_name'][$index] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            continue;
        }

        $originalName = basename((string) ($_FILES['media_files']['name'][$index] ?? ''));
        $mimeType = $finfo ? (string) finfo_file($finfo, $tmpName) : '';

        if ($mimeType !== '' && strpos($mimeType, 'image/') !== 0 && strpos($mimeType, 'video/') !== 0) {
            continue;
        }

        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $safeName = 'bao-cao-giao-hang-' . date('Ymd-His') . '-' . $index . ($extension ? '.' . $extension : '');
        $destination = $targetDir . DIRECTORY_SEPARATOR . $safeName;

        if (move_uploaded_file($tmpName, $destination)) {
            $savedFiles[] = [
                'name' => $safeName,
                'relative_path' => 'shipper_reports/' . $orderCode . '/' . $safeName,
                'url' => '../uploads/shipper_reports/' . rawurlencode($orderCode) . '/' . rawurlencode($safeName),
                'extension' => $extension,
            ];
        }
    }

    if ($finfo) {
        finfo_close($finfo);
    }

    return $savedFiles;
}

function get_shipper_kpis(mysqli $conn, int $shipperId): array
{
    $stats = [
        'total' => 0,
        'pending' => 0,
        'shipping' => 0,
        'completed' => 0,
        'cancelled' => 0,
        'revenue' => 0,
        'today_total' => 0,
        'today_completed' => 0,
    ];

    $stmt = $conn->prepare(
        "SELECT
            COUNT(*) AS total_orders,
            COALESCE(SUM(status = 'pending'), 0) AS pending_orders,
            COALESCE(SUM(status = 'shipping'), 0) AS shipping_orders,
            COALESCE(SUM(status = 'completed'), 0) AS completed_orders,
            COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_orders,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN shipping_fee ELSE 0 END), 0) AS revenue_total,
            COALESCE(SUM(DATE(created_at) = CURDATE()), 0) AS today_orders,
            COALESCE(SUM(status = 'completed' AND DATE(created_at) = CURDATE()), 0) AS today_completed_orders
         FROM orders
         WHERE shipper_id = ?"
    );

    if ($stmt) {
        $stmt->bind_param('i', $shipperId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $stats['total'] = (int) ($row['total_orders'] ?? 0);
        $stats['pending'] = (int) ($row['pending_orders'] ?? 0);
        $stats['shipping'] = (int) ($row['shipping_orders'] ?? 0);
        $stats['completed'] = (int) ($row['completed_orders'] ?? 0);
        $stats['cancelled'] = (int) ($row['cancelled_orders'] ?? 0);
        $stats['revenue'] = format_currency_value($row['revenue_total'] ?? 0);
        $stats['today_total'] = (int) ($row['today_orders'] ?? 0);
        $stats['today_completed'] = (int) ($row['today_completed_orders'] ?? 0);
    }

    return $stats;
}

function notify_customer_about_shipper_update(mysqli $conn, array $order, int $orderId, string $newStatus, string $note): void
{
    $customerId = (int) ($order['customer_user_id'] ?? 0);
    if ($customerId <= 0) {
        return;
    }

    $statusMap = [
        'pending' => 'đang chờ xử lý lại',
        'shipping' => 'đang được giao',
        'completed' => 'đã hoàn tất',
        'cancelled' => 'đã bị hủy',
    ];

    $statusText = $statusMap[$newStatus] ?? 'đã được cập nhật';
    $message = "Nhà cung cấp cập nhật: Đơn hàng #{$order['order_code']} của bạn {$statusText}.";
    if ($note !== '') {
        $message .= ' Ghi chú: ' . mb_substr($note, 0, 120);
    }

    $link = '/giao-hang-nhanh/public/khach-hang/chi-tiet-don-hang.html?id=' . $orderId;
    $stmt = $conn->prepare("INSERT INTO notifications (user_id, order_id, message, link) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iiss', $customerId, $orderId, $message, $link);
    $stmt->execute();
    $stmt->close();
}

function handle_session(mysqli $conn): void
{
    $user = require_shipper($conn);
    $stats = get_shipper_kpis($conn, (int) $user['id']);

    respond([
        'status' => 'success',
        'user' => [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'fullname' => $user['fullname'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'vehicle_type' => $user['vehicle_type'],
            'created_at' => $user['created_at'],
        ],
        'meta' => [
            'assigned_total' => $stats['total'],
            'active_total' => $stats['pending'] + $stats['shipping'],
        ],
    ]);
}

function handle_dashboard(mysqli $conn): void
{
    $user = require_shipper($conn);
    $shipperId = (int) $user['id'];
    $recentStatus = trim((string) ($_GET['recent_status'] ?? 'active'));
    $allowedFilters = ['active', 'all', 'pending', 'shipping', 'completed', 'cancelled'];
    if (!in_array($recentStatus, $allowedFilters, true)) {
        $recentStatus = 'active';
    }

    $stats = get_shipper_kpis($conn, $shipperId);
    $where = ["shipper_id = ?"];
    $params = [$shipperId];
    $types = 'i';

    if ($recentStatus === 'active') {
        $where[] = "status IN ('pending', 'shipping')";
    } elseif ($recentStatus !== 'all') {
        $where[] = "status = ?";
        $params[] = $recentStatus;
        $types .= 's';
    }

    $sql = "SELECT id, order_code, pickup_address, delivery_address, receiver_name, shipping_fee, cod_amount, status, payment_status, service_type, created_at
            FROM orders
            WHERE " . implode(' AND ', $where) . "
            ORDER BY created_at DESC
            LIMIT 6";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải dashboard nhà cung cấp.'], 500);
    }

    bind_statement_params($stmt, $types, $params);
    $stmt->execute();
    $result = $stmt->get_result();
    $recentOrders = [];
    while ($row = $result->fetch_assoc()) {
        $recentOrders[] = [
            'id' => (int) $row['id'],
            'order_code' => $row['order_code'],
            'pickup_address' => $row['pickup_address'],
            'delivery_address' => $row['delivery_address'],
            'receiver_name' => $row['receiver_name'],
            'shipping_fee' => format_currency_value($row['shipping_fee']),
            'cod_amount' => format_currency_value($row['cod_amount']),
            'status' => $row['status'],
            'status_label' => get_status_label((string) $row['status']),
            'payment_status' => $row['payment_status'],
            'payment_status_label' => get_payment_status_label((string) $row['payment_status']),
            'service_type' => $row['service_type'],
            'service_label' => get_service_label((string) $row['service_type']),
            'created_at' => $row['created_at'],
        ];
    }
    $stmt->close();

    respond([
        'status' => 'success',
        'filters' => [
            'recent_status' => $recentStatus,
        ],
        'stats' => $stats,
        'recent_orders' => $recentOrders,
    ]);
}

function handle_orders(mysqli $conn): void
{
    $user = require_shipper($conn);
    $shipperId = (int) $user['id'];

    $search = trim((string) ($_GET['search'] ?? ''));
    $status = trim((string) ($_GET['status'] ?? ''));
    $dateFrom = trim((string) ($_GET['date_from'] ?? ''));
    $dateTo = trim((string) ($_GET['date_to'] ?? ''));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(20, max(1, (int) ($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $where = ["shipper_id = ?"];
    $params = [$shipperId];
    $types = 'i';

    if ($search !== '') {
        $searchTerm = '%' . $search . '%';
        $where[] = "(order_code LIKE ? OR name LIKE ? OR receiver_name LIKE ? OR pickup_address LIKE ? OR delivery_address LIKE ?)";
        array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
        $types .= 'sssss';
    }

    if ($status !== '') {
        $where[] = "status = ?";
        $params[] = $status;
        $types .= 's';
    }

    if ($dateFrom !== '' && $dateTo !== '') {
        $where[] = "DATE(created_at) BETWEEN ? AND ?";
        $params[] = $dateFrom;
        $params[] = $dateTo;
        $types .= 'ss';
    }

    $whereSql = implode(' AND ', $where);

    $countStmt = $conn->prepare("SELECT COUNT(*) AS total FROM orders WHERE {$whereSql}");
    if (!$countStmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải danh sách đơn hàng.'], 500);
    }
    bind_statement_params($countStmt, $types, $params);
    $countStmt->execute();
    $totalRecords = (int) (($countStmt->get_result()->fetch_assoc()['total'] ?? 0));
    $countStmt->close();

    $listSql = "SELECT id, order_code, name, pickup_address, delivery_address, receiver_name, receiver_phone, shipping_fee, cod_amount, status, payment_status, service_type, created_at
                FROM orders
                WHERE {$whereSql}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?";
    $listStmt = $conn->prepare($listSql);
    if (!$listStmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải lịch sử đơn của nhà cung cấp.'], 500);
    }

    $listParams = $params;
    $listParams[] = $limit;
    $listParams[] = $offset;
    bind_statement_params($listStmt, $types . 'ii', $listParams);
    $listStmt->execute();
    $result = $listStmt->get_result();
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = [
            'id' => (int) $row['id'],
            'order_code' => $row['order_code'],
            'sender_name' => $row['name'],
            'pickup_address' => $row['pickup_address'],
            'delivery_address' => $row['delivery_address'],
            'receiver_name' => $row['receiver_name'],
            'receiver_phone' => $row['receiver_phone'],
            'shipping_fee' => format_currency_value($row['shipping_fee']),
            'cod_amount' => format_currency_value($row['cod_amount']),
            'status' => $row['status'],
            'status_label' => get_status_label((string) $row['status']),
            'payment_status' => $row['payment_status'],
            'payment_status_label' => get_payment_status_label((string) $row['payment_status']),
            'service_type' => $row['service_type'],
            'service_label' => get_service_label((string) $row['service_type']),
            'created_at' => $row['created_at'],
        ];
    }
    $listStmt->close();

    respond([
        'status' => 'success',
        'items' => $items,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => (int) ceil($totalRecords / $limit),
        ],
        'filters' => [
            'search' => $search,
            'status' => $status,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ],
    ]);
}

function handle_order_detail(mysqli $conn): void
{
    $shipper = require_shipper($conn);
    $shipperId = (int) $shipper['id'];
    $orderId = (int) ($_GET['id'] ?? 0);

    if ($orderId <= 0) {
        respond(['status' => 'error', 'message' => 'Thiếu mã đơn hàng.'], 422);
    }

    $stmt = $conn->prepare(
        "SELECT o.*, cu.id AS customer_user_id, cu.username AS customer_username, cu.fullname AS customer_fullname,
                cu.phone AS customer_phone, cu.email AS customer_email, cu.company_name AS customer_company_name,
                cu.tax_code AS customer_tax_code, cu.company_address AS customer_company_address
         FROM orders o
         LEFT JOIN users cu ON o.user_id = cu.id
         WHERE o.id = ? AND o.shipper_id = ?
         LIMIT 1"
    );

    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải chi tiết đơn cho nhà cung cấp.'], 500);
    }

    $stmt->bind_param('ii', $orderId, $shipperId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) {
        respond(['status' => 'error', 'message' => 'Đơn hàng không tồn tại hoặc chưa được phân công cho bạn.'], 404);
    }

    $items = [];
    $itemStmt = $conn->prepare(
        "SELECT id, item_name, quantity, weight, length, width, height, declared_value
         FROM order_items
         WHERE order_id = ?
         ORDER BY id ASC"
    );
    if ($itemStmt) {
        $itemStmt->bind_param('i', $orderId);
        $itemStmt->execute();
        $itemResult = $itemStmt->get_result();
        while ($row = $itemResult->fetch_assoc()) {
            $items[] = [
                'id' => (int) $row['id'],
                'item_name' => $row['item_name'],
                'quantity' => (int) $row['quantity'],
                'weight' => format_currency_value($row['weight']),
                'length' => format_currency_value($row['length']),
                'width' => format_currency_value($row['width']),
                'height' => format_currency_value($row['height']),
                'declared_value' => format_currency_value($row['declared_value']),
            ];
        }
        $itemStmt->close();
    }

    $logs = [];
    $logStmt = $conn->prepare(
        "SELECT old_status, new_status, note, created_at
         FROM order_logs
         WHERE order_id = ?
         ORDER BY created_at ASC"
    );
    if ($logStmt) {
        $logStmt->bind_param('i', $orderId);
        $logStmt->execute();
        $logResult = $logStmt->get_result();
        while ($row = $logResult->fetch_assoc()) {
            $logs[] = [
                'old_status' => $row['old_status'],
                'new_status' => $row['new_status'],
                'old_status_label' => get_status_label((string) $row['old_status']),
                'new_status_label' => get_status_label((string) $row['new_status']),
                'note' => $row['note'],
                'created_at' => $row['created_at'],
            ];
        }
        $logStmt->close();
    }

    $serviceMeta = get_order_service_meta($order);
    $feeBreakdown = get_order_fee_breakdown($order);
    $insuranceFee = (float) ($feeBreakdown['insurance_fee'] ?? extract_insurance_fee($order['note'] ?? ''));
    $attachments = collect_public_files(
        get_public_upload_root() . '/order_attachments/' . $order['order_code'],
        '../uploads/order_attachments/' . rawurlencode($order['order_code'])
    );
    $shipperReports = get_shipper_report_media((string) $order['order_code']);
    $stats = get_shipper_kpis($conn, $shipperId);
    $successRate = $stats['total'] > 0 ? round(($stats['completed'] / $stats['total']) * 100, 1) : 0;

    respond([
        'status' => 'success',
        'order' => [
            'id' => (int) $order['id'],
            'order_code' => $order['order_code'],
            'client_order_code' => $order['client_order_code'],
            'service_type' => $order['service_type'],
            'service_label' => get_service_label((string) $order['service_type']),
            'package_type' => $order['package_type'],
            'vehicle_type' => $order['vehicle_type'],
            'pickup_time' => $order['pickup_time'],
            'pickup_address' => $order['pickup_address'],
            'delivery_address' => $order['delivery_address'],
            'receiver_name' => $order['receiver_name'],
            'receiver_phone' => $order['receiver_phone'],
            'sender_name' => $order['name'],
            'sender_phone' => $order['phone'],
            'status' => $order['status'],
            'status_label' => get_status_label((string) $order['status']),
            'shipping_fee' => format_currency_value($order['shipping_fee']),
            'insurance_fee' => $insuranceFee,
            'cod_amount' => format_currency_value($order['cod_amount']),
            'payment_method' => $order['payment_method'],
            'payment_method_label' => get_payment_method_label((string) $order['payment_method']),
            'payment_status' => $order['payment_status'],
            'payment_status_label' => get_payment_status_label((string) $order['payment_status']),
            'payer_label' => get_order_payer_label($order),
            'created_at' => $order['created_at'],
            'note' => $order['note'],
            'clean_note' => clean_order_note($order['note'] ?? ''),
            'service_meta' => $serviceMeta,
            'fee_breakdown' => $feeBreakdown,
            'shipper_note' => $order['shipper_note'],
            'cancel_reason' => $order['cancel_reason'],
            'rating' => $order['rating'] !== null ? (int) $order['rating'] : null,
            'feedback' => $order['feedback'],
            'pod_image' => $order['pod_image'] ? '../uploads/' . ltrim((string) $order['pod_image'], '/') : '',
        ],
        'provider' => [
            'id' => $shipperId,
            'username' => $shipper['username'],
            'fullname' => $shipper['fullname'],
            'phone' => $shipper['phone'],
            'email' => $shipper['email'],
            'vehicle_type' => $shipper['vehicle_type'],
            'joined_at' => $shipper['created_at'],
            'stats' => [
                'total' => $stats['total'],
                'completed' => $stats['completed'],
                'shipping' => $stats['shipping'],
                'success_rate' => $successRate,
            ],
            'attachments' => $attachments,
            'shipper_reports' => $shipperReports,
        ],
        'customer' => [
            'id' => $order['customer_user_id'] ? (int) $order['customer_user_id'] : null,
            'fullname' => $order['customer_fullname'] ?: $order['name'],
            'username' => $order['customer_username'],
            'phone' => $order['customer_phone'] ?: $order['phone'],
            'email' => $order['customer_email'],
            'company_name' => $order['customer_company_name'],
            'tax_code' => $order['customer_tax_code'],
            'company_address' => $order['customer_company_address'],
            'invoice' => [
                'company_name' => $order['company_name'],
                'company_email' => $order['company_email'],
                'company_tax_code' => $order['company_tax_code'],
                'company_address' => $order['company_address'],
                'company_bank_info' => $order['company_bank_info'],
            ],
        ],
        'items' => $items,
        'logs' => $logs,
    ]);
}

function handle_profile(mysqli $conn): void
{
    $user = require_shipper($conn);
    $stats = get_shipper_kpis($conn, (int) $user['id']);
    $successRate = $stats['total'] > 0 ? round(($stats['completed'] / $stats['total']) * 100, 1) : 0;

    respond([
        'status' => 'success',
        'profile' => [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'fullname' => $user['fullname'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'vehicle_type' => $user['vehicle_type'],
            'created_at' => $user['created_at'],
        ],
        'stats' => $stats + ['success_rate' => $successRate],
    ]);
}

function handle_update_profile(mysqli $conn): void
{
    $user = require_shipper($conn);
    $shipperId = (int) $user['id'];

    $fullname = trim((string) ($_POST['fullname'] ?? ''));
    $phone = trim((string) ($_POST['phone'] ?? ''));
    $vehicleType = trim((string) ($_POST['vehicle_type'] ?? ''));

    if ($fullname === '' || $phone === '') {
        respond(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ họ tên và số điện thoại.'], 422);
    }

    if (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        respond(['status' => 'error', 'message' => 'Số điện thoại không hợp lệ.'], 422);
    }

    $stmt = $conn->prepare(
        "UPDATE users
         SET fullname = ?, phone = ?, vehicle_type = ?
         WHERE id = ?"
    );

    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể cập nhật hồ sơ nhà cung cấp.'], 500);
    }

    $stmt->bind_param('sssi', $fullname, $phone, $vehicleType, $shipperId);
    $success = $stmt->execute();
    $stmt->close();

    if (!$success) {
        respond(['status' => 'error', 'message' => 'Cập nhật hồ sơ thất bại.'], 500);
    }

    respond(['status' => 'success', 'message' => 'Đã cập nhật thông tin nhà cung cấp.']);
}

function handle_update_order(mysqli $conn): void
{
    $shipper = require_shipper($conn);
    $shipperId = (int) $shipper['id'];
    $orderId = (int) ($_POST['order_id'] ?? 0);
    $newStatus = trim((string) ($_POST['status'] ?? ''));
    $shipperNote = trim((string) ($_POST['shipper_note'] ?? ''));
    $cancelReason = trim((string) ($_POST['cancel_reason'] ?? ''));
    $allowedStatuses = ['pending', 'shipping', 'completed', 'cancelled', 'decline'];

    if ($orderId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
        respond(['status' => 'error', 'message' => 'Yêu cầu cập nhật đơn hàng không hợp lệ.'], 422);
    }

    $stmt = $conn->prepare(
        "SELECT id, user_id AS customer_user_id, order_code, status
         FROM orders
         WHERE id = ? AND shipper_id = ?
         LIMIT 1"
    );

    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể kiểm tra đơn hàng.'], 500);
    }

    $stmt->bind_param('ii', $orderId, $shipperId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) {
        respond(['status' => 'error', 'message' => 'Đơn hàng không tồn tại hoặc không thuộc nhà cung cấp này.'], 404);
    }

    $savedFiles = save_shipper_report_uploads((string) $order['order_code']);
    $firstImagePath = '';
    foreach ($savedFiles as $file) {
        if (in_array($file['extension'], ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic'], true)) {
            $firstImagePath = $file['relative_path'];
            break;
        }
    }

    $oldStatus = (string) ($order['status'] ?? 'pending');
    if ($newStatus === 'decline') {
        $declineNote = '[Từ chối bởi nhà cung cấp] ' . ($shipperNote !== '' ? $shipperNote : 'Không có ghi chú.');
        $updateStmt = $conn->prepare("UPDATE orders SET status = 'pending', shipper_id = NULL, shipper_note = ? WHERE id = ? AND shipper_id = ?");
        if (!$updateStmt) {
            respond(['status' => 'error', 'message' => 'Không thể trả đơn về hệ thống.'], 500);
        }
        $updateStmt->bind_param('sii', $declineNote, $orderId, $shipperId);
        $ok = $updateStmt->execute();
        $updateStmt->close();

        if (!$ok) {
            respond(['status' => 'error', 'message' => 'Không thể trả đơn về hệ thống.'], 500);
        }

        $logStmt = $conn->prepare("INSERT INTO order_logs (order_id, user_id, old_status, new_status, note) VALUES (?, ?, ?, 'pending', ?)");
        if ($logStmt) {
            $logStmt->bind_param('iiss', $orderId, $shipperId, $oldStatus, $declineNote);
            $logStmt->execute();
            $logStmt->close();
        }

        notify_customer_about_shipper_update($conn, $order, $orderId, 'pending', $shipperNote);

        respond([
            'status' => 'success',
            'message' => 'Đã từ chối đơn và chuyển lại về danh sách chờ phân công.',
            'released' => true,
        ]);
    }

    if ($newStatus === 'cancelled' && $cancelReason === '') {
        respond(['status' => 'error', 'message' => 'Vui lòng nhập lý do hủy đơn.'], 422);
    }

    $podPath = '';
    if ($newStatus === 'completed' && $firstImagePath !== '') {
        $podPath = $firstImagePath;
    }

    $sql = "UPDATE orders SET status = ?, shipper_note = ?, cancel_reason = ?,
            pod_image = CASE WHEN ? <> '' THEN ? ELSE pod_image END
            WHERE id = ? AND shipper_id = ?";
    $updateStmt = $conn->prepare($sql);
    if (!$updateStmt) {
        respond(['status' => 'error', 'message' => 'Không thể cập nhật trạng thái đơn hàng.'], 500);
    }

    $updateStmt->bind_param('sssssii', $newStatus, $shipperNote, $cancelReason, $podPath, $podPath, $orderId, $shipperId);
    $ok = $updateStmt->execute();
    $updateStmt->close();

    if (!$ok) {
        respond(['status' => 'error', 'message' => 'Cập nhật trạng thái đơn hàng thất bại.'], 500);
    }

    $logNoteParts = [];
    if ($shipperNote !== '') {
        $logNoteParts[] = $shipperNote;
    }
    if ($cancelReason !== '') {
        $logNoteParts[] = 'Lý do hủy: ' . $cancelReason;
    }
    if (!empty($savedFiles)) {
        $logNoteParts[] = 'Đã tải lên ' . count($savedFiles) . ' tệp báo cáo.';
    }
    $logNote = implode(' | ', $logNoteParts);

    $logStmt = $conn->prepare("INSERT INTO order_logs (order_id, user_id, old_status, new_status, note) VALUES (?, ?, ?, ?, ?)");
    if ($logStmt) {
        $logStmt->bind_param('iisss', $orderId, $shipperId, $oldStatus, $newStatus, $logNote);
        $logStmt->execute();
        $logStmt->close();
    }

    notify_customer_about_shipper_update($conn, $order, $orderId, $newStatus, $shipperNote);

    respond([
        'status' => 'success',
        'message' => 'Đã cập nhật đơn hàng và lưu báo cáo công việc.',
        'uploaded_files' => $savedFiles,
        'shipper_reports' => get_shipper_report_media((string) $order['order_code']),
    ]);
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

switch ($action) {
    case 'session':
        if ($method !== 'GET') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_session($conn);
        break;

    case 'dashboard':
        if ($method !== 'GET') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_dashboard($conn);
        break;

    case 'orders':
        if ($method !== 'GET') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_orders($conn);
        break;

    case 'order-detail':
        if ($method !== 'GET') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_order_detail($conn);
        break;

    case 'profile':
        if ($method !== 'GET') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_profile($conn);
        break;

    case 'update-profile':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_update_profile($conn);
        break;

    case 'update-order':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_update_order($conn);
        break;

    default:
        respond(['status' => 'error', 'message' => 'Action không hợp lệ.'], 400);
}
