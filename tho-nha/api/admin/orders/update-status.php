<?php
/**
 * Admin Orders — Update Status
 * Bảng bookings → datlich, cột trangthai.
 * BUG FIX: đã sửa từ PDO execute() sang MySQLi bind_param().
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../../../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);

$id     = $data['id']     ?? '';
$status = $data['status'] ?? '';

if (empty($id) || empty($status)) {
    echo json_encode(['status' => 'error', 'message' => 'Thiếu thông tin'], JSON_UNESCAPED_UNICODE);
    exit;
}

$allowedStatuses = ['new', 'confirmed', 'done', 'cancel'];
if (!in_array($status, $allowedStatuses)) {
    echo json_encode(['status' => 'error', 'message' => 'Trạng thái không hợp lệ'], JSON_UNESCAPED_UNICODE);
    exit;
}

$id = (int)$id;
$stmt = $conn->prepare("UPDATE datlich SET trangthai = ? WHERE id = ?");
$stmt->bind_param("si", $status, $id);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Cập nhật thành công'], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Không thể cập nhật đơn hàng'], JSON_UNESCAPED_UNICODE);
}
