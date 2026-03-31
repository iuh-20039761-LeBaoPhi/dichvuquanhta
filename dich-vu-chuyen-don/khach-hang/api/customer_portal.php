<?php

require_once __DIR__ . '/../../api/auth/_helpers.php';

try {
    $conn = chuyen_don_get_connection();
    chuyen_don_ensure_auth_schema($conn);
} catch (Throwable $error) {
    chuyen_don_fail($error->getMessage(), 500);
}

function customer_portal_require_customer(mysqli $conn): array
{
    $user = chuyen_don_current_user();
    if (!$user || (int) ($user['id'] ?? 0) <= 0) {
        chuyen_don_fail('Vui lòng đăng nhập để tiếp tục.', 401);
    }

    if (($user['role'] ?? '') !== 'khach-hang') {
        chuyen_don_fail('Bạn không có quyền truy cập khu khách hàng.', 403);
    }

    $stmt = $conn->prepare(
        'SELECT id, role, full_name, contact_person, email, phone, status
         FROM auth_users
         WHERE id = ? AND role = ? LIMIT 1'
    );
    if (!$stmt) {
        chuyen_don_fail('Không thể kiểm tra phiên khách hàng.', 500);
    }

    $role = 'khach-hang';
    $userId = (int) $user['id'];
    $stmt->bind_param('is', $userId, $role);
    $stmt->execute();
    $freshUser = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$freshUser || ($freshUser['status'] ?? '') !== 'active') {
        chuyen_don_clear_auth_session();
        chuyen_don_fail('Phiên khách hàng không còn hợp lệ.', 401);
    }

    $_SESSION['chuyen_don_auth'] = chuyen_don_build_session_user($freshUser);
    return $_SESSION['chuyen_don_auth'];
}

function customer_portal_send(array $payload, int $statusCode = 200): void
{
    chuyen_don_send_json(array_merge(['status' => 'success'], $payload), $statusCode);
}

function customer_portal_get_action(): string
{
    $action = $_GET['action'] ?? '';
    if ($action === '' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
    }
    return trim((string) $action);
}

