<?php
/**
 * Customer Orders — Request Cancel
 * Bảng bookings → datlich, cancel_requests → yeucauhuy.
 */
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['order_id']) || !isset($input['order_code'])) {
    echo json_encode(['status' => 'error', 'message' => 'Thiếu thông tin đơn hàng'], JSON_UNESCAPED_UNICODE);
    exit;
}

$orderId      = (int)$input['order_id'];
$orderCode    = $conn->real_escape_string($input['order_code']);
$cancelReason = isset($input['reason']) ? $conn->real_escape_string($input['reason']) : 'Khách hàng yêu cầu hủy';

// Kiểm tra đơn hàng tồn tại và trạng thái
$checkSql = "SELECT trangthai AS status FROM datlich WHERE id = $orderId AND madondatlich = '$orderCode'";
$result   = $conn->query($checkSql);

if ($result->num_rows === 0) {
    echo json_encode(['status' => 'error', 'message' => 'Không tìm thấy đơn hàng'], JSON_UNESCAPED_UNICODE);
    exit;
}

$order = $result->fetch_assoc();

// Chỉ cho phép hủy đơn ở trạng thái 'new' hoặc 'confirmed'
if (!in_array($order['status'], ['new', 'confirmed'])) {
    echo json_encode(['status' => 'error', 'message' => 'Đơn hàng này không thể hủy'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Kiểm tra xem đã có yêu cầu hủy pending chưa
$checkCancelSql = "SELECT id FROM yeucauhuy WHERE iddatlich = $orderId AND trangthai = 'pending'";
$cancelResult   = $conn->query($checkCancelSql);

if ($cancelResult->num_rows > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Đơn hàng này đã có yêu cầu hủy đang chờ xử lý'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Tạo yêu cầu hủy mới
$insertSql = "INSERT INTO yeucauhuy (iddatlich, lydohuy, trangthai, thoigianyeucau)
              VALUES ($orderId, '$cancelReason', 'pending', NOW())";

if ($conn->query($insertSql)) {
    echo json_encode([
        'status'  => 'success',
        'message' => 'Yêu cầu hủy đơn đã được gửi thành công! Admin sẽ xem xét và phản hồi sớm nhất.'
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Lỗi cơ sở dữ liệu: ' . $conn->error], JSON_UNESCAPED_UNICODE);
}

$conn->close();
