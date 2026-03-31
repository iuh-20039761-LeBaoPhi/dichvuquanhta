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
        "SELECT id, ten_dang_nhap AS username, ho_ten AS fullname, so_dien_thoai AS phone, email, vai_tro AS role, ten_cong_ty AS company_name, ma_so_thue AS tax_code, dia_chi_cong_ty AS company_address, bi_khoa AS is_locked
         FROM nguoi_dung
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

function is_valid_phone(string $phone): bool
{
    return (bool) preg_match('/^0[0-9]{9,10}$/', $phone);
}

function request_value(array $keys, string $default = ''): string
{
    foreach ($keys as $key) {
        if (isset($_POST[$key])) {
            return trim((string) $_POST[$key]);
        }
    }

    return $default;
}

function with_customer_profile_aliases(array $payload): array
{
    return array_merge($payload, [
        'ten_dang_nhap' => $payload['username'] ?? '',
        'ho_ten' => $payload['fullname'] ?? '',
        'so_dien_thoai' => $payload['phone'] ?? '',
        'ten_cong_ty' => $payload['company_name'] ?? '',
        'ma_so_thue' => $payload['tax_code'] ?? '',
        'dia_chi_cong_ty' => $payload['company_address'] ?? '',
    ]);
}

function with_saved_address_aliases(array $payload): array
{
    return array_merge($payload, [
        'dia_chi_id' => (int) ($payload['id'] ?? 0),
        'ten_goi_nho' => $payload['name'] ?? '',
        'so_dien_thoai' => $payload['phone'] ?? '',
        'dia_chi' => $payload['address'] ?? '',
    ]);
}

