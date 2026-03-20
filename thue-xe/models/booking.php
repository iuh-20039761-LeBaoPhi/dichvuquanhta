<?php
/**
 * Booking Model — v3 (bảng `datxe`, cột tiếng Việt không dấu)
 * API contract giữ nguyên nhờ AS alias trong selectSql.
 */

require_once __DIR__ . '/base-model.php';

class Booking extends BaseModel {
    protected $table = 'datxe';

    /**
     * SELECT với AS alias: output JSON giữ nguyên field name cũ.
     */
    protected $selectSql = "
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
        ngaytao               AS created_at";

    /**
     * Ánh xạ English key → Vietnamese DB column.
     */
    protected $columnMap = [
        'user_id'                  => 'idkhachhang',
        'provider_id'              => 'idnhacungcap',
        'car_id'                   => 'idxe',
        'car_name'                 => 'tenxe',
        'customer_name'            => 'tenkhachhang',
        'customer_email'           => 'emailkhachhang',
        'customer_phone'           => 'dienthoaikhachhang',
        'customer_address'         => 'diachikhachhang',
        'id_number'                => 'socccd',
        'pickup_date'              => 'ngaynhan',
        'pickup_time'              => 'gionhan',
        'return_date'              => 'ngaytra',
        'return_time'              => 'gioratra',
        'pickup_location'          => 'diachinhan',
        'notes'                    => 'ghichu',
        'total_days'               => 'songay',
        'total_price'              => 'tongtien',
        'addon_services'           => 'dichvuthem',
        'addon_total'              => 'tiendichvuthem',
        'subtotal'                 => 'tamtinh',
        'discount_amount'          => 'tiengiamgia',
        'tax_amount'               => 'tienvat',
        'deposit_amount'           => 'tiendatcoc',
        'surcharge_amount'         => 'phuphi',
        'weekend_surcharge_amount' => 'phicuoituan',
        'final_total'              => 'tongcuoi',
        'late_return_hours'        => 'gioratre',
        'status'                   => 'trangthai',
        'created_at'               => 'ngaytao',
    ];

    // Properties (English — tương thích code ngoài)
    public $id;
    public $car_id;
    public $customer_name;
    public $customer_email;
    public $customer_phone;
    public $customer_address;
    public $id_number;
    public $pickup_date;
    public $return_date;
    public $pickup_location;
    public $notes;
    public $total_days;
    public $total_price;
    public $status;
    public $created_at;

    // Status constants — giữ English ENUM values
    const STATUS_PENDING   = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_COMPLETED = 'completed';

    /**
     * Tạo booking mới (legacy helper — booking-controller.php dùng SQL trực tiếp).
     */
    public function createBooking($data) {
        $pickup = new DateTime($data['pickup_date']);
        $return = new DateTime($data['return_date']);
        $totalDays = $pickup->diff($return)->days;

        if ($totalDays <= 0) {
            return ['success' => false, 'message' => 'Ngày trả xe phải sau ngày nhận xe'];
        }

        $totalPrice = $totalDays * $data['price_per_day'];

        // columnMap tự động dịch khi gọi create()
        $bookingData = [
            'car_id'           => $data['car_id'],
            'customer_name'    => $data['customer_name'],
            'customer_email'   => $data['customer_email'],
            'customer_phone'   => $data['customer_phone'],
            'customer_address' => $data['customer_address'],
            'id_number'        => $data['id_number'] ?? '',
            'pickup_date'      => $data['pickup_date'],
            'return_date'      => $data['return_date'],
            'pickup_location'  => $data['pickup_location'] ?? '',
            'notes'            => $data['notes'] ?? '',
            'total_days'       => $totalDays,
            'total_price'      => $totalPrice,
            'status'           => self::STATUS_PENDING,
        ];

        $errors = $this->validate($bookingData);
        if (!empty($errors)) {
            return ['success' => false, 'message' => implode(', ', $errors)];
        }

        $bookingId = $this->create($bookingData);
        if ($bookingId) {
            return ['success' => true, 'booking_id' => $bookingId];
        }

        return ['success' => false, 'message' => 'Không thể tạo booking'];
    }

