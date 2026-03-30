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
        "SELECT id, ten_dang_nhap AS username, ho_ten AS fullname, so_dien_thoai AS phone, email, vai_tro AS role, loai_phuong_tien AS vehicle_type, bi_khoa AS is_locked, da_duyet AS is_approved, tao_luc AS created_at
         FROM nguoi_dung
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

function request_value(array $keys, string $default = ''): string
{
    foreach ($keys as $key) {
        if (isset($_POST[$key])) {
            return trim((string) $_POST[$key]);
        }
    }

    return $default;
}

function with_shipper_profile_aliases(array $payload): array
{
    return array_merge($payload, [
        'ten_dang_nhap' => $payload['username'] ?? '',
        'ho_ten' => $payload['fullname'] ?? '',
        'so_dien_thoai' => $payload['phone'] ?? '',
        'loai_phuong_tien' => $payload['vehicle_type'] ?? '',
    ]);
}

function is_valid_phone(string $phone): bool
{
    return (bool) preg_match('/^0[0-9]{9,10}$/', $phone);
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
            COALESCE(SUM(trang_thai = 'pending'), 0) AS pending_orders,
            COALESCE(SUM(trang_thai = 'shipping'), 0) AS shipping_orders,
            COALESCE(SUM(trang_thai = 'completed'), 0) AS completed_orders,
            COALESCE(SUM(trang_thai = 'cancelled'), 0) AS cancelled_orders,
            COALESCE(SUM(CASE WHEN trang_thai = 'completed' THEN phi_van_chuyen ELSE 0 END), 0) AS revenue_total,
            COALESCE(SUM(DATE(tao_luc) = CURDATE()), 0) AS today_orders,
            COALESCE(SUM(trang_thai = 'completed' AND DATE(tao_luc) = CURDATE()), 0) AS today_completed_orders
         FROM don_hang
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
    $stmt = $conn->prepare("INSERT INTO thong_bao (nguoi_dung_id, don_hang_id, noi_dung, duong_dan) VALUES (?, ?, ?, ?)");
    if (!$stmt) {
        return;
    }

    $stmt->bind_param('iiss', $customerId, $orderId, $message, $link);
    $stmt->execute();
    $stmt->close();
}

function get_allowed_shipper_status_transitions(string $currentStatus): array
{
    $normalized = strtolower(trim($currentStatus));
    $map = [
        'pending' => ['pending', 'shipping', 'cancelled', 'decline'],
        'shipping' => ['shipping', 'completed', 'cancelled'],
        'completed' => ['completed'],
        'cancelled' => ['cancelled'],
    ];

    return $map[$normalized] ?? [$normalized];
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
        $where[] = "trang_thai IN ('pending', 'shipping')";
    } elseif ($recentStatus !== 'all') {
        $where[] = "trang_thai = ?";
        $params[] = $recentStatus;
        $types .= 's';
    }

    $sql = "SELECT id, ma_don_hang AS order_code, dia_chi_lay_hang AS pickup_address, dia_chi_giao_hang AS delivery_address, ten_nguoi_nhan AS receiver_name, phi_van_chuyen AS shipping_fee, so_tien_cod AS cod_amount, trang_thai AS status, trang_thai_thanh_toan AS payment_status, loai_dich_vu AS service_type, tao_luc AS created_at
            FROM don_hang
            WHERE " . implode(' AND ', $where) . "
            ORDER BY tao_luc DESC
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
        $where[] = "(ma_don_hang LIKE ? OR ten_nguoi_gui LIKE ? OR ten_nguoi_nhan LIKE ? OR dia_chi_lay_hang LIKE ? OR dia_chi_giao_hang LIKE ?)";
        array_push($params, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm);
        $types .= 'sssss';
    }

    if ($status !== '') {
        $where[] = "trang_thai = ?";
        $params[] = $status;
        $types .= 's';
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

    $countStmt = $conn->prepare("SELECT COUNT(*) AS total FROM don_hang WHERE {$whereSql}");
    if (!$countStmt) {
        respond(['status' => 'error', 'message' => 'Không thể tải danh sách đơn hàng.'], 500);
    }
    bind_statement_params($countStmt, $types, $params);
    $countStmt->execute();
    $totalRecords = (int) (($countStmt->get_result()->fetch_assoc()['total'] ?? 0));
    $countStmt->close();

    $listSql = "SELECT id, ma_don_hang AS order_code, ten_nguoi_gui AS name, dia_chi_lay_hang AS pickup_address, dia_chi_giao_hang AS delivery_address, ten_nguoi_nhan AS receiver_name, so_dien_thoai_nguoi_nhan AS receiver_phone, phi_van_chuyen AS shipping_fee, so_tien_cod AS cod_amount, trang_thai AS status, trang_thai_thanh_toan AS payment_status, loai_dich_vu AS service_type, tao_luc AS created_at
                FROM don_hang
                WHERE {$whereSql}
                ORDER BY tao_luc DESC
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
                o.ten_cong_ty AS company_name,
                o.email_cong_ty AS company_email,
                o.ma_so_thue_cong_ty AS company_tax_code,
                o.dia_chi_cong_ty AS company_address,
                o.thong_tin_ngan_hang_cong_ty AS company_bank_info,
                cu.id AS customer_user_id,
                cu.ten_dang_nhap AS customer_username,
                cu.ho_ten AS customer_fullname,
                cu.so_dien_thoai AS customer_phone,
                cu.email AS customer_email,
                cu.ten_cong_ty AS customer_company_name,
                cu.ma_so_thue AS customer_tax_code,
                cu.dia_chi_cong_ty AS customer_company_address
         FROM don_hang o
         LEFT JOIN nguoi_dung cu ON o.nguoi_dung_id = cu.id
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
        'profile' => with_shipper_profile_aliases([
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'fullname' => $user['fullname'],
            'phone' => $user['phone'],
            'email' => $user['email'],
            'vehicle_type' => $user['vehicle_type'],
            'created_at' => $user['created_at'],
        ]),
        'stats' => $stats + ['success_rate' => $successRate],
    ]);
}