function can_customer_cancel_order(string $status): bool
{
    return strtolower(trim($status)) === 'pending';
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
        'giao_tieu_chuan' => 'Tiêu chuẩn',
        'giao_nhanh' => 'Nhanh',
        'giao_hoa_toc' => 'Hỏa tốc',
        'giao_ngay_lap_tuc' => 'Giao ngay lập tức',
        'so_luong_lon' => 'Số lượng lớn',
        'quoc_te_tiet_kiem' => 'Quốc tế tiết kiệm',
        'quoc_te_hoa_toc' => 'Quốc tế hỏa tốc',
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

function get_saved_addresses(mysqli $conn, int $userId): array
{
    $items = [];
    $stmt = $conn->prepare(
        "SELECT id, ten_goi_nho AS name, so_dien_thoai AS phone, dia_chi AS address, tao_luc AS created_at
         FROM dia_chi_da_luu
         WHERE nguoi_dung_id = ?
         ORDER BY id DESC"
    );

    if (!$stmt) {
        return $items;
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $items[] = with_saved_address_aliases([
            'id' => (int) $row['id'],
            'name' => $row['name'],
            'phone' => $row['phone'],
            'address' => $row['address'],
            'created_at' => $row['created_at'],
        ]);
    }
    $stmt->close();

    return $items;
}

function add_order_log(mysqli $conn, int $orderId, int $userId, string $oldStatus, string $newStatus, string $note): void
{
    $stmt = $conn->prepare(
        "INSERT INTO nhat_ky_don_hang (don_hang_id, nguoi_dung_id, trang_thai_cu, trang_thai_moi, ghi_chu)
         VALUES (?, ?, ?, ?, ?)"
    );

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iisss', $orderId, $userId, $oldStatus, $newStatus, $note);
    $stmt->execute();
    $stmt->close();
}

function add_notification(mysqli $conn, int $userId, int $orderId, string $message, string $link): void
{
    $stmt = $conn->prepare(
        "INSERT INTO thong_bao (nguoi_dung_id, don_hang_id, noi_dung, duong_dan)
         VALUES (?, ?, ?, ?)"
    );

    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iiss', $userId, $orderId, $message, $link);
    $stmt->execute();
    $stmt->close();
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
        COALESCE(SUM(trang_thai = 'pending'), 0) AS pending_orders,
        COALESCE(SUM(trang_thai = 'shipping'), 0) AS shipping_orders,
        COALESCE(SUM(trang_thai = 'completed'), 0) AS completed_orders,
        COALESCE(SUM(trang_thai = 'cancelled'), 0) AS cancelled_orders,
        COALESCE(SUM(trang_thai_thanh_toan = 'unpaid' AND trang_thai <> 'cancelled'), 0) AS unpaid_orders
        FROM don_hang
        WHERE nguoi_dung_id = ?";

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
        'user' => with_customer_profile_aliases([
            'id' => $userId,
            'username' => $user['username'],
            'fullname' => $user['fullname'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'company_name' => $user['company_name'],
            'tax_code' => $user['tax_code'],
            'company_address' => $user['company_address'],
        ]),
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

    $recentSql = "SELECT id, ma_don_hang AS order_code, ten_nguoi_nhan AS receiver_name, so_dien_thoai_nguoi_nhan AS receiver_phone, dia_chi_giao_hang AS delivery_address, phi_van_chuyen AS shipping_fee, so_tien_cod AS cod_amount, trang_thai AS status, trang_thai_thanh_toan AS payment_status, loai_dich_vu AS service_type, tao_luc AS created_at
                  FROM don_hang
                  WHERE nguoi_dung_id = ?";
    $types = 'i';
    $params = [$userId];
    if ($recentStatus !== 'all') {
        $recentSql .= " AND trang_thai = ?";
        $types .= 's';
        $params[] = $recentStatus;
    }
    $recentSql .= " ORDER BY tao_luc DESC LIMIT 6";

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
            'can_cancel' => can_customer_cancel_order((string) $row['status']),
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

    $where = ["nguoi_dung_id = ?"];
    $params = [$userId];
    $types = 'i';

    if ($search !== '') {
        $where[] = "(ma_don_hang LIKE ? OR ten_nguoi_nhan LIKE ? OR so_dien_thoai_nguoi_nhan LIKE ?)";
        $searchTerm = '%' . $search . '%';
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $params[] = $searchTerm;
        $types .= 'sss';
    }

    if ($status !== '') {
        $where[] = "trang_thai = ?";
        $params[] = $status;
        $types .= 's';
    }

    if ($dateFrom !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateFrom)) {
        respond(['status' => 'error', 'message' => 'Ngày bắt đầu không hợp lệ.'], 422);
    }

    if ($dateTo !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateTo)) {
        respond(['status' => 'error', 'message' => 'Ngày kết thúc không hợp lệ.'], 422);
    }

    if ($dateFrom !== '' && $dateTo !== '' && $dateFrom > $dateTo) {
        respond(['status' => 'error', 'message' => 'Khoảng ngày lọc không hợp lệ.'], 422);
    }

    if ($dateFrom !== '' && $dateTo !== '') {
        $where[] = "DATE(tao_luc) BETWEEN ? AND ?";
        $params[] = $dateFrom;
        $params[] = $dateTo;
        $types .= 'ss';
    } elseif ($dateFrom !== '') {
        $where[] = "DATE(tao_luc) >= ?";
        $params[] = $dateFrom;
        $types .= 's';
    } elseif ($dateTo !== '') {
        $where[] = "DATE(tao_luc) <= ?";
        $params[] = $dateTo;
        $types .= 's';
    }

    $whereSql = implode(' AND ', $where);

    $countSql = "SELECT COUNT(*) AS total FROM don_hang WHERE {$whereSql}";
    $countStmt = $conn->prepare($countSql);
    if (!$countStmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải lịch sử đơn hàng.'], 500);
    }
    bind_statement_params($countStmt, $types, $params);
    $countStmt->execute();
    $totalRecords = (int) (($countStmt->get_result()->fetch_assoc()['total'] ?? 0));
    $countStmt->close();

    $listSql = "SELECT id, ma_don_hang AS order_code, ten_nguoi_nhan AS receiver_name, so_dien_thoai_nguoi_nhan AS receiver_phone, dia_chi_lay_hang AS pickup_address, dia_chi_giao_hang AS delivery_address, phi_van_chuyen AS shipping_fee, so_tien_cod AS cod_amount, trang_thai AS status, trang_thai_thanh_toan AS payment_status, loai_dich_vu AS service_type, tao_luc AS created_at
                FROM don_hang
                WHERE {$whereSql}
                ORDER BY tao_luc DESC
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
            'can_cancel' => can_customer_cancel_order((string) $row['status']),
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
        "SELECT o.id,
                o.ma_don_hang AS order_code,
                o.ma_don_hang_khach AS client_order_code,
                o.loai_dich_vu AS service_type,
                o.loai_goi_hang AS package_type,
                o.loai_phuong_tien AS vehicle_type,
                o.thoi_gian_lay_hang AS pickup_time,
                o.dia_chi_lay_hang AS pickup_address,
                o.dia_chi_giao_hang AS delivery_address,
                o.ten_nguoi_nhan AS receiver_name,
                o.so_dien_thoai_nguoi_nhan AS receiver_phone,
                o.ten_nguoi_gui AS name,
                o.so_dien_thoai_nguoi_gui AS phone,
                o.trang_thai AS status,
                o.phi_van_chuyen AS shipping_fee,
                o.so_tien_cod AS cod_amount,
                o.phuong_thuc_thanh_toan AS payment_method,
                o.trang_thai_thanh_toan AS payment_status,
                o.tao_luc AS created_at,
                o.ghi_chu AS note,
                o.du_lieu_dich_vu_json AS service_meta_json,
                o.chi_tiet_gia_json AS pricing_breakdown_json,
                o.du_lieu_dat_lich_json AS booking_payload_json,
                o.ghi_chu_shipper AS shipper_note,
                o.ly_do_huy AS cancel_reason,
                o.danh_gia_so_sao AS rating,
                o.phan_hoi AS feedback,
                o.anh_xac_nhan_giao_hang AS pod_image,
                o.shipper_id,
                o.la_doanh_nghiep AS is_corporate,
                o.ten_cong_ty AS company_name,
                o.email_cong_ty AS company_email,
                o.ma_so_thue_cong_ty AS company_tax_code,
                o.dia_chi_cong_ty AS company_address,
                o.thong_tin_ngan_hang_cong_ty AS company_bank_info,
                o.quoc_gia_quoc_te AS intl_country,
                o.tinh_bang_quoc_te AS intl_province,
                o.ma_buu_chinh_quoc_te AS intl_postal_code,
                o.so_giay_to_nguoi_nhan AS receiver_id_number,
                o.muc_dich_quoc_te AS intl_purpose,
                o.ma_hs_quoc_te AS intl_hs_code,
                u.ho_ten AS shipper_name,
                u.so_dien_thoai AS shipper_phone,
                u.loai_phuong_tien AS shipper_vehicle
         FROM don_hang o
         LEFT JOIN nguoi_dung u ON o.shipper_id = u.id
         WHERE o.id = ? AND o.nguoi_dung_id = ?
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
        "SELECT id, ten_mat_hang AS item_name, so_luong AS quantity, can_nang AS weight, chieu_dai AS length, chieu_rong AS width, chieu_cao AS height, gia_tri_khai_bao AS declared_value
         FROM don_hang_mat_hang
         WHERE don_hang_id = ?
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
        "SELECT trang_thai_cu AS old_status, trang_thai_moi AS new_status, ghi_chu AS note, tao_luc AS created_at
         FROM nhat_ky_don_hang
         WHERE don_hang_id = ?
         ORDER BY tao_luc ASC"
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
            'can_cancel' => can_customer_cancel_order((string) $order['status']),
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
        'profile' => with_customer_profile_aliases([
            'id' => $userId,
            'username' => $user['username'],
            'fullname' => $user['fullname'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'company_name' => $user['company_name'],
            'tax_code' => $user['tax_code'],
            'company_address' => $user['company_address'],
        ]),
        'stats' => $stats,
        'saved_addresses' => get_saved_addresses($conn, $userId),
    ]);
}