    /**
     * Lấy booking với thông tin xe (JOIN).
     */
    public function getBookingWithCar($bookingId) {
        try {
            $sql = "SELECT
                        b.id,
                        b.idkhachhang           AS user_id,
                        b.idnhacungcap          AS provider_id,
                        b.idxe                  AS car_id,
                        b.tenxe                 AS car_name,
                        b.tenkhachhang          AS customer_name,
                        b.emailkhachhang        AS customer_email,
                        b.dienthoaikhachhang    AS customer_phone,
                        b.diachikhachhang       AS customer_address,
                        b.socccd                AS id_number,
                        b.ngaynhan              AS pickup_date,
                        b.gionhan               AS pickup_time,
                        b.ngaytra               AS return_date,
                        b.gioratra              AS return_time,
                        b.diachinhan            AS pickup_location,
                        b.ghichu                AS notes,
                        b.songay                AS total_days,
                        b.tongtien              AS total_price,
                        b.dichvuthem            AS addon_services,
                        b.tiendichvuthem        AS addon_total,
                        b.tamtinh               AS subtotal,
                        b.tiengiamgia           AS discount_amount,
                        b.tienvat               AS tax_amount,
                        b.tiendatcoc            AS deposit_amount,
                        b.phuphi                AS surcharge_amount,
                        b.phicuoituan           AS weekend_surcharge_amount,
                        b.tongcuoi              AS final_total,
                        b.gioratre              AS late_return_hours,
                        b.trangthai             AS status,
                        b.ngaytao               AS created_at,
                        x.ten                   AS car_display_name,
                        x.thuonghieu            AS brand,
                        x.model,
                        x.anhchinh              AS main_image
                    FROM {$this->table} b
                    LEFT JOIN xe x ON b.idxe = x.id
                    WHERE b.id = :id";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $bookingId, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetch();

        } catch (PDOException $e) {
            error_log("Error in Booking::getBookingWithCar: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Lấy bookings theo status.
     */
    public function getByStatus($status, $limit = null) {
        return $this->getAll(['status' => $status], 'ngaytao DESC', $limit);
    }

    /**
     * Lấy bookings gần đây.
     */
    public function getRecentBookings($limit = 10) {
        try {
            $sql = "SELECT
                        b.id, b.tenxe AS car_name, b.tenkhachhang AS customer_name,
                        b.dienthoaikhachhang AS customer_phone,
                        b.ngaynhan AS pickup_date, b.ngaytra AS return_date,
                        b.songay AS total_days, b.tongtien AS total_price,
                        b.trangthai AS status, b.ngaytao AS created_at
                    FROM {$this->table} b
                    ORDER BY b.ngaytao DESC
                    LIMIT :lim";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in Booking::getRecentBookings: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Cập nhật trạng thái booking.
     */
    public function updateStatus($bookingId, $status) {
        $validStatuses = [
            self::STATUS_PENDING,
            self::STATUS_CONFIRMED,
            self::STATUS_CANCELLED,
            self::STATUS_COMPLETED,
        ];
        if (!in_array($status, $validStatuses)) return false;
        // columnMap dịch 'status' → 'trangthai'
        return $this->update($bookingId, ['status' => $status]);
    }

    public function confirm($bookingId)  { return $this->updateStatus($bookingId, self::STATUS_CONFIRMED); }
    public function cancel($bookingId)   { return $this->updateStatus($bookingId, self::STATUS_CANCELLED); }
    public function complete($bookingId) { return $this->updateStatus($bookingId, self::STATUS_COMPLETED); }

    /**
     * Validate dữ liệu booking (keys English).
     */
    public function validate($data) {
        $errors = [];

        if (empty($data['car_id'])) {
            $errors[] = 'Xe không được để trống';
        }
        if (empty($data['customer_name'])) {
            $errors[] = 'Tên khách hàng không được để trống';
        }
        if (empty($data['customer_email']) || !filter_var($data['customer_email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email không hợp lệ';
        }
        if (empty($data['customer_phone'])) {
            $errors[] = 'Số điện thoại không được để trống';
        }
        if (empty($data['pickup_date'])) {
            $errors[] = 'Ngày nhận xe không được để trống';
        }
        if (empty($data['return_date'])) {
            $errors[] = 'Ngày trả xe không được để trống';
        }
        if (!empty($data['pickup_date']) && !empty($data['return_date'])) {
            if (strtotime($data['return_date']) <= strtotime($data['pickup_date'])) {
                $errors[] = 'Ngày trả xe phải sau ngày nhận xe';
            }
        }

        return $errors;
    }

    /**
     * Kiểm tra xe có available trong khoảng thời gian.
     */
    public function isCarAvailable($carId, $pickupDate, $returnDate, $excludeBookingId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM {$this->table}
                    WHERE idxe = :car_id
                    AND trangthai NOT IN ('cancelled', 'completed')
                    AND (
                        (ngaynhan <= :pickup_date AND ngaytra >= :pickup_date) OR
                        (ngaynhan <= :return_date AND ngaytra >= :return_date) OR
                        (ngaynhan >= :pickup_date AND ngaytra <= :return_date)
                    )";

            if ($excludeBookingId) {
                $sql .= " AND id != :exclude_id";
            }

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':car_id',      $carId,      PDO::PARAM_INT);
            $stmt->bindValue(':pickup_date', $pickupDate);
            $stmt->bindValue(':return_date', $returnDate);

            if ($excludeBookingId) {
                $stmt->bindValue(':exclude_id', $excludeBookingId, PDO::PARAM_INT);
            }

            $stmt->execute();
            $result = $stmt->fetch();
            return $result['count'] == 0;

        } catch (PDOException $e) {
            error_log("Error in Booking::isCarAvailable: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Thống kê bookings.
     */
    public function getStats() {
        try {
            $sql = "SELECT
                        COUNT(*) as total_bookings,
                        SUM(CASE WHEN trangthai = 'pending'   THEN 1 ELSE 0 END) as pending,
                        SUM(CASE WHEN trangthai = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                        SUM(CASE WHEN trangthai = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                        SUM(CASE WHEN trangthai = 'completed' THEN 1 ELSE 0 END) as completed,
                        SUM(tongtien) as total_revenue,
                        AVG(songay)   as avg_rental_days
                    FROM {$this->table}";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            return $stmt->fetch();

        } catch (PDOException $e) {
            error_log("Error in Booking::getStats: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Doanh thu theo tháng.
     */
    public function getRevenueByMonth($year) {
        try {
            $sql = "SELECT
                        MONTH(ngaytao) as month,
                        SUM(tongtien)  as revenue,
                        COUNT(*)       as bookings
                    FROM {$this->table}
                    WHERE YEAR(ngaytao) = :year AND trangthai = 'completed'
                    GROUP BY MONTH(ngaytao)
                    ORDER BY month ASC";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':year', $year, PDO::PARAM_INT);
            $stmt->execute();
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in Booking::getRevenueByMonth: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Tìm kiếm bookings.
     */
    public function search($keyword) {
        try {
            $sql = "SELECT
                        b.id,
                        b.tenxe              AS car_name,
                        b.tenkhachhang       AS customer_name,
                        b.emailkhachhang     AS customer_email,
                        b.dienthoaikhachhang AS customer_phone,
                        b.ngaynhan           AS pickup_date,
                        b.ngaytra            AS return_date,
                        b.songay             AS total_days,
                        b.tongtien           AS total_price,
                        b.trangthai          AS status,
                        b.ngaytao            AS created_at
                    FROM {$this->table} b
                    LEFT JOIN xe x ON b.idxe = x.id
                    WHERE b.tenkhachhang       LIKE :kw
                       OR b.emailkhachhang     LIKE :kw
                       OR b.dienthoaikhachhang LIKE :kw
                       OR x.ten                LIKE :kw
                    ORDER BY b.ngaytao DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':kw', "%$keyword%");
            $stmt->execute();
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in Booking::search: " . $e->getMessage());
            return [];
        }
    }
}
?>
