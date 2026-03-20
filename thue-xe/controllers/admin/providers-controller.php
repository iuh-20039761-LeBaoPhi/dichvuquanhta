<?php
/**
 * Providers Admin Controller — v3
 * Bảng `users` → `nguoidung`, cột tiếng Việt không dấu.
 * AS alias để output JSON giữ nguyên field name cũ.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../../config/database.php';

$action = $_GET['action'] ?? '';
$db     = new Database();
$conn   = $db->getConnection();

// ─── LIST ─────────────────────────────────────────────────────────────────────
if ($action === 'list') {
    $filter_status = $_GET['status'] ?? '';
    $allowed       = ['pending', 'active', 'rejected', 'blocked'];

    // alias: tên cột tiếng Anh cũ để frontend không đổi
    $select = "SELECT
        id,
        hoten          AS full_name,
        email,
        sodienthoai    AS phone,
        tencongty      AS company_name,
        sogiayphep     AS license_number,
        diachi         AS address,
        mota           AS description,
        trangthai      AS status,
        lydotuchoi     AS rejection_reason,
        ngaytao        AS created_at
    FROM nguoidung WHERE vaitro = 'provider'";

    if ($filter_status && in_array($filter_status, $allowed)) {
        $stmt = $conn->prepare($select . " AND trangthai = ? ORDER BY ngaytao DESC");
        $stmt->execute([$filter_status]);
    } else {
        $stmt = $conn->prepare(
            $select . " ORDER BY FIELD(trangthai,'pending','active','blocked','rejected'), ngaytao DESC"
        );
        $stmt->execute();
    }
    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
    exit;
}

// ─── COUNTS ───────────────────────────────────────────────────────────────────
if ($action === 'counts') {
    $stmt = $conn->prepare(
        "SELECT trangthai AS status, COUNT(*) AS cnt
         FROM nguoidung WHERE vaitro = 'provider' GROUP BY trangthai"
    );
    $stmt->execute();
    $counts = ['pending' => 0, 'active' => 0, 'rejected' => 0, 'blocked' => 0];
    foreach ($stmt->fetchAll() as $row) {
        if (isset($counts[$row['status']])) {
            $counts[$row['status']] = (int)$row['cnt'];
        }
    }
    echo json_encode(['success' => true, 'data' => $counts]);
    exit;
}

// ─── APPROVE / REJECT / BLOCK / UNBLOCK ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body        = json_decode(file_get_contents('php://input'), true);
    $provider_id = (int)($body['provider_id'] ?? 0);
    $reason      = trim($body['reason'] ?? '');

    if (!$provider_id) {
        echo json_encode(['success' => false, 'message' => 'Thiếu provider_id']);
        exit;
    }

    // Verify provider exists — nguoidung với vaitro='provider'
    $stmt = $conn->prepare(
        "SELECT id, trangthai AS status FROM nguoidung WHERE id = ? AND vaitro = 'provider' LIMIT 1"
    );
    $stmt->execute([$provider_id]);
    $provider = $stmt->fetch();

    if (!$provider) {
        echo json_encode(['success' => false, 'message' => 'Không tìm thấy nhà cung cấp']);
        exit;
    }

    $new_status = null;

    switch ($action) {
        case 'approve':
            $new_status = 'active';
            $reason     = null;
            break;
        case 'reject':
            if (!$reason) {
                echo json_encode(['success' => false, 'message' => 'Vui lòng nhập lý do từ chối']);
                exit;
            }
            $new_status = 'rejected';
            break;
        case 'block':
            if (!$reason) $reason = 'Vi phạm điều khoản dịch vụ';
            $new_status = 'blocked';
            break;
        case 'unblock':
            $new_status = 'active';
            $reason     = null;
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Hành động không hợp lệ']);
            exit;
    }

    // UPDATE nguoidung: trangthai + lydotuchoi
    $stmt = $conn->prepare(
        "UPDATE nguoidung SET trangthai = ?, lydotuchoi = ?
         WHERE id = ? AND vaitro = 'provider'"
    );
    $stmt->execute([$new_status, $reason, $provider_id]);

    $msgs = [
        'approve' => 'Đã duyệt tài khoản nhà cung cấp',
        'reject'  => 'Đã từ chối tài khoản nhà cung cấp',
        'block'   => 'Đã khóa tài khoản nhà cung cấp',
        'unblock' => 'Đã mở khóa tài khoản nhà cung cấp',
    ];
    echo json_encode(['success' => true, 'message' => $msgs[$action] ?? 'Thành công']);
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid request']);
