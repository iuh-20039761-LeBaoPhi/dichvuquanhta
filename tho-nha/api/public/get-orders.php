<?php
/**
 * Public — Get Orders by Phone (track order)
 * Bảng bookings → datlich, cancel_requests → yeucauhuy.
 * AS alias giữ nguyên API contract.
 */
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
        b.madondatlich   AS order_code,
        b.tenkhachhang   AS customer_name,
        b.sodienthoai    AS phone,
        b.tendichvu      AS service_names,
        b.diachi         AS address,
        b.ghichu         AS note,
        b.trangthai      AS status,
        b.ngaytao        AS created_at,
        cr.trangthai     AS cancel_status,
        cr.lydohuy       AS cancel_reason,
        cr.thoigianyeucau AS cancel_requested_at
    FROM datlich b
    LEFT JOIN yeucauhuy cr ON b.id = cr.iddatlich AND cr.trangthai = 'pending'
    WHERE b.sodienthoai = '$phone'
    ORDER BY b.ngaytao DESC
";

$result = $conn->query($sql);

$orders = [];
while ($row = $result->fetch_assoc()) {
    $orders[] = $row;
}

echo json_encode(['status' => 'success', 'data' => $orders], JSON_UNESCAPED_UNICODE);

$conn->close();
