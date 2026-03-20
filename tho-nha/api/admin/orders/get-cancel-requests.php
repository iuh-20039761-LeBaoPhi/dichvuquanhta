<?php
/**
 * Admin Orders — Get Cancel Requests
 * Bảng cancel_requests → yeucauhuy, bookings → datlich.
 * AS alias giữ nguyên API contract.
 */
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../config/database.php';

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "
    SELECT
        cr.id,
        cr.iddatlich        AS booking_id,
        cr.lydohuy          AS cancel_reason,
        cr.trangthai        AS cancel_status,
        cr.thoigianyeucau   AS cancel_requested_at,
        b.madondatlich      AS order_code,
        b.tenkhachhang      AS customer_name,
        b.sodienthoai       AS phone,
        b.diachi            AS address
    FROM yeucauhuy cr
    JOIN datlich b ON cr.iddatlich = b.id
    ORDER BY cr.thoigianyeucau DESC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode(['status' => 'error', 'message' => $conn->error], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);
