<?php
/**
 * Service Model
 * Xử lý logic liên quan đến dịch vụ
 */

require_once __DIR__ . '/base_model.php';

class Service extends BaseModel {
    protected $table = 'services';
    
    // Properties
    public $id;
    public $name;
    public $description;
    public $price;
    public $icon;
    public $status;
    public $created_at;
    
    /**
     * Lấy dịch vụ đang hoạt động
     */
    public function getActiveServices() {
        return $this->getAll(['status' => 1], 'id ASC');
    }
    
    /**
     * Lấy dịch vụ theo IDs
     */
    public function getByIds($serviceIds) {
        try {
            if(empty($serviceIds)) {
                return [];
            }
            
            $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
            $sql = "SELECT * FROM {$this->table} WHERE id IN ($placeholders) AND status = 1";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($serviceIds);
            
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in getByIds: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Tính tổng giá các dịch vụ
     */
    public function calculateTotalPrice($serviceIds) {
        $services = $this->getByIds($serviceIds);
        $total = 0;
        
        foreach($services as $service) {
            $total += (float)$service['price'];
        }
        
        return $total;
    }
    
    /**
     * Kích hoạt/Vô hiệu hóa dịch vụ
     */
    public function toggleStatus($serviceId) {
        $service = $this->getById($serviceId);
        
        if(!$service) {
            return false;
        }
        
        $newStatus = $service['status'] == 1 ? 0 : 1;
        return $this->update($serviceId, ['status' => $newStatus]);
    }
    
    /**
     * Validate dữ liệu dịch vụ
     */
    public function validate($data) {
        $errors = [];
        
        if(empty($data['name'])) {
            $errors[] = 'Tên dịch vụ không được để trống';
        }
        
        if(empty($data['price']) || $data['price'] < 0) {
            $errors[] = 'Giá dịch vụ phải lớn hơn hoặc bằng 0';
        }
        
        if(empty($data['icon'])) {
            $errors[] = 'Icon không được để trống';
        }
        
        return $errors;
    }
    
    /**
     * Tìm kiếm dịch vụ
     */
    public function search($keyword) {
        try {
            $sql = "SELECT * FROM {$this->table} 
                    WHERE (name LIKE :keyword OR description LIKE :keyword) 
                    AND status = 1 
                    ORDER BY name ASC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':keyword', "%$keyword%");
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in search: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Lấy dịch vụ phổ biến nhất (được đặt nhiều nhất)
     */
    public function getPopularServices($limit = 5) {
        try {
            // Giả sử có bảng booking_services lưu các dịch vụ được đặt
            $sql = "SELECT s.*, COUNT(bs.service_id) as usage_count 
                    FROM {$this->table} s 
                    LEFT JOIN booking_services bs ON s.id = bs.service_id 
                    WHERE s.status = 1 
                    GROUP BY s.id 
                    ORDER BY usage_count DESC 
                    LIMIT :limit";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            // Nếu bảng booking_services chưa tồn tại, trả về dịch vụ thông thường
            return $this->getActiveServices();
        }
    }
    
    /**
     * Thống kê dịch vụ
     */
    public function getStats() {
        try {
            $sql = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as inactive,
                    AVG(price) as avg_price,
                    MIN(price) as min_price,
                    MAX(price) as max_price
                    FROM {$this->table}";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetch();
            
        } catch(PDOException $e) {
            error_log("Error in getStats: " . $e->getMessage());
            return null;
        }
    }
}
?>