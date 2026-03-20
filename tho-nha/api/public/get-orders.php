<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../config/database.php';

$phone = isset($_GET['phone']) ? $conn->real_escape_string($_GET['phone']) : '';

if (empty($phone)) {
    echo json_encode(['status' => 'error', 'message' => 'Thiếu số điện thoại'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "
    SELECT
        b.id,
        b.order_code,
        b.customer_name,
        b.phone,
        b.service_name AS service_names,
        b.address,
        b.note,
        b.status,
        b.created_at,
        cr.cancel_status,
        cr.cancel_reason,
        cr.cancel_requested_at
    FROM bookings b
    LEFT JOIN cancel_requests cr ON b.id = cr.booking_id AND cr.cancel_status = 'pending'
    WHERE b.phone = '$phone'
    ORDER BY b.created_at DESC
";

$result = $conn->query($sql);

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = $row;
}

echo json_encode(['status' => 'success', 'data' => $orders], JSON_UNESCAPED_UNICODE);

$conn->close();
?>
