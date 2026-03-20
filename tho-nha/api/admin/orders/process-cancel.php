<?php
/**
 * Admin Orders — Process Cancel Request
 * Bảng cancel_requests → yeucauhuy, bookings → datlich.
 * BUG FIX: đã sửa từ PDO (beginTransaction/execute/fetch) sang MySQLi.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../../../config/database.php';

$data   = json_decode(file_get_contents('php://input'), true);
$id     = (int)($data['id']     ?? 0);
$action = $data['action'] ?? '';

if (!$id || empty($action)) {
    echo json_encode(['status' => 'error', 'message' => 'Thiếu thông tin'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Lấy thông tin yêu cầu hủy
$stmt = $conn->prepare("SELECT iddatlich FROM yeucauhuy WHERE id = ?");
$stmt->bind_param("i", $id);
$stmt->execute();
$request = $stmt->get_result()->fetch_assoc();

if (!$request) {
    echo json_encode(['status' => 'error', 'message' => 'Không tìm thấy yêu cầu'], JSON_UNESCAPED_UNICODE);
    exit;
}

$datlichId = (int)$request['iddatlich'];

$conn->begin_transaction();

try {
    if ($action === 'approve') {
        $stmt = $conn->prepare(
            "UPDATE yeucauhuy SET trangthai = 'approved', thoigianxuly = NOW() WHERE id = ?"
        );
        $stmt->bind_param("i", $id);
        $stmt->execute();

        $stmt = $conn->prepare("UPDATE datlich SET trangthai = 'cancel' WHERE id = ?");
        $stmt->bind_param("i", $datlichId);
        $stmt->execute();

        $message = 'Đã duyệt yêu cầu hủy đơn';

    } elseif ($action === 'reject') {
        $stmt = $conn->prepare(
            "UPDATE yeucauhuy SET trangthai = 'rejected', thoigianxuly = NOW() WHERE id = ?"
        );
        $stmt->bind_param("i", $id);
        $stmt->execute();

        $message = 'Đã từ chối yêu cầu hủy đơn';

    } else {
        throw new Exception("Action không hợp lệ");
    }

    $conn->commit();
    echo json_encode(['status' => 'success', 'message' => $message], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
