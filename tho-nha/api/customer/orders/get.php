<?php
/**
 * Customer Orders — Get My Orders
 * Bảng bookings → datlich, users → nguoidung.
 * AS alias giữ nguyên API contract.
 */
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'customer') {
    http_response_code(401);
    echo json_encode(['status' => 'error', 'message' => 'Chưa đăng nhập']);
    exit;
}

$user_id = (int)$_SESSION['user_id'];

$stmt = $conn->prepare(
    "SELECT
        b.id,
        b.madondatlich   AS order_code,
        b.tendichvu      AS service_name,
        b.diachi         AS address,
        b.ghichu         AS note,
        b.thuonghieuchon AS selected_brand,
        b.giauoctinh     AS estimated_price,
        b.trangthai      AS status,
        b.ngaytao        AS created_at,
        p.id             AS provider_id,
        p.hoten          AS provider_name,
        p.sodienthoai    AS provider_phone,
        p.tencongty      AS provider_company
     FROM datlich b
     LEFT JOIN nguoidung p ON p.id = b.idnhacungcap AND p.vaitro = 'provider'
     WHERE b.idkhachhang = ?
     ORDER BY b.ngaytao DESC"
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
