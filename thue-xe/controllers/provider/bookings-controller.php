<?php
/**
 * Provider Bookings Controller — v3
 * Bảng `bookings` → `datxe`, cột tiếng Việt không dấu.
 * AS alias để output JSON giữ nguyên field name cũ.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'provider') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

$action      = $_GET['action'] ?? '';
$provider_id = (int)$_SESSION['user_id'];

try {
    $db   = new Database();
    $conn = $db->getConnection();

    if ($action === 'getMyBookings') {
        $stmt = $conn->prepare(
            "SELECT
                id,
                idxe                 AS car_id,
                tenxe                AS car_name,
                tenkhachhang         AS customer_name,
                dienthoaikhachhang   AS customer_phone,
                ngaynhan             AS pickup_date,
                ngaytra              AS return_date,
                songay               AS total_days,
                tongtien             AS total_price,
                trangthai            AS status,
                ngaytao              AS created_at
             FROM datxe WHERE idnhacungcap = ? ORDER BY ngaytao DESC"
        );
        $stmt->execute([$provider_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    if ($action === 'updateStatus') {
        $body       = json_decode(file_get_contents('php://input'), true);
        $booking_id = (int)($body['booking_id'] ?? 0);
        $new_status = $body['status']            ?? '';

        $allowed = ['confirmed', 'completed'];
        if (!$booking_id || !in_array($new_status, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Trạng thái không hợp lệ']);
            exit;
        }

        // Chỉ được cập nhật đơn của provider mình — idnhacungcap
        $stmt = $conn->prepare(
            "SELECT id, trangthai AS status FROM datxe WHERE id = ? AND idnhacungcap = ?"
        );
        $stmt->execute([$booking_id, $provider_id]);
        $booking = $stmt->fetch();

        if (!$booking) {
            echo json_encode(['success' => false, 'message' => 'Không tìm thấy đơn hàng']);
            exit;
        }

        $transitions = ['pending' => 'confirmed', 'confirmed' => 'completed'];
        if (($transitions[$booking['status']] ?? '') !== $new_status) {
            echo json_encode(['success' => false, 'message' => 'Không thể chuyển trạng thái này']);
            exit;
        }

        // UPDATE datxe: cột trangthai
        $stmt = $conn->prepare("UPDATE datxe SET trangthai = ? WHERE id = ?");
        $stmt->execute([$new_status, $booking_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống']);
}