function handle_update_profile(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];

    $fullname = request_value(['ho_ten', 'fullname']);
    $phone = request_value(['so_dien_thoai', 'phone']);
    $companyName = request_value(['ten_cong_ty', 'company_name']);
    $taxCode = request_value(['ma_so_thue', 'tax_code']);
    $companyAddress = request_value(['dia_chi_cong_ty', 'company_address']);

    if ($fullname === '' || $phone === '') {
        respond(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ họ tên và số điện thoại.'], 422);
    }

    if (!is_valid_phone($phone)) {
        respond(['status' => 'error', 'message' => 'Số điện thoại không hợp lệ.'], 422);
    }

    $duplicateStmt = $conn->prepare("SELECT id FROM nguoi_dung WHERE so_dien_thoai = ? AND id <> ? LIMIT 1");
    if ($duplicateStmt) {
        $duplicateStmt->bind_param('si', $phone, $userId);
        $duplicateStmt->execute();
        $duplicate = $duplicateStmt->get_result()->fetch_assoc();
        $duplicateStmt->close();

        if ($duplicate) {
            respond(['status' => 'error', 'message' => 'Số điện thoại này đã được sử dụng bởi tài khoản khác.'], 422);
        }
    }

    $stmt = $conn->prepare(
        "UPDATE nguoi_dung
         SET ho_ten = ?, so_dien_thoai = ?, ten_cong_ty = ?, ma_so_thue = ?, dia_chi_cong_ty = ?
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

function handle_change_password(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];

    $currentPassword = request_value(['mat_khau_hien_tai', 'current_password']);
    $newPassword = request_value(['mat_khau_moi', 'new_password']);
    $confirmPassword = request_value(['xac_nhan_mat_khau_moi', 'confirm_password']);

    if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
        respond(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ thông tin đổi mật khẩu.'], 422);
    }

    if (strlen($newPassword) < 8) {
        respond(['status' => 'error', 'message' => 'Mật khẩu mới phải có ít nhất 8 ký tự.'], 422);
    }

    if ($newPassword !== $confirmPassword) {
        respond(['status' => 'error', 'message' => 'Xác nhận mật khẩu mới không khớp.'], 422);
    }

    $stmt = $conn->prepare("SELECT mat_khau AS password FROM nguoi_dung WHERE id = ? LIMIT 1");
    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể kiểm tra mật khẩu hiện tại.'], 500);
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || !password_verify($currentPassword, (string) ($row['password'] ?? ''))) {
        respond(['status' => 'error', 'message' => 'Mật khẩu hiện tại không chính xác.'], 422);
    }

    if (password_verify($newPassword, (string) ($row['password'] ?? ''))) {
        respond(['status' => 'error', 'message' => 'Mật khẩu mới phải khác mật khẩu hiện tại.'], 422);
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateStmt = $conn->prepare("UPDATE nguoi_dung SET mat_khau = ? WHERE id = ?");
    if (!$updateStmt) {
        respond(['status' => 'error', 'message' => 'Không thể cập nhật mật khẩu.'], 500);
    }

    $updateStmt->bind_param('si', $newHash, $userId);
    $success = $updateStmt->execute();
    $updateStmt->close();

    if (!$success) {
        respond(['status' => 'error', 'message' => 'Đổi mật khẩu thất bại.'], 500);
    }

    respond(['status' => 'success', 'message' => 'Đã cập nhật mật khẩu thành công.']);
}

function handle_save_address(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];

    $addressId = (int) ($_POST['dia_chi_id'] ?? ($_POST['address_id'] ?? 0));
    $name = request_value(['ten_goi_nho', 'name']);
    $phone = request_value(['so_dien_thoai', 'phone']);
    $address = request_value(['dia_chi', 'address']);

    if ($name === '' || $phone === '' || $address === '') {
        respond(['status' => 'error', 'message' => 'Vui lòng nhập đủ tên gợi nhớ, số điện thoại và địa chỉ.'], 422);
    }

    if (!is_valid_phone($phone)) {
        respond(['status' => 'error', 'message' => 'Số điện thoại địa chỉ lưu không hợp lệ.'], 422);
    }

    if ($addressId > 0) {
        $checkStmt = $conn->prepare("SELECT id FROM dia_chi_da_luu WHERE id = ? AND nguoi_dung_id = ? LIMIT 1");
        if (!$checkStmt) {
            respond(['status' => 'error', 'message' => 'Không thể kiểm tra địa chỉ cần cập nhật.'], 500);
        }
        $checkStmt->bind_param('ii', $addressId, $userId);
        $checkStmt->execute();
        $exists = $checkStmt->get_result()->fetch_assoc();
        $checkStmt->close();

        if (!$exists) {
            respond(['status' => 'error', 'message' => 'Địa chỉ đã lưu không tồn tại.'], 404);
        }

        $stmt = $conn->prepare(
            "UPDATE dia_chi_da_luu
             SET ten_goi_nho = ?, so_dien_thoai = ?, dia_chi = ?
             WHERE id = ? AND nguoi_dung_id = ?"
        );
        if (!$stmt) {
            respond(['status' => 'error', 'message' => 'Không thể cập nhật địa chỉ đã lưu.'], 500);
        }
        $stmt->bind_param('sssii', $name, $phone, $address, $addressId, $userId);
        $success = $stmt->execute();
        $stmt->close();

        if (!$success) {
            respond(['status' => 'error', 'message' => 'Cập nhật địa chỉ thất bại.'], 500);
        }

        respond([
            'status' => 'success',
            'message' => 'Đã cập nhật địa chỉ đã lưu.',
            'saved_addresses' => get_saved_addresses($conn, $userId),
        ]);
    }

    $stmt = $conn->prepare(
        "INSERT INTO dia_chi_da_luu (nguoi_dung_id, ten_goi_nho, so_dien_thoai, dia_chi)
         VALUES (?, ?, ?, ?)"
    );
    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể lưu địa chỉ mới.'], 500);
    }

    $stmt->bind_param('isss', $userId, $name, $phone, $address);
    $success = $stmt->execute();
    $stmt->close();

    if (!$success) {
        respond(['status' => 'error', 'message' => 'Lưu địa chỉ thất bại.'], 500);
    }

    respond([
        'status' => 'success',
        'message' => 'Đã thêm địa chỉ đã lưu.',
        'saved_addresses' => get_saved_addresses($conn, $userId),
    ]);
}

