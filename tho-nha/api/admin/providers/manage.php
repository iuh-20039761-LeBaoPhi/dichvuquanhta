<?php
/**
 * Admin Providers — Manage
 * Bảng users → nguoidung, cột tiếng Việt không dấu.
 * AS alias giữ nguyên API contract.
 */
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
    exit;
}

$action = $_GET['action'] ?? '';

// ─── LIST ────────────────────────────────────────────────────────────────────
if ($action === 'list') {
    $filter_status   = $_GET['status'] ?? '';
    $allowed_statuses = ['pending', 'active', 'rejected', 'blocked'];

    if ($filter_status && in_array($filter_status, $allowed_statuses)) {
        $stmt = $conn->prepare(
            "SELECT id,
                    hoten        AS full_name,
                    email,
                    sodienthoai  AS phone,
                    tencongty    AS company_name,
                    diachi       AS address,
                    mota         AS description,
                    trangthai    AS status,
                    lydotuchoi   AS rejection_reason,
                    ngaytao      AS created_at
             FROM nguoidung WHERE vaitro = 'provider' AND trangthai = ?
             ORDER BY ngaytao DESC"
        );
        $stmt->bind_param("s", $filter_status);
    } else {
        $stmt = $conn->prepare(
            "SELECT id,
                    hoten        AS full_name,
                    email,
                    sodienthoai  AS phone,
                    tencongty    AS company_name,
                    diachi       AS address,
                    mota         AS description,
                    trangthai    AS status,
                    lydotuchoi   AS rejection_reason,
                    ngaytao      AS created_at
             FROM nguoidung WHERE vaitro = 'provider'
             ORDER BY FIELD(trangthai,'pending','active','blocked','rejected'), ngaytao DESC"
        );
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $data[] = $row;
    }
    echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

// ─── COUNTS ──────────────────────────────────────────────────────────────────
if ($action === 'counts') {
    $stmt = $conn->prepare(
        "SELECT trangthai AS status, COUNT(*) AS cnt FROM nguoidung WHERE vaitro = 'provider' GROUP BY trangthai"
    );
    $stmt->execute();
    $result = $stmt->get_result();
    $counts = ['pending' => 0, 'active' => 0, 'rejected' => 0, 'blocked' => 0];
    while ($row = $result->fetch_assoc()) {
        if (isset($counts[$row['status']])) {
            $counts[$row['status']] = (int)$row['cnt'];
        }
    }
    echo json_encode(['status' => 'success', 'data' => $counts], JSON_UNESCAPED_UNICODE);
    exit;
}

// ─── APPROVE / REJECT / BLOCK / UNBLOCK ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body             = json_decode(file_get_contents('php://input'), true);
    $provider_id      = (int)($body['provider_id'] ?? 0);
    $rejection_reason = trim($body['reason'] ?? '');

    if (!$provider_id) {
        echo json_encode(['status' => 'error', 'message' => 'Thiếu provider_id'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $conn->prepare(
        "SELECT id, trangthai AS status FROM nguoidung WHERE id = ? AND vaitro = 'provider' LIMIT 1"
    );
    $stmt->bind_param("i", $provider_id);
    $stmt->execute();
    $provider = $stmt->get_result()->fetch_assoc();

    if (!$provider) {
        echo json_encode(['status' => 'error', 'message' => 'Không tìm thấy nhà cung cấp'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $new_status = null;

    switch ($action) {
        case 'approve':
            $new_status       = 'active';
            $rejection_reason = null;
            break;
        case 'reject':
            if (!$rejection_reason) {
                echo json_encode(['status' => 'error', 'message' => 'Vui lòng nhập lý do từ chối'], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $new_status = 'rejected';
            break;
        case 'block':
            if (!$rejection_reason) $rejection_reason = 'Vi phạm điều khoản dịch vụ';
            $new_status = 'blocked';
            break;
        case 'unblock':
            $new_status       = 'active';
            $rejection_reason = null;
            break;
        default:
            echo json_encode(['status' => 'error', 'message' => 'Hành động không hợp lệ'], JSON_UNESCAPED_UNICODE);
            exit;
    }

    $stmt = $conn->prepare(
        "UPDATE nguoidung SET trangthai = ?, lydotuchoi = ? WHERE id = ? AND vaitro = 'provider'"
    );
    $stmt->bind_param("ssi", $new_status, $rejection_reason, $provider_id);

    if ($stmt->execute()) {
        $msg_map = [
            'approve' => 'Đã duyệt tài khoản nhà cung cấp',
            'reject'  => 'Đã từ chối tài khoản nhà cung cấp',
            'block'   => 'Đã khóa tài khoản nhà cung cấp',
            'unblock' => 'Đã mở khóa tài khoản nhà cung cấp',
        ];
        echo json_encode(['status' => 'success', 'message' => $msg_map[$action] ?? 'Thành công'], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Cập nhật thất bại'], JSON_UNESCAPED_UNICODE);
    }
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'Invalid request'], JSON_UNESCAPED_UNICODE);
