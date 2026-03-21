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

function require_customer(mysqli $conn): array
{
    if (!isset($_SESSION['user_id'])) {
        respond([
            'status' => 'error',
            'message' => 'Phiên đăng nhập đã hết hạn.',
        ], 401);
    }

    $userId = (int) $_SESSION['user_id'];
    $stmt = $conn->prepare(
        "SELECT id, username, fullname, phone, email, role, company_name, tax_code, company_address, is_locked
         FROM users
         WHERE id = ?
         LIMIT 1"
    );

    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể kiểm tra người dùng.'], 500);
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        respond(['status' => 'error', 'message' => 'Người dùng không tồn tại.'], 401);
    }

    if ((int) ($user['is_locked'] ?? 0) === 1) {
        respond(['status' => 'error', 'message' => 'Tài khoản đã bị khóa.'], 403);
    }

    if (($user['role'] ?? '') !== 'customer') {
        respond(['status' => 'error', 'message' => 'Bạn không có quyền truy cập khu vực khách hàng.'], 403);
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

function clean_order_note(?string $note): string
{
    $cleanNote = (string) $note;
    $cleanNote = preg_replace('/--- CHI TIẾT HÀNG HÓA ---\n(.*?)(?=\n---|\n💎|\n Người trả cước|$)/s', '', $cleanNote);
    $cleanNote = preg_replace('/💎 Bảo hiểm hàng hóa: .*/u', '', $cleanNote);
    $cleanNote = preg_replace('/Người trả cước: .*/u', '', $cleanNote);
    $cleanNote = preg_replace('/Tệp đính kèm: .*/u', '', $cleanNote);
    $cleanNote = str_replace(['--- CHI TIẾT HÀNG HÓA ---', '---'], '', $cleanNote);
    return trim($cleanNote);
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

    if (preg_match('/💎 Bảo hiểm hàng hóa: ([\d\.,]+)/u', $note, $matches)) {
        return (float) str_replace(['.', ','], '', $matches[1]);
    }

    return 0;
}

function extract_payer_label(?string $note): string
{
    if ($note && preg_match('/Người trả cước: (.*)/u', $note, $matches)) {
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

function get_public_upload_root(): string
{
    return dirname(__DIR__, 2) . '/public/uploads';
}

function get_feedback_media_for_order(string $orderCode): array
{
    $feedbackDir = get_public_upload_root() . '/customer-feedback/' . $orderCode;
    return collect_public_files(
        $feedbackDir,
        '../uploads/customer-feedback/' . rawurlencode($orderCode)
    );
}

function get_customer_kpis(mysqli $conn, int $userId): array
{
    $stats = [
        'total' => 0,
        'pending' => 0,
        'shipping' => 0,
        'completed' => 0,
        'cancelled' => 0,
        'unpaid' => 0,
    ];

    $statsSql = "SELECT
        COUNT(*) AS total_orders,
        COALESCE(SUM(status = 'pending'), 0) AS pending_orders,
        COALESCE(SUM(status = 'shipping'), 0) AS shipping_orders,
        COALESCE(SUM(status = 'completed'), 0) AS completed_orders,
        COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_orders,
        COALESCE(SUM(payment_status = 'unpaid' AND status <> 'cancelled'), 0) AS unpaid_orders
        FROM orders
        WHERE user_id = ?";

    $stmt = $conn->prepare($statsSql);
    if ($stmt) {
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        $stats['total'] = (int) ($row['total_orders'] ?? 0);
        $stats['pending'] = (int) ($row['pending_orders'] ?? 0);
        $stats['shipping'] = (int) ($row['shipping_orders'] ?? 0);
        $stats['completed'] = (int) ($row['completed_orders'] ?? 0);
        $stats['cancelled'] = (int) ($row['cancelled_orders'] ?? 0);
        $stats['unpaid'] = (int) ($row['unpaid_orders'] ?? 0);
    }

    return $stats;
}

function handle_session(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];
    $stats = get_customer_kpis($conn, $userId);

    respond([
        'status' => 'success',
        'user' => [
            'id' => $userId,
            'username' => $user['username'],
            'fullname' => $user['fullname'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'company_name' => $user['company_name'],
            'tax_code' => $user['tax_code'],
            'company_address' => $user['company_address'],
        ],
        'meta' => [
            'order_total' => $stats['total'],
        ],
    ]);
}

function handle_dashboard(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];
    $recentStatus = $_GET['recent_status'] ?? 'all';
    $allowedFilters = ['all', 'pending', 'shipping', 'completed', 'cancelled'];
    if (!in_array($recentStatus, $allowedFilters, true)) {
        $recentStatus = 'all';
    }

    $stats = get_customer_kpis($conn, $userId);

    $recentSql = "SELECT id, order_code, receiver_name, receiver_phone, delivery_address, shipping_fee, cod_amount, status, payment_status, service_type, created_at
                  FROM orders
                  WHERE user_id = ?";
    $types = 'i';
    $params = [$userId];
    if ($recentStatus !== 'all') {
        $recentSql .= " AND status = ?";
        $types .= 's';
        $params[] = $recentStatus;
    }
    $recentSql .= " ORDER BY created_at DESC LIMIT 6";

    $stmt = $conn->prepare($recentSql);
    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải dashboard khách hàng.'], 500);
    }

    bind_statement_params($stmt, $types, $params);
    $stmt->execute();
    $result = $stmt->get_result();
    $recentOrders = [];
    while ($row = $result->fetch_assoc()) {
        $recentOrders[] = [
            'id' => (int) $row['id'],
            'order_code' => $row['order_code'],
            'receiver_name' => $row['receiver_name'],
            'receiver_phone' => $row['receiver_phone'],
            'delivery_address' => $row['delivery_address'],
            'shipping_fee' => format_currency_value($row['shipping_fee']),
            'cod_amount' => format_currency_value($row['cod_amount']),
            'status' => $row['status'],
            'status_label' => get_status_label($row['status']),
            'payment_status' => $row['payment_status'],
            'payment_status_label' => get_payment_status_label($row['payment_status']),
            'service_type' => $row['service_type'],
            'service_label' => get_service_label($row['service_type']),
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
    $user = require_customer($conn);
    $userId = (int) $user['id'];

    $search = trim((string) ($_GET['search'] ?? ''));
    $status = trim((string) ($_GET['status'] ?? ''));
    $dateFrom = trim((string) ($_GET['date_from'] ?? ''));
    $dateTo = trim((string) ($_GET['date_to'] ?? ''));
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $limit = min(20, max(1, (int) ($_GET['limit'] ?? 10)));
    $offset = ($page - 1) * $limit;

    $where = ["user_id = ?"];
    $params = [$userId];
    $types = 'i';

    if ($search !== '') {
        $where[] = "(order_code LIKE ? OR receiver_name LIKE ? OR receiver_phone LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'sss';
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

    $countSql = "SELECT COUNT(*) AS total FROM orders WHERE {$whereSql}";
    $countStmt = $conn->prepare($countSql);
    if (!$countStmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải lịch sử đơn hàng.'], 500);
    }
    bind_statement_params($countStmt, $types, $params);
    $countStmt->execute();
    $totalRecords = (int) (($countStmt->get_result()->fetch_assoc()['total'] ?? 0));
    $countStmt->close();

    $listSql = "SELECT id, order_code, receiver_name, receiver_phone, pickup_address, delivery_address, shipping_fee, cod_amount, status, payment_status, service_type, created_at
                FROM orders
                WHERE {$whereSql}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?";
    $listStmt = $conn->prepare($listSql);
    if (!$listStmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải danh sách đơn hàng.'], 500);
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
            'receiver_name' => $row['receiver_name'],
            'receiver_phone' => $row['receiver_phone'],
            'pickup_address' => $row['pickup_address'],
            'delivery_address' => $row['delivery_address'],
            'shipping_fee' => format_currency_value($row['shipping_fee']),
            'cod_amount' => format_currency_value($row['cod_amount']),
            'status' => $row['status'],
            'status_label' => get_status_label($row['status']),
            'payment_status' => $row['payment_status'],
            'payment_status_label' => get_payment_status_label($row['payment_status']),
            'service_type' => $row['service_type'],
            'service_label' => get_service_label($row['service_type']),
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
    $user = require_customer($conn);
    $userId = (int) $user['id'];
    $orderId = (int) ($_GET['id'] ?? 0);

    if ($orderId <= 0) {
        respond(['status' => 'error', 'message' => 'Thiếu mã đơn hàng.'], 422);
    }

    $stmt = $conn->prepare(
        "SELECT o.*, u.fullname AS shipper_name, u.phone AS shipper_phone, u.vehicle_type AS shipper_vehicle
         FROM orders o
         LEFT JOIN users u ON o.shipper_id = u.id
         WHERE o.id = ? AND o.user_id = ?
         LIMIT 1"
    );

    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải chi tiết đơn hàng.'], 500);
    }

    $stmt->bind_param('ii', $orderId, $userId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) {
        respond(['status' => 'error', 'message' => 'Đơn hàng không tồn tại hoặc bạn không có quyền xem.'], 404);
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
    $attachmentDir = get_public_upload_root() . '/order_attachments/' . $order['order_code'];

    $attachments = collect_public_files(
        $attachmentDir,
        '../uploads/order_attachments/' . rawurlencode($order['order_code'])
    );
    $shipperReports = collect_public_files(
        get_public_upload_root() . '/shipper_reports/' . $order['order_code'],
        '../uploads/shipper_reports/' . rawurlencode($order['order_code'])
    );
    $feedbackMedia = get_feedback_media_for_order((string) $order['order_code']);

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
            'shipper_id' => $order['shipper_id'] ? (int) $order['shipper_id'] : null,
            'shipper_name' => $order['shipper_name'],
            'shipper_phone' => $order['shipper_phone'],
            'shipper_vehicle' => $order['shipper_vehicle'],
            'attachments' => $attachments,
            'shipper_reports' => $shipperReports,
            'feedback_media' => $feedbackMedia,
        ],
        'customer' => [
            'fullname' => $user['fullname'],
            'username' => $user['username'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'company_name' => $user['company_name'],
            'tax_code' => $user['tax_code'],
            'company_address' => $user['company_address'],
            'is_corporate' => (int) ($order['is_corporate'] ?? 0) === 1,
            'invoice' => [
                'company_name' => $order['company_name'],
                'company_email' => $order['company_email'],
                'company_tax_code' => $order['company_tax_code'],
                'company_address' => $order['company_address'],
                'company_bank_info' => $order['company_bank_info'],
            ],
        ],
        'international' => [
            'country' => $order['intl_country'],
            'province' => $order['intl_province'],
            'postal_code' => $order['intl_postal_code'],
            'receiver_id_number' => $order['receiver_id_number'],
            'purpose' => $order['intl_purpose'],
            'hs_code' => $order['intl_hs_code'],
        ],
        'items' => $items,
        'logs' => $logs,
    ]);
}

function handle_profile(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];
    $stats = get_customer_kpis($conn, $userId);

    respond([
        'status' => 'success',
        'profile' => [
            'id' => $userId,
            'username' => $user['username'],
            'fullname' => $user['fullname'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'company_name' => $user['company_name'],
            'tax_code' => $user['tax_code'],
            'company_address' => $user['company_address'],
        ],
        'stats' => $stats,
    ]);
}

function handle_update_profile(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];

    $fullname = trim((string) ($_POST['fullname'] ?? ''));
    $phone = trim((string) ($_POST['phone'] ?? ''));
    $companyName = trim((string) ($_POST['company_name'] ?? ''));
    $taxCode = trim((string) ($_POST['tax_code'] ?? ''));
    $companyAddress = trim((string) ($_POST['company_address'] ?? ''));

    if ($fullname === '' || $phone === '') {
        respond(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ họ tên và số điện thoại.'], 422);
    }

    if (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        respond(['status' => 'error', 'message' => 'Số điện thoại không hợp lệ.'], 422);
    }

    $stmt = $conn->prepare(
        "UPDATE users
         SET fullname = ?, phone = ?, company_name = ?, tax_code = ?, company_address = ?
         WHERE id = ?"
    );

    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể cập nhật hồ sơ.'], 500);
    }

    $stmt->bind_param('sssssi', $fullname, $phone, $companyName, $taxCode, $companyAddress, $userId);
    $success = $stmt->execute();
    $stmt->close();

    if (!$success) {
        respond(['status' => 'error', 'message' => 'Cập nhật hồ sơ thất bại.'], 500);
    }

    respond(['status' => 'success', 'message' => 'Đã cập nhật thông tin cá nhân.']);
}

function handle_submit_feedback(mysqli $conn): void
{
    require_customer($conn);
    $userId = (int) $_SESSION['user_id'];
    $orderId = (int) ($_POST['order_id'] ?? 0);
    $rating = (int) ($_POST['rating'] ?? 0);
    $feedback = trim((string) ($_POST['feedback'] ?? ''));

    if ($orderId <= 0) {
        respond(['status' => 'error', 'message' => 'Thiếu mã đơn hàng để phản hồi.'], 422);
    }

    if ($rating < 1 || $rating > 5) {
        respond(['status' => 'error', 'message' => 'Vui lòng chọn mức đánh giá từ 1 đến 5 sao.'], 422);
    }

    $stmt = $conn->prepare("SELECT order_code FROM orders WHERE id = ? AND user_id = ? LIMIT 1");
    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể kiểm tra đơn hàng phản hồi.'], 500);
    }

    $stmt->bind_param('ii', $orderId, $userId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) {
        respond(['status' => 'error', 'message' => 'Đơn hàng không hợp lệ.'], 404);
    }

    $updateStmt = $conn->prepare("UPDATE orders SET rating = ?, feedback = ? WHERE id = ? AND user_id = ?");
    if (!$updateStmt) {
        respond(['status' => 'error', 'message' => 'Không thể lưu phản hồi.'], 500);
    }
    $updateStmt->bind_param('isii', $rating, $feedback, $orderId, $userId);
    $ok = $updateStmt->execute();
    $updateStmt->close();

    if (!$ok) {
        respond(['status' => 'error', 'message' => 'Lưu phản hồi thất bại.'], 500);
    }

    $savedFiles = [];
    if (!empty($_FILES['media_files']) && is_array($_FILES['media_files']['name'])) {
        $targetDir = get_public_upload_root() . '/customer-feedback/' . $order['order_code'];
        if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
            respond(['status' => 'error', 'message' => 'Không thể tạo thư mục lưu phản hồi.'], 500);
        }

        $fileCount = count($_FILES['media_files']['name']);
        $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;

        for ($index = 0; $index < $fileCount; $index++) {
            if (($_FILES['media_files']['error'][$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                continue;
            }

            $tmpName = $_FILES['media_files']['tmp_name'][$index];
            $originalName = basename((string) $_FILES['media_files']['name'][$index]);
            $mimeType = $finfo ? (string) finfo_file($finfo, $tmpName) : '';

            if ($mimeType !== '' && strpos($mimeType, 'image/') !== 0 && strpos($mimeType, 'video/') !== 0) {
                continue;
            }

            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $safeName = 'feedback-' . date('Ymd-His') . '-' . $index . ($extension ? '.' . $extension : '');
            $destination = $targetDir . DIRECTORY_SEPARATOR . $safeName;

            if (move_uploaded_file($tmpName, $destination)) {
                $savedFiles[] = [
                    'name' => $safeName,
                    'url' => '../uploads/customer-feedback/' . rawurlencode($order['order_code']) . '/' . rawurlencode($safeName),
                ];
            }
        }

        if ($finfo) {
            finfo_close($finfo);
        }
    }

    respond([
        'status' => 'success',
        'message' => 'Đã gửi phản hồi dịch vụ.',
        'files' => $savedFiles,
        'feedback_media' => get_feedback_media_for_order((string) $order['order_code']),
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

    case 'submit-feedback':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_submit_feedback($conn);
        break;

    default:
        respond(['status' => 'error', 'message' => 'Action không hợp lệ.'], 400);
}
