<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

function fetch_users_list($conn) {
    $search = trim((string) ($_GET['search'] ?? ''));
    $role = trim((string) ($_GET['role'] ?? ''));
    $approvalStatus = trim((string) ($_GET['approval_status'] ?? ''));
    [$page, $limit, $offset] = admin_api_get_pagination(10, 100);

    $where = [];
    $params = [];
    $types = '';

    if ($search !== '') {
        $where[] = "(username LIKE ? OR fullname LIKE ? OR email LIKE ? OR phone LIKE ?)";
        $term = '%' . $search . '%';
        array_push($params, $term, $term, $term, $term);
        $types .= 'ssss';
    }

    if ($role !== '') {
        $where[] = "role = ?";
        $params[] = $role;
        $types .= 's';
    }

    if ($approvalStatus === 'pending') {
        $where[] = "is_approved = 0 AND role = 'shipper'";
    }

    $whereSql = empty($where) ? '' : (' WHERE ' . implode(' AND ', $where));

    $countSql = "SELECT COUNT(*) AS total FROM users" . $whereSql;
    $stmtCount = $conn->prepare($countSql);
    if ($types !== '') {
        $stmtCount->bind_param($types, ...$params);
    }
    $stmtCount->execute();
    $countResult = $stmtCount->get_result()->fetch_assoc();
    $totalRecords = intval($countResult['total'] ?? 0);
    $stmtCount->close();

    $sql = "SELECT id, username, fullname, phone, email, role, vehicle_type, created_at,
                   is_locked, lock_reason, is_approved
            FROM users" . $whereSql . " ORDER BY id DESC LIMIT ? OFFSET ?";
    $paramsWithPage = $params;
    $paramsWithPage[] = $limit;
    $paramsWithPage[] = $offset;
    $typesWithPage = $types . 'ii';

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($typesWithPage, ...$paramsWithPage);
    $stmt->execute();
    $result = $stmt->get_result();

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $statusLabel = 'Hoạt động';
        if (($row['role'] ?? '') === 'shipper' && !intval($row['is_approved'] ?? 0)) {
            $statusLabel = 'Chờ duyệt';
        } elseif (intval($row['is_locked'] ?? 0) === 1) {
            $statusLabel = 'Đã khóa';
        }

        $users[] = [
            'id' => intval($row['id'] ?? 0),
            'username' => $row['username'] ?? '',
            'fullname' => $row['fullname'] ?? '',
            'phone' => $row['phone'] ?? '',
            'email' => $row['email'] ?? '',
            'role' => $row['role'] ?? '',
            'vehicle_type' => admin_api_value_or_null($row['vehicle_type'] ?? null),
            'created_at' => admin_api_value_or_null($row['created_at'] ?? null),
            'is_locked' => intval($row['is_locked'] ?? 0) === 1,
            'lock_reason' => admin_api_value_or_null($row['lock_reason'] ?? null),
            'is_approved' => intval($row['is_approved'] ?? 0) === 1,
            'status_label' => $statusLabel,
        ];
    }
    $stmt->close();

    admin_api_json([
        'success' => true,
        'data' => [
            'filters' => [
                'search' => $search,
                'role' => $role,
                'approval_status' => $approvalStatus,
            ],
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => $limit > 0 ? intval(ceil($totalRecords / $limit)) : 0,
            ],
            'users' => $users,
        ],
    ]);
}

function handle_user_action($conn) {
    $payload = admin_api_read_input();
    $action = trim((string) ($payload['action'] ?? ''));
    $userId = intval($payload['id'] ?? 0);
    $reason = trim((string) ($payload['reason'] ?? 'Vi phạm chính sách'));

    if ($userId <= 0 || $action === '') {
        admin_api_json(['success' => false, 'message' => 'Thiếu action hoặc id hợp lệ.'], 400);
    }
    if ($userId === intval($_SESSION['user_id'] ?? 0) && in_array($action, ['lock', 'unlock', 'delete'], true)) {
        admin_api_json(['success' => false, 'message' => 'Không thể thao tác trên tài khoản đang đăng nhập.'], 400);
    }

    if ($action === 'approve') {
        $stmt = $conn->prepare("UPDATE users SET is_approved = 1 WHERE id = ? AND role = 'shipper'");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $updated = $stmt->affected_rows;
        $stmt->close();
        if ($updated < 1) {
            $checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND role = 'shipper' LIMIT 1");
            $checkStmt->bind_param('i', $userId);
            $checkStmt->execute();
            $exists = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            if (!$exists) {
                admin_api_json(['success' => false, 'message' => 'Không tìm thấy shipper cần duyệt.'], 404);
            }
        }
        admin_api_json(['success' => true, 'message' => "Đã duyệt tài khoản shipper ID $userId."]);
    }

    if ($action === 'lock') {
        $stmt = $conn->prepare("UPDATE users SET is_locked = 1, lock_reason = ? WHERE id = ?");
        $stmt->bind_param('si', $reason, $userId);
        $stmt->execute();
        $updated = $stmt->affected_rows;
        $stmt->close();
        if ($updated < 1) {
            $checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
            $checkStmt->bind_param('i', $userId);
            $checkStmt->execute();
            $exists = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            if (!$exists) {
                admin_api_json(['success' => false, 'message' => 'Không tìm thấy người dùng để khóa.'], 404);
            }
        }
        admin_api_json(['success' => true, 'message' => "Đã khóa tài khoản ID $userId."]);
    }

    if ($action === 'unlock') {
        $stmt = $conn->prepare("UPDATE users SET is_locked = 0, lock_reason = NULL WHERE id = ?");
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $updated = $stmt->affected_rows;
        $stmt->close();
        if ($updated < 1) {
            $checkStmt = $conn->prepare("SELECT id FROM users WHERE id = ? LIMIT 1");
            $checkStmt->bind_param('i', $userId);
            $checkStmt->execute();
            $exists = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            if (!$exists) {
                admin_api_json(['success' => false, 'message' => 'Không tìm thấy người dùng để mở khóa.'], 404);
            }
        }
        admin_api_json(['success' => true, 'message' => "Đã mở khóa tài khoản ID $userId."]);
    }

    if ($action === 'delete') {
        $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
        $stmt->bind_param('i', $userId);
        if (!$stmt->execute()) {
            $error = $stmt->error;
            $stmt->close();
            admin_api_json(['success' => false, 'message' => $error ?: 'Không thể xóa người dùng.'], 409);
        }
        $deleted = $stmt->affected_rows;
        $stmt->close();
        if ($deleted < 1) {
            admin_api_json(['success' => false, 'message' => 'Không tìm thấy người dùng để xóa.'], 404);
        }
        admin_api_json(['success' => true, 'message' => "Đã xóa tài khoản ID $userId."]);
    }

    admin_api_json(['success' => false, 'message' => 'Action không hợp lệ.'], 400);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    fetch_users_list($conn);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handle_user_action($conn);
}

admin_api_json(['success' => false, 'message' => 'Method không được hỗ trợ.'], 405);
