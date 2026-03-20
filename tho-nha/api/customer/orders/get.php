<?php
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'customer') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Chưa đăng nhập']);
    exit;
}

$user_id = (int)$_SESSION['user_id'];

// JOIN với bảng users để lấy thông tin nhà cung cấp đang thực hiện đơn
$stmt = $conn->prepare(
    "SELECT
        b.id, b.order_code, b.service_name, b.address, b.note,
        b.selected_brand, b.estimated_price,
        b.status, b.created_at,
        p.id          AS provider_id,
        p.full_name   AS provider_name,
        p.phone       AS provider_phone,
        p.company_name AS provider_company
     FROM bookings b
     LEFT JOIN users p ON p.id = b.provider_id AND p.role = 'provider'
     WHERE b.user_id = ?
     ORDER BY b.created_at DESC"
);
$stmt->bind_param("i", $user_id);
$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int)$row['id'];
    $data[] = $row;
}

echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);
