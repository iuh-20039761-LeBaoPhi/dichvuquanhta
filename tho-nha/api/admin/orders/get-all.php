<?php
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../../../config/database.php';

if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized - Vui lòng đăng nhập lại'], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "
    SELECT
        id,
        order_code,
        customer_name,
        phone,
        service_name AS service_names,
        address,
        note,
        status,
        created_at
    FROM bookings
    ORDER BY created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode(['status' => 'error', 'message' => $conn->error], JSON_UNESCAPED_UNICODE);
    exit;
}

$data = [];
while ($row = $result->fetch_assoc()) {
    $row['id'] = (int)$row['id'];
    $data[] = $row;
}

echo json_encode([
    'status' => 'success',
    'data'   => $data,
    'count'  => count($data)
], JSON_UNESCAPED_UNICODE);
