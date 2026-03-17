<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'customer') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

$action = $_GET['action'] ?? '';
$user_id = (int)$_SESSION['user_id'];

try {
    $db   = new Database();
    $conn = $db->getConnection();

    if ($action === 'getMyBookings') {
        $stmt = $conn->prepare(
            "SELECT id, car_id, car_name, pickup_date, return_date, total_days,
                    total_price, addon_total, status, created_at
             FROM bookings WHERE user_id = ? ORDER BY created_at DESC"
        );
        $stmt->execute([$user_id]);
        $data = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống']);
}