function customer_portal_get_json_payload(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function customer_portal_ensure_request_schema(mysqli $conn): void
{
    static $ready = false;
    if ($ready) {
        return;
    }

    $sql = <<<SQL
CREATE TABLE IF NOT EXISTS customer_requests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    request_code VARCHAR(64) NOT NULL,
    request_type ENUM('khao-sat', 'dat-lich') NOT NULL,
    title VARCHAR(190) NOT NULL,
    service_label VARCHAR(120) DEFAULT NULL,
    status_key ENUM('moi', 'xac_nhan', 'dang_xu_ly') NOT NULL DEFAULT 'moi',
    status_text VARCHAR(100) NOT NULL DEFAULT 'Mới tiếp nhận',
    summary TEXT DEFAULT NULL,
    meta_note VARCHAR(255) DEFAULT NULL,
    from_address VARCHAR(255) DEFAULT NULL,
    to_address VARCHAR(255) DEFAULT NULL,
    schedule_label VARCHAR(120) DEFAULT NULL,
    estimated_amount DECIMAL(12,0) NOT NULL DEFAULT 0,
    contact_name VARCHAR(120) DEFAULT NULL,
    contact_phone VARCHAR(20) DEFAULT NULL,
    note TEXT DEFAULT NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'api',
    payload_json LONGTEXT DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_customer_requests_code (request_code),
    KEY idx_customer_requests_user_created (user_id, created_at),
    KEY idx_customer_requests_user_status (user_id, status_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;

    if (!$conn->query($sql)) {
        throw new RuntimeException('Không thể khởi tạo bảng customer_requests: ' . $conn->error);
    }

    $ready = true;
}

function customer_portal_normalize_request_row(array $row): array
{
    return [
        'id' => (int) ($row['id'] ?? 0),
        'code' => (string) ($row['code'] ?? ''),
        'type' => (string) ($row['type'] ?? 'dat-lich'),
        'type_label' => (string) ($row['type_label'] ?? 'Đặt lịch'),
        'title' => (string) ($row['title'] ?? ''),
        'service_label' => (string) ($row['service_label'] ?? ''),
        'status_class' => (string) ($row['status_class'] ?? 'moi'),
        'status_text' => (string) ($row['status_text'] ?? 'Mới tiếp nhận'),
        'summary' => (string) ($row['summary'] ?? ''),
        'meta' => (string) ($row['meta'] ?? ''),
        'from_address' => (string) ($row['from_address'] ?? ''),
        'to_address' => (string) ($row['to_address'] ?? ''),
        'created_at' => (string) ($row['created_at'] ?? ''),
        'schedule_label' => (string) ($row['schedule_label'] ?? ''),
        'estimated_amount' => (float) ($row['estimated_amount'] ?? 0),
        'contact_name' => (string) ($row['contact_name'] ?? ''),
        'contact_phone' => (string) ($row['contact_phone'] ?? ''),
        'note' => (string) ($row['note'] ?? ''),
        'source' => (string) ($row['source'] ?? 'api'),
    ];
}

function customer_portal_fetch_request_by_code(mysqli $conn, int $userId, string $code): ?array
{
    $stmt = $conn->prepare(
        "SELECT
            id,
            request_code AS code,
            request_type AS type,
            CASE WHEN request_type = 'khao-sat' THEN 'Khảo sát' ELSE 'Đặt lịch' END AS type_label,
            title,
            service_label,
            status_key AS status_class,
            status_text,
            summary,
            meta_note AS meta,
            from_address,
            to_address,
            created_at,
            schedule_label,
            estimated_amount,
            contact_name,
            contact_phone,
            note,
            source
         FROM customer_requests
         WHERE user_id = ? AND request_code = ?
         LIMIT 1"
    );
    if (!$stmt) {
        chuyen_don_fail('Không thể đọc chi tiết yêu cầu.', 500);
    }

    $stmt->bind_param('is', $userId, $code);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? customer_portal_normalize_request_row($row) : null;
}

function customer_portal_build_profile(array $user): array
{
    return [
        'id' => (int) ($user['id'] ?? 0),
        'role' => (string) ($user['role'] ?? ''),
        'full_name' => (string) ($user['full_name'] ?? ''),
        'contact_person' => (string) ($user['contact_person'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'phone' => (string) ($user['phone'] ?? ''),
        'status' => (string) ($user['status'] ?? 'active'),
    ];
}

function customer_portal_handle_profile(mysqli $conn): void
{
    $user = customer_portal_require_customer($conn);
    customer_portal_send([
        'profile' => customer_portal_build_profile($user),
    ]);
}

function customer_portal_handle_dashboard(mysqli $conn): void
{
    $user = customer_portal_require_customer($conn);
    customer_portal_ensure_request_schema($conn);

    $userId = (int) $user['id'];
    $stats = [
        'total' => 0,
        'open_count' => 0,
        'confirmed_count' => 0,
        'survey_count' => 0,
    ];

    $statsSql = "
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN status_key IN ('moi', 'dang_xu_ly') THEN 1 ELSE 0 END) AS open_count,
            SUM(CASE WHEN status_key = 'xac_nhan' THEN 1 ELSE 0 END) AS confirmed_count,
            SUM(CASE WHEN request_type = 'khao-sat' THEN 1 ELSE 0 END) AS survey_count
        FROM customer_requests
        WHERE user_id = ?
    ";
    $statsStmt = $conn->prepare($statsSql);
    if ($statsStmt) {
        $statsStmt->bind_param('i', $userId);
        $statsStmt->execute();
        $statsRow = $statsStmt->get_result()->fetch_assoc();
        $statsStmt->close();
        if ($statsRow) {
            $stats = [
                'total' => (int) ($statsRow['total'] ?? 0),
                'open_count' => (int) ($statsRow['open_count'] ?? 0),
                'confirmed_count' => (int) ($statsRow['confirmed_count'] ?? 0),
                'survey_count' => (int) ($statsRow['survey_count'] ?? 0),
            ];
        }
    }

    $recentRequests = [];
    $recentStmt = $conn->prepare(
        "SELECT
            id,
            request_code AS code,
            request_type AS type,
            CASE WHEN request_type = 'khao-sat' THEN 'Khảo sát' ELSE 'Đặt lịch' END AS type_label,
            title,
            service_label,
            status_key AS status_class,
            status_text,
            summary,
            meta_note AS meta,
            from_address,
            to_address,
            created_at,
            schedule_label,
            estimated_amount,
            contact_name,
            contact_phone,
            note,
            source
         FROM customer_requests
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 3"
    );
    if ($recentStmt) {
        $recentStmt->bind_param('i', $userId);
        $recentStmt->execute();
        $result = $recentStmt->get_result();
        while ($row = $result->fetch_assoc()) {
            $recentRequests[] = customer_portal_normalize_request_row($row);
        }
        $recentStmt->close();
    }

    customer_portal_send([
        'profile' => customer_portal_build_profile($user),
        'stats' => $stats,
        'recent_requests' => $recentRequests,
    ]);
}

function customer_portal_handle_history(mysqli $conn): void
{
    $user = customer_portal_require_customer($conn);
    customer_portal_ensure_request_schema($conn);

    $userId = (int) $user['id'];
    $items = [];
    $stmt = $conn->prepare(
        "SELECT
            id,
            request_code AS code,
            request_type AS type,
            CASE WHEN request_type = 'khao-sat' THEN 'Khảo sát' ELSE 'Đặt lịch' END AS type_label,
            title,
            service_label,
            status_key AS status_class,
            status_text,
            summary,
            meta_note AS meta,
            from_address,
            to_address,
            created_at,
            schedule_label,
            estimated_amount,
            contact_name,
            contact_phone,
            note,
            source
         FROM customer_requests
         WHERE user_id = ?
         ORDER BY created_at DESC"
    );
    if (!$stmt) {
        chuyen_don_fail('Không thể đọc lịch sử yêu cầu.', 500);
    }

    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    while ($row = $result->fetch_assoc()) {
        $items[] = customer_portal_normalize_request_row($row);
    }
    $stmt->close();

    customer_portal_send([
        'profile' => customer_portal_build_profile($user),
        'history' => $items,
    ]);
}

function customer_portal_handle_detail(mysqli $conn): void
{
    $user = customer_portal_require_customer($conn);
    customer_portal_ensure_request_schema($conn);

    $code = trim((string) ($_GET['code'] ?? ''));
    if ($code === '') {
        chuyen_don_fail('Thiếu mã yêu cầu cần xem chi tiết.');
    }

    $item = customer_portal_fetch_request_by_code($conn, (int) $user['id'], $code);
    if (!$item) {
        chuyen_don_fail('Không tìm thấy yêu cầu cần xem.', 404);
    }

    customer_portal_send([
        'profile' => customer_portal_build_profile($user),
        'request' => $item,
    ]);
}

function customer_portal_handle_save_request(mysqli $conn): void
{
    chuyen_don_require_method('POST');
    $user = customer_portal_require_customer($conn);
    customer_portal_ensure_request_schema($conn);

    $payload = customer_portal_get_json_payload();

    $code = chuyen_don_normalize_text($payload['code'] ?? '');
    $type = chuyen_don_normalize_text($payload['type'] ?? 'dat-lich');
    $type = in_array($type, ['khao-sat', 'dat-lich'], true) ? $type : 'dat-lich';
    $title = chuyen_don_normalize_text($payload['title'] ?? '');
    $serviceLabel = chuyen_don_normalize_text($payload['service_label'] ?? '');
    $statusKey = chuyen_don_normalize_text($payload['status_class'] ?? 'moi');
    $statusKey = in_array($statusKey, ['moi', 'xac_nhan', 'dang_xu_ly'], true) ? $statusKey : 'moi';
    $statusText = chuyen_don_normalize_text($payload['status_text'] ?? 'Mới tiếp nhận');
    $summary = chuyen_don_normalize_text($payload['summary'] ?? '');
    $meta = chuyen_don_normalize_text($payload['meta'] ?? '');
    $fromAddress = chuyen_don_normalize_text($payload['from_address'] ?? '');
    $toAddress = chuyen_don_normalize_text($payload['to_address'] ?? '');
    $scheduleLabel = chuyen_don_normalize_text($payload['schedule_label'] ?? '');
    $estimatedAmount = (float) ($payload['estimated_amount'] ?? 0);
    $contactName = chuyen_don_normalize_text($payload['contact_name'] ?? ($user['full_name'] ?? ''));
    $contactPhone = chuyen_don_normalize_phone($payload['contact_phone'] ?? ($user['phone'] ?? ''));
    $note = trim((string) ($payload['note'] ?? ''));
    $source = chuyen_don_normalize_text($payload['source'] ?? 'api');

    if ($code === '' || $title === '') {
        chuyen_don_fail('Thiếu mã hoặc tiêu đề yêu cầu.');
    }

    $payloadJson = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $createdAt = trim((string) ($payload['created_at'] ?? ''));
    if ($createdAt === '' || strtotime($createdAt) === false) {
        $createdAt = date('Y-m-d H:i:s');
    } else {
        $createdAt = date('Y-m-d H:i:s', strtotime($createdAt));
    }

    $stmt = $conn->prepare(
        "INSERT INTO customer_requests (
            user_id, request_code, request_type, title, service_label, status_key, status_text,
            summary, meta_note, from_address, to_address, schedule_label, estimated_amount,
            contact_name, contact_phone, note, source, payload_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            request_type = VALUES(request_type),
            title = VALUES(title),
            service_label = VALUES(service_label),
            status_key = VALUES(status_key),
            status_text = VALUES(status_text),
            summary = VALUES(summary),
            meta_note = VALUES(meta_note),
            from_address = VALUES(from_address),
            to_address = VALUES(to_address),
            schedule_label = VALUES(schedule_label),
            estimated_amount = VALUES(estimated_amount),
            contact_name = VALUES(contact_name),
            contact_phone = VALUES(contact_phone),
            note = VALUES(note),
            source = VALUES(source),
            payload_json = VALUES(payload_json)"
    );
    if (!$stmt) {
        chuyen_don_fail('Không thể lưu yêu cầu khách hàng.', 500);
    }

    $userId = (int) $user['id'];
    $stmt->bind_param(
        'isssssssssssdssssss',
        $userId,
        $code,
        $type,
        $title,
        $serviceLabel,
        $statusKey,
        $statusText,
        $summary,
        $meta,
        $fromAddress,
        $toAddress,
        $scheduleLabel,
        $estimatedAmount,
        $contactName,
        $contactPhone,
        $note,
        $source,
        $payloadJson,
        $createdAt
    );

    if (!$stmt->execute()) {
        $message = $stmt->error;
        $stmt->close();
        chuyen_don_fail('Không thể lưu yêu cầu khách hàng: ' . $message, 500);
    }
    $stmt->close();

    $item = customer_portal_fetch_request_by_code($conn, $userId, $code);
    customer_portal_send([
        'message' => 'Đã lưu yêu cầu khách hàng.',
        'request' => $item,
    ]);
}

function customer_portal_handle_update_profile(mysqli $conn): void
{
    chuyen_don_require_method('POST');
    $user = customer_portal_require_customer($conn);

    $payload = customer_portal_get_json_payload();
    $fullName = chuyen_don_normalize_text($payload['full_name'] ?? '');
    $contactPerson = chuyen_don_normalize_text($payload['contact_person'] ?? '');
    $email = chuyen_don_normalize_email($payload['email'] ?? '');
    $phone = chuyen_don_normalize_phone($payload['phone'] ?? '');

    if ($fullName === '' || $email === '' || $phone === '') {
        chuyen_don_fail('Vui lòng nhập đầy đủ họ tên, email và số điện thoại.');
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        chuyen_don_fail('Email chưa đúng định dạng.');
    }

    if (!preg_match('/^(?:0|84)(?:3|5|7|8|9)\d{8}$/', $phone)) {
        chuyen_don_fail('Số điện thoại chưa đúng định dạng Việt Nam.');
    }

    $checkStmt = $conn->prepare(
        'SELECT id FROM auth_users WHERE role = ? AND id <> ? AND (email = ? OR phone = ?) LIMIT 1'
    );
    if (!$checkStmt) {
        chuyen_don_fail('Không thể kiểm tra trùng dữ liệu hồ sơ.', 500);
    }

    $role = 'khach-hang';
    $userId = (int) $user['id'];
    $checkStmt->bind_param('siss', $role, $userId, $email, $phone);
    $checkStmt->execute();
    $existing = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();

    if ($existing) {
        chuyen_don_fail('Email hoặc số điện thoại đã được dùng bởi tài khoản khách hàng khác.', 409);
    }

    $stmt = $conn->prepare(
        'UPDATE auth_users SET full_name = ?, contact_person = ?, email = ?, phone = ? WHERE id = ? AND role = ?'
    );
    if (!$stmt) {
        chuyen_don_fail('Không thể cập nhật hồ sơ khách hàng.', 500);
    }

    $stmt->bind_param('ssssis', $fullName, $contactPerson, $email, $phone, $userId, $role);
    if (!$stmt->execute()) {
        $message = $stmt->error;
        $stmt->close();
        chuyen_don_fail('Không thể cập nhật hồ sơ: ' . $message, 500);
    }
    $stmt->close();

    $_SESSION['chuyen_don_auth'] = chuyen_don_build_session_user([
        'id' => $userId,
        'role' => $role,
        'full_name' => $fullName,
        'contact_person' => $contactPerson,
        'email' => $email,
        'phone' => $phone,
        'status' => $user['status'] ?? 'active',
    ]);

    customer_portal_send([
        'message' => 'Cập nhật hồ sơ khách hàng thành công.',
        'profile' => customer_portal_build_profile($_SESSION['chuyen_don_auth']),
    ]);
}

function customer_portal_handle_change_password(mysqli $conn): void
{
    chuyen_don_require_method('POST');
    $user = customer_portal_require_customer($conn);

    $payload = customer_portal_get_json_payload();
    $currentPassword = (string) ($payload['current_password'] ?? '');
    $newPassword = (string) ($payload['new_password'] ?? '');
    $confirmPassword = (string) ($payload['confirm_password'] ?? '');

    if ($currentPassword === '' || $newPassword === '' || $confirmPassword === '') {
        chuyen_don_fail('Vui lòng nhập đầy đủ thông tin đổi mật khẩu.');
    }

    if ($newPassword !== $confirmPassword) {
        chuyen_don_fail('Mật khẩu xác nhận chưa khớp.');
    }

    if (!chuyen_don_validate_password($newPassword)) {
        chuyen_don_fail('Mật khẩu mới cần 8-32 ký tự, gồm chữ hoa, chữ thường và số, không có khoảng trắng.');
    }

    $stmt = $conn->prepare('SELECT password_hash FROM auth_users WHERE id = ? AND role = ? LIMIT 1');
    if (!$stmt) {
        chuyen_don_fail('Không thể kiểm tra mật khẩu hiện tại.', 500);
    }

    $role = 'khach-hang';
    $userId = (int) $user['id'];
    $stmt->bind_param('is', $userId, $role);
    $stmt->execute();
    $account = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$account || !password_verify($currentPassword, (string) ($account['password_hash'] ?? ''))) {
        chuyen_don_fail('Mật khẩu hiện tại không chính xác.', 401);
    }

    $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateStmt = $conn->prepare('UPDATE auth_users SET password_hash = ? WHERE id = ? AND role = ?');
    if (!$updateStmt) {
        chuyen_don_fail('Không thể cập nhật mật khẩu mới.', 500);
    }

    $updateStmt->bind_param('sis', $passwordHash, $userId, $role);
    if (!$updateStmt->execute()) {
        $message = $updateStmt->error;
        $updateStmt->close();
        chuyen_don_fail('Không thể đổi mật khẩu: ' . $message, 500);
    }
    $updateStmt->close();

    customer_portal_send([
        'message' => 'Đổi mật khẩu thành công.',
    ]);
}

$action = customer_portal_get_action();

try {
    switch ($action) {
        case 'profile':
            customer_portal_handle_profile($conn);
            break;
        case 'dashboard':
            customer_portal_handle_dashboard($conn);
            break;
        case 'history':
            customer_portal_handle_history($conn);
            break;
        case 'detail':
            customer_portal_handle_detail($conn);
            break;
        case 'save_request':
            customer_portal_handle_save_request($conn);
            break;
        case 'update_profile':
            customer_portal_handle_update_profile($conn);
            break;
        case 'change_password':
            customer_portal_handle_change_password($conn);
            break;
        default:
            chuyen_don_fail('Action portal khách hàng không hợp lệ.', 404);
    }
} catch (Throwable $error) {
    chuyen_don_fail($error->getMessage(), 500);
}
