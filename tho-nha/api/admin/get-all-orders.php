<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

require_once '../db.php';

// 🔒 BẢO VỆ ADMIN
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized - Vui lòng đăng nhập lại'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "
    SELECT 
        b.id,
        b.order_code,
        b.customer_name,
        b.phone,
        b.address,
        b.note,
        b.status,
        b.created_at,
        GROUP_CONCAT(s.name SEPARATOR ', ') AS service_names,
        GROUP_CONCAT(bs.price SEPARATOR ', ') AS prices
    FROM bookings b
    LEFT JOIN booking_services bs ON b.id = bs.booking_id
    LEFT JOIN services s ON bs.service_id = s.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        'status' => 'error',
        'message' => $conn->error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = [];
while ($row = $result->fetch_assoc()) {
    // ✅ CHUYỂN ĐỔI ID SANG NUMBER
    $row['id'] = (int)$row['id'];
    $data[] = $row;
}

echo json_encode([
    'status' => 'success',
    'data' => $data,
    'count' => count($data) // Thêm để debug
], JSON_UNESCAPED_UNICODE);