function handle_delete_address(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];
    $addressId = (int) ($_POST['dia_chi_id'] ?? ($_POST['address_id'] ?? 0));

    if ($addressId <= 0) {
        respond(['status' => 'error', 'message' => 'Thiếu địa chỉ cần xóa.'], 422);
    }

    $stmt = $conn->prepare("DELETE FROM dia_chi_da_luu WHERE id = ? AND nguoi_dung_id = ?");
    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể xóa địa chỉ đã lưu.'], 500);
    }

    $stmt->bind_param('ii', $addressId, $userId);
    $stmt->execute();
    $affected = $stmt->affected_rows;
    $stmt->close();

    if ($affected <= 0) {
        respond(['status' => 'error', 'message' => 'Địa chỉ không tồn tại hoặc bạn không có quyền xóa.'], 404);
    }

    respond([
        'status' => 'success',
        'message' => 'Đã xóa địa chỉ đã lưu.',
        'saved_addresses' => get_saved_addresses($conn, $userId),
    ]);
}

function handle_cancel_order(mysqli $conn): void
{
    $user = require_customer($conn);
    $userId = (int) $user['id'];
    $orderId = (int) ($_POST['order_id'] ?? 0);
    $reason = trim((string) ($_POST['reason'] ?? ''));

    if ($orderId <= 0) {
        respond(['status' => 'error', 'message' => 'Thiếu đơn hàng cần hủy.'], 422);
    }

    $stmt = $conn->prepare(
        "SELECT id, ma_don_hang AS order_code, trang_thai AS status
         FROM don_hang
         WHERE id = ? AND nguoi_dung_id = ?
         LIMIT 1"
    );
    if (!$stmt) {
        respond(['status' => 'error', 'message' => 'Không thể kiểm tra đơn hàng cần hủy.'], 500);
    }

    $stmt->bind_param('ii', $orderId, $userId);
    $stmt->execute();
    $order = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$order) {
        respond(['status' => 'error', 'message' => 'Đơn hàng không tồn tại hoặc bạn không có quyền thao tác.'], 404);
    }

    if (!can_customer_cancel_order((string) $order['status'])) {
        respond(['status' => 'error', 'message' => 'Chỉ có thể hủy đơn đang ở trạng thái chờ xử lý.'], 422);
    }

    if ($reason === '') {
        $reason = 'Khách hàng chủ động hủy đơn.';
    }

    try {
        $conn->begin_transaction();

        $updateStmt = $conn->prepare(
            "UPDATE don_hang
             SET trang_thai = 'cancelled', ly_do_huy = ?
             WHERE id = ? AND nguoi_dung_id = ?"
        );
        if (!$updateStmt) {
            throw new Exception('Không thể cập nhật trạng thái đơn hàng.');
        }
        $updateStmt->bind_param('sii', $reason, $orderId, $userId);
        $updateStmt->execute();
        $affected = $updateStmt->affected_rows;
        $updateStmt->close();

        if ($affected <= 0) {
            throw new Exception('Đơn hàng không còn khả năng hủy.');
        }

        add_order_log($conn, $orderId, $userId, (string) $order['status'], 'cancelled', $reason);
        add_notification(
            $conn,
            $userId,
            $orderId,
            'Đơn hàng ' . $order['order_code'] . ' đã được hủy.',
            'khach-hang/chi-tiet-don-hang.html?id=' . $orderId
        );

        $conn->commit();
    } catch (Throwable $exception) {
        $conn->rollback();
        respond(['status' => 'error', 'message' => $exception->getMessage()], 500);
    }

    respond(['status' => 'success', 'message' => 'Đã hủy đơn hàng thành công.']);
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

    $stmt = $conn->prepare("SELECT ma_don_hang AS order_code, trang_thai AS status FROM don_hang WHERE id = ? AND nguoi_dung_id = ? LIMIT 1");
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

    if ((string) ($order['status'] ?? '') !== 'completed') {
        respond(['status' => 'error', 'message' => 'Chỉ có thể gửi phản hồi khi đơn hàng đã hoàn tất.'], 422);
    }

    $updateStmt = $conn->prepare("UPDATE don_hang SET danh_gia_so_sao = ?, phan_hoi = ? WHERE id = ? AND nguoi_dung_id = ?");
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

    case 'change-password':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_change_password($conn);
        break;

    case 'save-address':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_save_address($conn);
        break;

    case 'delete-address':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_delete_address($conn);
        break;

    case 'cancel-order':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_cancel_order($conn);
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
