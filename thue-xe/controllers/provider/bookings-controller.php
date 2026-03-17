<?php
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
            "SELECT id, car_id, car_name, customer_name, customer_phone,
                    pickup_date, return_date, total_days, total_price, status, created_at
             FROM bookings WHERE provider_id = ? ORDER BY created_at DESC"
        );
        $stmt->execute([$provider_id]);
        $data = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }

    if ($action === 'updateStatus') {
        $body       = json_decode(file_get_contents('php://input'), true);
        $booking_id = (int)($body['booking_id'] ?? 0);
        $new_status = $body['status'] ?? '';

        $allowed = ['confirmed', 'completed'];
        if (!$booking_id || !in_array($new_status, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Trạng thái không hợp lệ']);
            exit;
        }

        // Chỉ được cập nhật đơn của mình
        $stmt = $conn->prepare("SELECT id, status FROM bookings WHERE id = ? AND provider_id = ?");
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

        $stmt = $conn->prepare("UPDATE bookings SET status = ? WHERE id = ?");
        $stmt->execute([$new_status, $booking_id]);
        echo json_encode(['success' => true]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống']);
}
