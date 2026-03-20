<?php
/**
 * Provider Orders — Get My Orders
 * Bảng bookings → datlich, cột tiếng Việt không dấu.
 * AS alias giữ nguyên API contract.
 */
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'provider') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Chưa đăng nhập']);
    exit;
}

$provider_id = (int)$_SESSION['user_id'];
$stmt = $conn->prepare(
    "SELECT id,
            madondatlich AS order_code,
            tenkhachhang AS customer_name,
            sodienthoai  AS phone,
            tendichvu    AS service_name,
            diachi       AS address,
            ghichu       AS note,
            trangthai    AS status,
            ngaytao      AS created_at
     FROM datlich WHERE idnhacungcap = ? ORDER BY ngaytao DESC"
);
$stmt->bind_param("i", $provider_id);
$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode(['status' => 'success', 'data' => $data], JSON_UNESCAPED_UNICODE);
