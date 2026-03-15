<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once '../db.php';

$data = json_decode(file_get_contents('php://input'), true);

$id = $data['id'] ?? '';
$action = $data['action'] ?? '';

if (empty($id) || empty($action)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Thiếu thông tin'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $conn->beginTransaction();
    
    // Lấy thông tin cancel request
    $stmt = $conn->prepare("SELECT booking_id FROM cancel_requests WHERE id = ?");
    $stmt->execute([$id]);
    $request = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$request) {
        throw new Exception("Không tìm thấy yêu cầu");
    }
    
    if ($action === 'approve') {
        // Cập nhật trạng thái cancel request
        $stmt = $conn->prepare("
            UPDATE cancel_requests 
            SET cancel_status = 'approved', cancel_processed_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        
        // Cập nhật trạng thái booking
        $stmt = $conn->prepare("UPDATE bookings SET status = 'cancel' WHERE id = ?");
        $stmt->execute([$request['booking_id']]);
        
        $message = 'Đã duyệt yêu cầu hủy đơn';
        
    } else if ($action === 'reject') {
        $stmt = $conn->prepare("
            UPDATE cancel_requests 
            SET cancel_status = 'rejected', cancel_processed_at = NOW() 
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        
        $message = 'Đã từ chối yêu cầu hủy đơn';
    } else {
        throw new Exception("Action không hợp lệ");
    }
    
    $conn->commit();
    
    echo json_encode([
        'status' => 'success',
        'message' => $message
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    $conn->rollBack();
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
