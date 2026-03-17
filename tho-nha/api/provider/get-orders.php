<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'provider') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Chưa đăng nhập']);
    exit;
}

$provider_id = (int)$_SESSION['user_id'];
$stmt = $conn->prepare(
    "SELECT id, order_code, customer_name, phone, service_name, address, note, status, created_at
     FROM bookings WHERE provider_id = ? ORDER BY created_at DESC"
);
$stmt->bind_param("i", $provider_id);
$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);
