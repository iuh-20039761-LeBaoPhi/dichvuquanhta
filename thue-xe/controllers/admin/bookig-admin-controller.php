<?php
/**
 * Booking Admin Controller — v3
 * Bảng `bookings` → `datxe`, cột dùng AS alias để giữ API contract.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../../config/database.php';

// SELECT chuẩn cho datxe — alias giữ nguyên field name cũ
define('BOOKING_SELECT', "
    id,
    idkhachhang           AS user_id,
    idnhacungcap          AS provider_id,
    idxe                  AS car_id,
    tenxe                 AS car_name,
    tenkhachhang          AS customer_name,
    emailkhachhang        AS customer_email,
    dienthoaikhachhang    AS customer_phone,
    diachikhachhang       AS customer_address,
    socccd                AS id_number,
    ngaynhan              AS pickup_date,
    gionhan               AS pickup_time,
    ngaytra               AS return_date,
    gioratra              AS return_time,
    diachinhan            AS pickup_location,
    ghichu                AS notes,
    songay                AS total_days,
    tongtien              AS total_price,
    dichvuthem            AS addon_services,
    tiendichvuthem        AS addon_total,
    tamtinh               AS subtotal,
    tiengiamgia           AS discount_amount,
    tienvat               AS tax_amount,
    tiendatcoc            AS deposit_amount,
    phuphi                AS surcharge_amount,
    phicuoituan           AS weekend_surcharge_amount,
    tongcuoi              AS final_total,
    gioratre              AS late_return_hours,
    trangthai             AS status,
    ngaytao               AS created_at");

$action = $_GET['action'] ?? '';
$db     = new Database();
$conn   = $db->getConnection();

switch ($action) {
    case 'list':
        $status = $_GET['status'] ?? '';
        $sql    = "SELECT " . BOOKING_SELECT . " FROM datxe";
        $params = [];
        if ($status) {
            $sql .= " WHERE trangthai = ?";
            $params[] = $status;
        }
        $sql .= " ORDER BY ngaytao DESC";
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'recent':
        $stmt = $conn->query(
            "SELECT " . BOOKING_SELECT . " FROM datxe ORDER BY ngaytao DESC LIMIT 10"
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
                SUM(CASE WHEN trangthai = 'completed' THEN tongtien ELSE 0 END) AS revenue
             FROM datxe"
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
