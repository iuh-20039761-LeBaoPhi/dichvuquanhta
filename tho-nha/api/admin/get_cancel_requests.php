<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

// ❌ Không dùng * nếu cùng domain + session
// header('Access-Control-Allow-Origin: *');

require_once '../db.php';

// 🔒 Bảo vệ admin
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "
    SELECT 
        cr.id,
        cr.booking_id,
        cr.cancel_reason,
        cr.cancel_status,
        cr.cancel_requested_at,
        b.order_code,
        b.customer_name,
        b.phone,
        b.address
    FROM cancel_requests cr
    JOIN bookings b ON cr.booking_id = b.id
    ORDER BY cr.cancel_requested_at DESC
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
    $data[] = $row;
}

echo json_encode([
    'status' => 'success',
    'data' => $data
], JSON_UNESCAPED_UNICODE);
