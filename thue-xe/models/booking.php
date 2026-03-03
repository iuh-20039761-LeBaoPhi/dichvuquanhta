<?php
/**
 * Booking Model
 * Xử lý logic liên quan đến đặt xe
 */

require_once __DIR__ . '/base_model.php';

class Booking extends BaseModel {
    protected $table = 'bookings';
    
    // Properties
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
    
    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_COMPLETED = 'completed';
    
    /**
     * Tạo booking mới
     */
    public function createBooking($data) {
        // Calculate total days and price
        $pickup = new DateTime($data['pickup_date']);
        $return = new DateTime($data['return_date']);
        $totalDays = $pickup->diff($return)->days;
        
        if($totalDays <= 0) {
            return ['success' => false, 'message' => 'Ngày trả xe phải sau ngày nhận xe'];
        }
        
        $totalPrice = $totalDays * $data['price_per_day'];
        
        // Prepare booking data
        $bookingData = [
            'car_id' => $data['car_id'],
            'customer_name' => $data['customer_name'],
            'customer_email' => $data['customer_email'],
            'customer_phone' => $data['customer_phone'],
            'customer_address' => $data['customer_address'],
            'id_number' => $data['id_number'] ?? '',
            'pickup_date' => $data['pickup_date'],
            'return_date' => $data['return_date'],
            'pickup_location' => $data['pickup_location'] ?? '',
            'notes' => $data['notes'] ?? '',
            'total_days' => $totalDays,
            'total_price' => $totalPrice,
            'status' => self::STATUS_PENDING
        ];
        
        // Validate
        $errors = $this->validate($bookingData);
        if(!empty($errors)) {
            return ['success' => false, 'message' => implode(', ', $errors)];
        }
        
        // Create booking
        $bookingId = $this->create($bookingData);
        
        if($bookingId) {
            return ['success' => true, 'booking_id' => $bookingId];
        }
        
        return ['success' => false, 'message' => 'Không thể tạo booking'];
    }
    
    /**
     * Lấy booking với thông tin xe
     */
    public function getBookingWithCar($bookingId) {
        try {
            $sql = "SELECT b.*, c.name as car_name, c.brand, c.model, c.main_image 
                    FROM {$this->table} b 
                    LEFT JOIN cars c ON b.car_id = c.id 
                    WHERE b.id = :id";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $bookingId, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetch();
            
        } catch(PDOException $e) {
            error_log("Error in getBookingWithCar: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Lấy bookings theo status
     */
    public function getByStatus($status, $limit = null) {
        return $this->getAll(['status' => $status], 'created_at DESC', $limit);
    }
    
    /**
     * Lấy bookings gần đây
     */
    public function getRecentBookings($limit = 10) {
        try {
            $sql = "SELECT b.*, c.name as car_name 
                    FROM {$this->table} b 
                    LEFT JOIN cars c ON b.car_id = c.id 
                    ORDER BY b.created_at DESC 
                    LIMIT :limit";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in getRecentBookings: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Cập nhật trạng thái booking
     */
    public function updateStatus($bookingId, $status) {
        $validStatuses = [
            self::STATUS_PENDING,
            self::STATUS_CONFIRMED,
            self::STATUS_CANCELLED,
            self::STATUS_COMPLETED
        ];
        
        if(!in_array($status, $validStatuses)) {
            return false;
        }
        
        return $this->update($bookingId, ['status' => $status]);
    }
    
    /**
     * Xác nhận booking
     */
    public function confirm($bookingId) {
        return $this->updateStatus($bookingId, self::STATUS_CONFIRMED);
    }
    
    /**
     * Hủy booking
     */
    public function cancel($bookingId) {
        return $this->updateStatus($bookingId, self::STATUS_CANCELLED);
    }
    
    /**
     * Hoàn thành booking
     */
    public function complete($bookingId) {
        return $this->updateStatus($bookingId, self::STATUS_COMPLETED);
    }
    
    /**
     * Validate dữ liệu booking
     */
    public function validate($data) {
        $errors = [];
        
        if(empty($data['car_id'])) {
            $errors[] = 'Xe không được để trống';
        }
        
        if(empty($data['customer_name'])) {
            $errors[] = 'Tên khách hàng không được để trống';
        }
        
        if(empty($data['customer_email']) || !filter_var($data['customer_email'], FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Email không hợp lệ';
        }
        
        if(empty($data['customer_phone'])) {
            $errors[] = 'Số điện thoại không được để trống';
        }
        
        if(empty($data['pickup_date'])) {
            $errors[] = 'Ngày nhận xe không được để trống';
        }
        
        if(empty($data['return_date'])) {
            $errors[] = 'Ngày trả xe không được để trống';
        }
        
        if(!empty($data['pickup_date']) && !empty($data['return_date'])) {
            if(strtotime($data['return_date']) <= strtotime($data['pickup_date'])) {
                $errors[] = 'Ngày trả xe phải sau ngày nhận xe';
            }
        }
        
        return $errors;
    }
    
    /**
     * Kiểm tra xe có available trong khoảng thời gian không
     */
    public function isCarAvailable($carId, $pickupDate, $returnDate, $excludeBookingId = null) {
        try {
            $sql = "SELECT COUNT(*) as count FROM {$this->table} 
                    WHERE car_id = :car_id 
                    AND status NOT IN ('cancelled', 'completed')
                    AND (
                        (pickup_date <= :pickup_date AND return_date >= :pickup_date) OR
                        (pickup_date <= :return_date AND return_date >= :return_date) OR
                        (pickup_date >= :pickup_date AND return_date <= :return_date)
                    )";
            
            if($excludeBookingId) {
                $sql .= " AND id != :exclude_id";
            }
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':car_id', $carId, PDO::PARAM_INT);
            $stmt->bindValue(':pickup_date', $pickupDate);
            $stmt->bindValue(':return_date', $returnDate);
            
            if($excludeBookingId) {
                $stmt->bindValue(':exclude_id', $excludeBookingId, PDO::PARAM_INT);
            }
            
            $stmt->execute();
            $result = $stmt->fetch();
            
            return $result['count'] == 0;
            
        } catch(PDOException $e) {
            error_log("Error in isCarAvailable: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Thống kê bookings
     */
    public function getStats() {
        try {
            $sql = "SELECT 
                    COUNT(*) as total_bookings,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                    SUM(total_price) as total_revenue,
                    AVG(total_days) as avg_rental_days
                    FROM {$this->table}";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetch();
            
        } catch(PDOException $e) {
            error_log("Error in getStats: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Lấy doanh thu theo tháng
     */
    public function getRevenueByMonth($year) {
        try {
            $sql = "SELECT 
                    MONTH(created_at) as month,
                    SUM(total_price) as revenue,
                    COUNT(*) as bookings
                    FROM {$this->table}
                    WHERE YEAR(created_at) = :year 
                    AND status = 'completed'
                    GROUP BY MONTH(created_at)
                    ORDER BY month ASC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':year', $year, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in getRevenueByMonth: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Tìm kiếm bookings
     */
    public function search($keyword) {
        try {
            $sql = "SELECT b.*, c.name as car_name 
                    FROM {$this->table} b 
                    LEFT JOIN cars c ON b.car_id = c.id 
                    WHERE b.customer_name LIKE :keyword 
                    OR b.customer_email LIKE :keyword 
                    OR b.customer_phone LIKE :keyword 
                    OR c.name LIKE :keyword
                    ORDER BY b.created_at DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':keyword', "%$keyword%");
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in search: " . $e->getMessage());
            return [];
        }
    }
}
?>