<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db.php';

$data = json_decode(file_get_contents('php://input'), true);

$id = $data['id'] ?? '';
$status = $data['status'] ?? '';

if (empty($id) || empty($status)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Thiếu thông tin'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Validate status value
$allowedStatuses = ['new', 'confirmed', 'done', 'cancel'];
if (!in_array($status, $allowedStatuses)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Trạng thái không hợp lệ'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $stmt = $conn->prepare("UPDATE bookings SET status = ? WHERE id = ?");
    $result = $stmt->execute([$status, $id]);
    
    if ($result) {
        echo json_encode([
            'status' => 'success',
            'message' => 'Cập nhật thành công'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'status' => 'error',
            'message' => 'Không thể cập nhật đơn hàng'
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Lỗi database: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>