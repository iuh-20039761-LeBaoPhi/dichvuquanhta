<?php
/**
 * Booking Admin Controller
 * Đồng bộ schema hiện tại: datxe + nguoidung + xechiec + xemau.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../../config/database.php';

$action = $_GET['action'] ?? '';
$db     = new Database();
$conn   = $db->getConnection();

$bookingSelect = "
    b.id,
    b.idkhachhang                        AS user_id,
    NULL                                 AS provider_id,
    b.idxechiec                          AS car_id,
    xm.ten                               AS car_name,
    u.hoten                              AS customer_name,
    u.email                              AS customer_email,
    u.sodienthoai                        AS customer_phone,
    ''                                   AS customer_address,
    ''                                   AS id_number,
    b.ngaynhan                           AS pickup_date,
    b.gionhan                            AS pickup_time,
    b.ngaytra                            AS return_date,
    b.gioratra                           AS return_time,
    b.diachinhan                         AS pickup_location,
    b.ghichu                             AS notes,
    b.songay                             AS total_days,
    (b.songay * xm.giathue_ngay)         AS total_price,
    '[]'                                 AS addon_services,
    0                                    AS addon_total,
    (b.songay * xm.giathue_ngay)         AS subtotal,
    ROUND((b.songay * xm.giathue_ngay) * 0.1) AS tax_amount,
    ROUND((b.songay * xm.giathue_ngay) * COALESCE(xm.tiledatcoc, 0.3)) AS deposit_amount,
    ((b.songay * xm.giathue_ngay) + ROUND((b.songay * xm.giathue_ngay) * 0.1)) AS final_total,
    b.trangthai                          AS status,
    b.ngaytao                            AS created_at";

switch ($action) {
    case 'list':
        $status = $_GET['status'] ?? '';
        $sql    = "SELECT " . $bookingSelect . "
                   FROM datxe b
                   INNER JOIN nguoidung u ON u.id = b.idkhachhang
                   INNER JOIN xechiec xc ON xc.id = b.idxechiec
                   INNER JOIN xemau xm ON xm.id = xc.idxemau";
        $params = [];
        if ($status) {
            $sql .= " WHERE b.trangthai = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY b.ngaytao DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'recent':
        $stmt = $conn->query(
            "SELECT " . $bookingSelect . "
             FROM datxe b
             INNER JOIN nguoidung u ON u.id = b.idkhachhang
             INNER JOIN xechiec xc ON xc.id = b.idxechiec
             INNER JOIN xemau xm ON xm.id = xc.idxemau
             ORDER BY b.ngaytao DESC LIMIT 10"
        );
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'stats':
        $stmt = $conn->query(
            "SELECT
                COUNT(*)                                             AS total,
                SUM(trangthai = 'pending')                          AS pending,
                SUM(trangthai = 'confirmed')                        AS confirmed,
                SUM(trangthai = 'cancelled')                        AS cancelled,
                SUM(trangthai = 'completed')                        AS completed,
                SUM(CASE WHEN b.trangthai = 'completed' THEN (b.songay * xm.giathue_ngay) ELSE 0 END) AS revenue
             FROM datxe b
             INNER JOIN xechiec xc ON xc.id = b.idxechiec
             INNER JOIN xemau xm ON xm.id = xc.idxemau"
        );
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'updateStatus':
        $data          = json_decode(file_get_contents('php://input'), true);
        $id            = (int)($data['id']     ?? 0);
        $status        = $data['status']        ?? '';
        $validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];

        if (!in_array($status, $validStatuses)) {
            echo json_encode(['success' => false, 'message' => 'Trạng thái không hợp lệ']);
            break;
        }
        try {
            // cột trangthai trong datxe
            $stmt = $conn->prepare("UPDATE datxe SET trangthai = ? WHERE id = ?");
            $stmt->execute([$status, $id]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
