<?php
header('Content-Type: application/json; charset=utf-8');
require_once 'db.php';

$phone = isset($_GET['phone']) ? $conn->real_escape_string($_GET['phone']) : '';

if (empty($phone)) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Thiếu số điện thoại'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// ✅ JOIN với bảng cancel_requests để lấy thông tin yêu cầu hủy
$sql = "SELECT 
            b.id,
            b.order_code,
            b.customer_name,
            b.phone,
            b.address,
            b.note,
            b.status,
            b.created_at,
            GROUP_CONCAT(s.name SEPARATOR ', ') AS service_names,
            SUM(CAST(bs.price AS UNSIGNED)) AS prices,
            cr.cancel_status,
            cr.cancel_reason,
            cr.cancel_requested_at
        FROM bookings b
        LEFT JOIN booking_services bs ON b.id = bs.booking_id
        LEFT JOIN services s ON bs.service_id = s.id
        LEFT JOIN cancel_requests cr ON b.id = cr.booking_id AND cr.cancel_status = 'pending'
        WHERE b.phone = '$phone'
        GROUP BY b.id
        ORDER BY b.created_at DESC";

$result = $conn->query($sql);

if ($result->num_rows > 0) {
    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = $row;
    }
    
    echo json_encode([
        'status' => 'success',
        'data' => $orders
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'status' => 'success',
        'data' => []
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>