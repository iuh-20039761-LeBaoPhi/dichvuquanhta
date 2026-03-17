<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'provider') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Chưa đăng nhập']);
    exit;
}

$data       = json_decode(file_get_contents('php://input'), true);
$booking_id = (int)($data['booking_id'] ?? 0);
$new_status = $data['status'] ?? '';
$provider_id = (int)$_SESSION['user_id'];

// Provider chỉ được cập nhật: confirmed→doing, doing→done
$allowed = ['doing', 'done'];
if (!$booking_id || !in_array($new_status, $allowed)) {
    echo json_encode(['status' => 'error', 'message' => 'Trạng thái không hợp lệ']);
    exit;
}

// Đảm bảo đơn thuộc về provider này
$stmt = $conn->prepare("SELECT id, status FROM bookings WHERE id = ? AND provider_id = ?");
$stmt->bind_param("ii", $booking_id, $provider_id);
$stmt->execute();
$booking = $stmt->get_result()->fetch_assoc();

if (!$booking) {
    echo json_encode(['status' => 'error', 'message' => 'Không tìm thấy đơn hàng']);
    exit;
}

// Kiểm tra luồng trạng thái hợp lệ
$transitions = ['confirmed' => 'doing', 'doing' => 'done'];
if (($transitions[$booking['status']] ?? '') !== $new_status) {
    echo json_encode(['status' => 'error', 'message' => 'Không thể chuyển trạng thái này']);
    exit;
}

$stmt = $conn->prepare("UPDATE bookings SET status = ? WHERE id = ?");
$stmt->bind_param("si", $new_status, $booking_id);
if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Đã cập nhật trạng thái']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Cập nhật thất bại']);
}