function handle_update_profile(mysqli $conn): void
{
    $user = require_shipper($conn);
    $shipperId = (int) $user['id'];

    $fullname = request_value(['ho_ten', 'fullname']);
    $phone = request_value(['so_dien_thoai', 'phone']);
    $vehicleType = request_value(['loai_phuong_tien', 'vehicle_type']);

    if ($fullname === '' || $phone === '') {
        respond(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ họ tên và số điện thoại.'], 422);
    }

    if (!is_valid_phone($phone)) {
        respond(['status' => 'error', 'message' => 'Số điện thoại không hợp lệ.'], 422);
    }

    $duplicateStmt = $conn->prepare("SELECT id FROM nguoi_dung WHERE so_dien_thoai = ? AND id <> ? LIMIT 1");
    if ($duplicateStmt) {
        $duplicateStmt->bind_param('si', $phone, $shipperId);
        $duplicateStmt->execute();
        $duplicate = $duplicateStmt->get_result()->fetch_assoc();
        $duplicateStmt->close();

        if ($duplicate) {
            respond(['status' => 'error', 'message' => 'Số điện thoại này đã được sử dụng bởi tài khoản khác.'], 422);
        }
    }

    $stmt = $conn->prepare(
        "UPDATE nguoi_dung
         SET ho_ten = ?, so_dien_thoai = ?, loai_phuong_tien = ?
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

function handle_change_password(mysqli $conn): void
{
    $shipper = require_shipper($conn);
    $shipperId = (int) $shipper['id'];

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

    $stmt->bind_param('i', $shipperId);
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

    $updateStmt->bind_param('si', $newHash, $shipperId);
    $success = $updateStmt->execute();
    $updateStmt->close();

    if (!$success) {
        respond(['status' => 'error', 'message' => 'Đổi mật khẩu thất bại.'], 500);
    }

    respond(['status' => 'success', 'message' => 'Đã cập nhật mật khẩu thành công.']);
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
        "SELECT id, nguoi_dung_id AS customer_user_id, ma_don_hang AS order_code, trang_thai AS status, anh_xac_nhan_giao_hang AS pod_image
         FROM don_hang
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
    $allowedTransitions = get_allowed_shipper_status_transitions($oldStatus);
    if (!in_array($newStatus, $allowedTransitions, true)) {
        respond([
            'status' => 'error',
            'message' => 'Không thể chuyển trạng thái từ "' . get_status_label($oldStatus) . '" sang "' . ($newStatus === 'decline' ? 'Từ chối / trả đơn' : get_status_label($newStatus)) . '".',
        ], 422);
    }

    if ($newStatus === 'decline') {
        $declineNote = '[Từ chối bởi nhà cung cấp] ' . ($shipperNote !== '' ? $shipperNote : 'Không có ghi chú.');
        $updateStmt = $conn->prepare("UPDATE don_hang SET trang_thai = 'pending', shipper_id = NULL, ghi_chu_shipper = ? WHERE id = ? AND shipper_id = ?");
        if (!$updateStmt) {
            respond(['status' => 'error', 'message' => 'Không thể trả đơn về hệ thống.'], 500);
        }
        $updateStmt->bind_param('sii', $declineNote, $orderId, $shipperId);
        $ok = $updateStmt->execute();
        $updateStmt->close();

        if (!$ok) {
            respond(['status' => 'error', 'message' => 'Không thể trả đơn về hệ thống.'], 500);
        }

        $logStmt = $conn->prepare("INSERT INTO nhat_ky_don_hang (don_hang_id, nguoi_dung_id, trang_thai_cu, trang_thai_moi, ghi_chu) VALUES (?, ?, ?, 'pending', ?)");
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

    if (
        $newStatus === 'completed'
        && $oldStatus !== 'completed'
        && $firstImagePath === ''
        && trim((string) ($order['pod_image'] ?? '')) === ''
    ) {
        respond([
            'status' => 'error',
            'message' => 'Cần tải lên ít nhất 1 ảnh bằng chứng giao hàng trước khi hoàn tất đơn.',
        ], 422);
    }

    $podPath = '';
    if ($newStatus === 'completed' && $firstImagePath !== '') {
        $podPath = $firstImagePath;
    }

    $effectiveCancelReason = $newStatus === 'cancelled' ? $cancelReason : '';
    $sql = "UPDATE don_hang SET trang_thai = ?, ghi_chu_shipper = ?, ly_do_huy = ?,
            anh_xac_nhan_giao_hang = CASE WHEN ? <> '' THEN ? ELSE anh_xac_nhan_giao_hang END
            WHERE id = ? AND shipper_id = ?";
    $updateStmt = $conn->prepare($sql);
    if (!$updateStmt) {
        respond(['status' => 'error', 'message' => 'Không thể cập nhật trạng thái đơn hàng.'], 500);
    }

    $updateStmt->bind_param('sssssii', $newStatus, $shipperNote, $effectiveCancelReason, $podPath, $podPath, $orderId, $shipperId);
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

    $logStmt = $conn->prepare("INSERT INTO nhat_ky_don_hang (don_hang_id, nguoi_dung_id, trang_thai_cu, trang_thai_moi, ghi_chu) VALUES (?, ?, ?, ?, ?)");
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

    case 'change-password':
        if ($method !== 'POST') {
            respond(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
        }
        handle_change_password($conn);
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
