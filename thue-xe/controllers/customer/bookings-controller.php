<?php
/**
 * Customer Bookings Controller
 * Đồng bộ schema hiện tại: datxe + nguoidung + xechiec + xemau.
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
        $stmt = $conn->prepare(
            "SELECT
                b.id,
                b.idxechiec                  AS car_id,
                xm.ten                       AS car_name,
                b.ngaynhan                   AS pickup_date,
                b.ngaytra                    AS return_date,
                b.songay                     AS total_days,
                (b.songay * xm.giathue_ngay) AS total_price,
                0                            AS addon_total,
                b.diachinhan                 AS pickup_location,
                b.trangthai                  AS status,
                b.ngaytao                    AS created_at,
                NULL                         AS provider_id,
                NULL                         AS provider_name,
                NULL                         AS provider_phone,
                NULL                         AS provider_company
             FROM datxe b
             INNER JOIN xechiec xc ON xc.id = b.idxechiec
             INNER JOIN xemau xm ON xm.id = xc.idxemau
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
