<?php
/**
 * Customer Bookings Controller — v3
 * Bảng `bookings` → `datxe`, `users` → `nguoidung`.
 * AS alias để output JSON giữ nguyên field name cũ.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'customer') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

$action  = $_GET['action'] ?? '';
$user_id = (int)$_SESSION['user_id'];

try {
    $db   = new Database();
    $conn = $db->getConnection();

    if ($action === 'getMyBookings') {
        // JOIN datxe với nguoidung (nhà cung cấp)
        $stmt = $conn->prepare(
            "SELECT
                b.id,
                b.idxe               AS car_id,
                b.tenxe              AS car_name,
                b.ngaynhan           AS pickup_date,
                b.ngaytra            AS return_date,
                b.songay             AS total_days,
                b.tongtien           AS total_price,
                b.tiendichvuthem     AS addon_total,
                b.diachinhan         AS pickup_location,
                b.trangthai          AS status,
                b.ngaytao            AS created_at,
                p.id                 AS provider_id,
                p.hoten              AS provider_name,
                p.sodienthoai        AS provider_phone,
                p.tencongty          AS provider_company
             FROM datxe b
             LEFT JOIN nguoidung p ON p.id = b.idnhacungcap AND p.vaitro = 'provider'
             WHERE b.idkhachhang = ?
             ORDER BY b.ngaytao DESC"
        );
        $stmt->execute([$user_id]);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống']);
}
