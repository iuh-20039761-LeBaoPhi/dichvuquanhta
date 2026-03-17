<?php
ini_set('display_errors', 0);
error_reporting(0);
header('Content-Type: application/json');
require_once '../config/database.php';

class BookingController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function create() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $pickup = new DateTime($data['pickup_date']);
            $return = new DateTime($data['return_date']);
            $diff = $pickup->diff($return);
            $total_days = $diff->invert ? -$diff->days : $diff->days;

            if($total_days < 0) {
                echo json_encode(['success' => false, 'message' => 'Ngày trả xe phải sau ngày nhận xe']);
                return;
            }
            if($total_days === 0) $total_days = 1;

            $addon_services = json_encode($data['addon_services'] ?? [], JSON_UNESCAPED_UNICODE);
            $addon_total    = (float)($data['addon_total'] ?? 0);
            $total_price    = $total_days * $data['price_per_day'] + $addon_total;

            $sql = "INSERT INTO bookings (car_id, car_name, customer_name, customer_email, customer_phone,
                    customer_address, id_number, pickup_date, return_date, pickup_location,
                    notes, total_days, total_price, addon_services, addon_total, status)
                    VALUES (:car_id, :car_name, :name, :email, :phone, :address, :id_number, :pickup, :return,
                    :location, :notes, :days, :price, :addon_services, :addon_total, 'pending')";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':car_id'         => $data['car_id'],
                ':car_name'       => $data['car_name'] ?? '',
                ':name'           => $data['customer_name'],
                ':email'          => $data['customer_email'],
                ':phone'          => $data['customer_phone'],
                ':address'        => $data['customer_address'],
                ':id_number'      => $data['id_number'] ?? '',
                ':pickup'         => $data['pickup_date'],
                ':return'         => $data['return_date'],
                ':location'       => $data['pickup_location'] ?? '',
                ':notes'          => $data['notes'] ?? '',
                ':days'           => $total_days,
                ':price'          => $total_price,
                ':addon_services' => $addon_services,
                ':addon_total'    => $addon_total,
            ]);

            echo json_encode(['success' => true, 'booking_id' => $this->conn->lastInsertId()]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function trackByPhone() {
        try {
            $phone = trim($_GET['phone'] ?? '');
            if (empty($phone)) {
                echo json_encode(['success' => false, 'message' => 'Vui lòng nhập số điện thoại']);
                return;
            }
            $sql = "SELECT * FROM bookings WHERE customer_phone = :phone ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':phone' => $phone]);
            $bookings = $stmt->fetchAll();
            echo json_encode(['success' => true, 'data' => $bookings]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getById() {
        try {
            $id = (int)($_GET['id'] ?? 0);
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'ID không hợp lệ']);
                return;
            }
            $sql = "SELECT * FROM bookings WHERE id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':id' => $id]);
            $booking = $stmt->fetch();
            if ($booking) {
                echo json_encode(['success' => true, 'data' => $booking]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy đơn đặt xe']);
            }
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$controller = new BookingController();
$action = $_GET['action'] ?? 'create';
match($action) {
    'create'        => $controller->create(),
    'getById'       => $controller->getById(),
    'trackByPhone'  => $controller->trackByPhone(),
    default         => print(json_encode(['success' => false, 'message' => 'Invalid action']))
};
?>
