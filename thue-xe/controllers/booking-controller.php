<?php
/**
 * Booking Controller — v3
 *
 * Thay đổi so với v2:
 *  - Bảng `bookings` → `datxe`
 *  - Tên cột dùng tên tiếng Việt không dấu trong SQL
 *  - SELECT dùng AS alias để output JSON giữ nguyên field name cũ
 *  - Bỏ fallback schema cũ (migration đã chạy)
 *
 * Giữ nguyên:
 *  - Logic nghiệp vụ (server-side price calc, overlap check, session)
 *  - API contract (input fields, output JSON)
 */

ini_set('display_errors', 0);
error_reporting(0);

require_once __DIR__ . '/session.php';

header('Content-Type: application/json; charset=utf-8');
require_once '../config/database.php';

class BookingController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    // ─────────────────────────────────────────────────────────────
    // POST ?action=create
    // ─────────────────────────────────────────────────────────────
    public function create() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
                return;
            }

            /* ── 1. Đọc user_id từ session ── */
            $user_id = (
                isset($_SESSION['user_id'], $_SESSION['user_role'])
                && $_SESSION['user_role'] === 'customer'
            ) ? (int)$_SESSION['user_id'] : null;

            /* ── 2. Validate input bắt buộc ── */
            $car_id      = (int)($data['car_id']     ?? 0);
            $pickup_date = trim($data['pickup_date'] ?? '');
            $return_date = trim($data['return_date'] ?? '');

            $pickup_time = preg_match('/^\d{2}:\d{2}$/', $data['pickup_time'] ?? '')
                               ? $data['pickup_time'] : '08:00';
            $return_time = preg_match('/^\d{2}:\d{2}$/', $data['return_time'] ?? '')
                               ? $data['return_time'] : '08:00';

            if (!$car_id || !$pickup_date || !$return_date) {
                echo json_encode(['success' => false, 'message' => 'Thiếu thông tin bắt buộc']);
                return;
            }

            /* ── 3. Validate datetime ── */
            $pickupDT = DateTime::createFromFormat('Y-m-d H:i', "$pickup_date $pickup_time");
            $returnDT = DateTime::createFromFormat('Y-m-d H:i', "$return_date $return_time");

            if (!$pickupDT || !$returnDT) {
                echo json_encode(['success' => false, 'message' => 'Ngày hoặc giờ không hợp lệ']);
                return;
            }
            if ($returnDT <= $pickupDT) {
                echo json_encode(['success' => false, 'message' => 'Thời gian trả xe phải sau thời gian nhận xe']);
                return;
            }
            if ($pickupDT < new DateTime('today')) {
                echo json_encode(['success' => false, 'message' => 'Ngày nhận xe không được ở quá khứ']);
                return;
            }

            $diff       = $pickupDT->diff($returnDT);
            $total_days = max(1, (int)$diff->days);

            /* ── 4. Lấy xe từ bảng `xe` — KHÔNG tin giá từ client ── */
            $carStmt = $this->conn->prepare(
                'SELECT id, ten AS name, trangthai AS status,
                        giathue AS price_per_day,
                        tilephicuoituan AS weekend_surcharge_rate,
                        tiledatcoc AS deposit_rate,
                        idnhacungcap AS provider_id
                 FROM `xe` WHERE `id` = :id LIMIT 1'
            );
            $carStmt->execute([':id' => $car_id]);
            $car = $carStmt->fetch(PDO::FETCH_ASSOC);

            if (!$car) {
                echo json_encode(['success' => false, 'message' => 'Xe không tồn tại']);
                return;
            }
            if ($car['status'] !== 'available') {
                echo json_encode(['success' => false, 'message' => 'Xe hiện không còn khả dụng để đặt']);
                return;
            }

            $price_per_day = (float)$car['price_per_day'];
            $weekend_rate  = (float)($car['weekend_surcharge_rate'] ?? 0.10);
            $deposit_rate  = (float)($car['deposit_rate']           ?? 0.30);
            $provider_id   = $car['provider_id'] ?? null;

            /* ── 5. Kiểm tra trùng lịch xe trong `datxe` ── */
            $overlapStmt = $this->conn->prepare(
                "SELECT COUNT(*) FROM `datxe`
                 WHERE `idxe`     = :car_id
                   AND `trangthai` IN ('pending', 'confirmed')
                   AND `ngaynhan`  < :return_date
                   AND `ngaytra`   > :pickup_date"
            );
            $overlapStmt->execute([
                ':car_id'      => $car_id,
                ':return_date' => $return_date,
                ':pickup_date' => $pickup_date,
            ]);
            if ((int)$overlapStmt->fetchColumn() > 0) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Xe đã được đặt trong khoảng thời gian này. '
                               . 'Vui lòng chọn ngày khác hoặc gọi hotline 0775 472 347.',
                ]);
                return;
            }

            /* ── 6. Tính phụ thu cuối tuần ── */
            $weekend_days = 0;
            $cur  = new DateTime($pickup_date);
            $endD = new DateTime($return_date);
            while ($cur < $endD) {
                if ((int)$cur->format('N') >= 6) $weekend_days++;
                $cur->modify('+1 day');
            }
            $weekend_surcharge_amount = (int)round($weekend_days * $price_per_day * $weekend_rate);

            /* ── 7. Tính addon từ bảng `dichvu` — KHÔNG tin addon_total từ client ── */
            $addon_services_names = array_values(
                array_filter((array)($data['addon_services'] ?? []), 'is_string')
            );
            $addon_total_float = 0.0;

            if (!empty($addon_services_names)) {
                $ph      = implode(',', array_fill(0, count($addon_services_names), '?'));
                $svcStmt = $this->conn->prepare(
                    "SELECT ten AS name, gia AS price, donvi AS unit
                     FROM `dichvu`
                     WHERE `ten` IN ($ph) AND `trangthai` = 1"
                );
                $svcStmt->execute($addon_services_names);
                foreach ($svcStmt->fetchAll(PDO::FETCH_ASSOC) as $svc) {
                    $unit = $svc['unit'] ?? 'chuyến';
                    $addon_total_float += ($unit === 'ngày')
                        ? (float)$svc['price'] * $total_days
                        : (float)$svc['price'];
                }
            }

            /* ── 8. Công thức tính tiền server-side ── */
            $subtotal         = (int)round($total_days * $price_per_day);
            $addon_total      = (int)round($addon_total_float);
            $tax_base         = $subtotal + $weekend_surcharge_amount + $addon_total;
            $tax_amount       = (int)round($tax_base * 0.10);
            $deposit_amount   = (int)round($subtotal * $deposit_rate);
            $discount_amount  = 0;
            $surcharge_amount = 0;
            $final_total      = $subtotal + $weekend_surcharge_amount + $addon_total
                              + $tax_amount - $discount_amount;

            $addon_json = json_encode($addon_services_names, JSON_UNESCAPED_UNICODE);

            /* ── 9. INSERT vào bảng `datxe` ── */
            $sql = "INSERT INTO `datxe` (
                        `idkhachhang`, `idnhacungcap`, `idxe`, `tenxe`,
                        `tenkhachhang`, `emailkhachhang`, `dienthoaikhachhang`, `diachikhachhang`,
                        `socccd`, `ngaynhan`, `ngaytra`, `gionhan`, `gioratra`,
                        `diachinhan`, `ghichu`,
                        `songay`, `tongtien`, `dichvuthem`, `tiendichvuthem`,
                        `tamtinh`, `tiengiamgia`, `tienvat`, `tiendatcoc`,
                        `phuphi`, `phicuoituan`, `tongcuoi`,
                        `trangthai`
                    ) VALUES (
                        :user_id, :provider_id, :car_id, :car_name,
                        :name, :email, :phone, :address,
                        :id_number, :pickup, :return, :pickup_time, :return_time,
                        :location, :notes,
                        :days, :total_price, :addon_services, :addon_total,
                        :subtotal, :discount, :tax, :deposit,
                        :surcharge, :weekend_surcharge, :final_total,
                        'pending'
                    )";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                ':user_id'           => $user_id,
                ':provider_id'       => $provider_id,
                ':car_id'            => $car_id,
                ':car_name'          => $car['name'] ?? ($data['car_name'] ?? ''),
                ':name'              => $data['customer_name']    ?? '',
                ':email'             => $data['customer_email']   ?? '',
                ':phone'             => $data['customer_phone']   ?? '',
                ':address'           => $data['customer_address'] ?? '',
                ':id_number'         => $data['id_number']        ?? '',
                ':pickup'            => $pickup_date,
                ':return'            => $return_date,
                ':pickup_time'       => $pickup_time . ':00',
                ':return_time'       => $return_time . ':00',
                ':location'          => $data['pickup_location']  ?? '',
                ':notes'             => $data['notes']            ?? '',
                ':days'              => $total_days,
                ':total_price'       => $final_total,
                ':addon_services'    => $addon_json,
                ':addon_total'       => $addon_total,
                ':subtotal'          => $subtotal,
                ':discount'          => $discount_amount,
                ':tax'               => $tax_amount,
                ':deposit'           => $deposit_amount,
                ':surcharge'         => $surcharge_amount,
                ':weekend_surcharge' => $weekend_surcharge_amount,
                ':final_total'       => $final_total,
            ]);

            $booking_id = (int)$this->conn->lastInsertId();

            echo json_encode([
                'success'                  => true,
                'booking_id'               => $booking_id,
                'total_days'               => $total_days,
                'subtotal'                 => $subtotal,
                'addon_total'              => $addon_total,
                'weekend_surcharge_amount' => $weekend_surcharge_amount,
                'tax_amount'               => $tax_amount,
                'deposit_amount'           => $deposit_amount,
                'final_total'              => $final_total,
            ]);

        } catch (Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // GET ?action=getById&id=X
    // ─────────────────────────────────────────────────────────────
    public function getById() {
        try {
            $id = (int)($_GET['id'] ?? 0);
            if (!$id) {
                echo json_encode(['success' => false, 'message' => 'ID không hợp lệ']);
                return;
            }

            // SELECT với alias để output JSON giữ nguyên field name cũ
            $stmt = $this->conn->prepare(
                "SELECT
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
                    ngaytao               AS created_at
                 FROM `datxe` WHERE `id` = :id"
            );
            $stmt->execute([':id' => $id]);
            $booking = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($booking) {
                echo json_encode(['success' => true, 'data' => $booking]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy đơn đặt xe']);
            }
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // GET ?action=trackByPhone&phone=X
    // ─────────────────────────────────────────────────────────────
    public function trackByPhone() {
        try {
            $phone = trim($_GET['phone'] ?? '');
            if (empty($phone)) {
                echo json_encode(['success' => false, 'message' => 'Vui lòng nhập số điện thoại']);
                return;
            }

            $stmt = $this->conn->prepare(
                "SELECT
                    id,
                    idxe               AS car_id,
                    tenxe              AS car_name,
                    tenkhachhang       AS customer_name,
                    emailkhachhang     AS customer_email,
                    dienthoaikhachhang AS customer_phone,
                    socccd             AS id_number,
                    ngaynhan           AS pickup_date,
                    gionhan            AS pickup_time,
                    ngaytra            AS return_date,
                    gioratra           AS return_time,
                    diachinhan         AS pickup_location,
                    ghichu             AS notes,
                    songay             AS total_days,
                    tongtien           AS total_price,
                    tiendichvuthem     AS addon_total,
                    tamtinh            AS subtotal,
                    tienvat            AS tax_amount,
                    tiendatcoc         AS deposit_amount,
                    phicuoituan        AS weekend_surcharge_amount,
                    tongcuoi           AS final_total,
                    trangthai          AS status,
                    ngaytao            AS created_at
                 FROM `datxe`
                 WHERE `dienthoaikhachhang` = :phone
                 ORDER BY `ngaytao` DESC"
            );
            $stmt->execute([':phone' => $phone]);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);

        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

/* ── Router ── */
$controller = new BookingController();
$action     = $_GET['action'] ?? 'create';

match ($action) {
    'create'       => $controller->create(),
    'getById'      => $controller->getById(),
    'trackByPhone' => $controller->trackByPhone(),
    default        => print(json_encode(['success' => false, 'message' => 'Invalid action'])),
};
