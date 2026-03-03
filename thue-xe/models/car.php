<?php
/**
 * Car Model
 * Xử lý logic liên quan đến xe
 */

require_once __DIR__ . '/base_model.php';

class Car extends BaseModel {
    protected $table = 'cars';
    
    // Properties
    public $id;
    public $name;
    public $brand;
    public $model;
    public $year;
    public $seats;
    public $transmission;
    public $fuel_type;
    public $price_per_day;
    public $description;
    public $features;
    public $main_image;
    public $status;
    public $created_at;
    
    /**
     * Lấy xe có sẵn
     */
    public function getAvailableCars($limit = null) {
        return $this->getAll(['status' => 'available'], 'created_at DESC', $limit);
    }
    
    /**
     * Lấy xe nổi bật (6 xe mới nhất có sẵn)
     */
    public function getFeaturedCars() {
        return $this->getAvailableCars(6);
    }
    
    /**
     * Tìm kiếm xe
     */
    public function search($filters = []) {
        try {
            $sql = "SELECT * FROM {$this->table} WHERE status = 'available'";
            $params = [];
            
            // Filter by brand
            if(!empty($filters['brand'])) {
                $sql .= " AND brand = :brand";
                $params[':brand'] = $filters['brand'];
            }
            
            // Filter by seats
            if(!empty($filters['seats'])) {
                $sql .= " AND seats = :seats";
                $params[':seats'] = $filters['seats'];
            }
            
            // Filter by price range
            if(!empty($filters['price'])) {
                if($filters['price'] == '2000000') {
                    $sql .= " AND price_per_day >= 2000000";
                } else {
                    $priceRange = explode('-', $filters['price']);
                    if(count($priceRange) == 2) {
                        $sql .= " AND price_per_day BETWEEN :min_price AND :max_price";
                        $params[':min_price'] = (float)$priceRange[0];
                        $params[':max_price'] = (float)$priceRange[1];
                    }
                }
            }
            
            // Filter by transmission
            if(!empty($filters['transmission'])) {
                $sql .= " AND transmission = :transmission";
                $params[':transmission'] = $filters['transmission'];
            }
            
            // Filter by fuel type
            if(!empty($filters['fuel_type'])) {
                $sql .= " AND fuel_type = :fuel_type";
                $params[':fuel_type'] = $filters['fuel_type'];
            }
            
            $sql .= " ORDER BY created_at DESC";
            
            $stmt = $this->conn->prepare($sql);
            
            foreach($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            $stmt->execute();
            return $stmt->fetchAll();
            
        } catch(PDOException $e) {
            error_log("Error in search: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Lấy xe cùng với hình ảnh
     */
    public function getCarWithImages($carId) {
        try {
            $car = $this->getById($carId);
            
            if(!$car) {
                return null;
            }
            
            // Get images
            $sql = "SELECT * FROM car_images WHERE car_id = :car_id ORDER BY is_main DESC, id ASC";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':car_id', $carId, PDO::PARAM_INT);
            $stmt->execute();
            $images = $stmt->fetchAll();
            
            return [
                'car' => $car,
                'images' => $images
            ];
            
        } catch(PDOException $e) {
            error_log("Error in getCarWithImages: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Lấy danh sách hãng xe
     */
    public function getBrands() {
        try {
            $sql = "SELECT DISTINCT brand FROM {$this->table} ORDER BY brand ASC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
            
        } catch(PDOException $e) {
            error_log("Error in getBrands: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Kiểm tra xe có sẵn cho thuê
     */
    public function isAvailable($carId) {
        $car = $this->getById($carId);
        return $car && $car['status'] === 'available';
    }
    
    /**
     * Cập nhật trạng thái xe
     */
    public function updateStatus($carId, $status) {
        $validStatuses = ['available', 'rented', 'maintenance'];
        
        if(!in_array($status, $validStatuses)) {
            return false;
        }
        
        return $this->update($carId, ['status' => $status]);
    }
    
    /**
     * Thêm hình ảnh cho xe
     */
    public function addImage($carId, $imagePath, $isMain = false) {
        try {
            $sql = "INSERT INTO car_images (car_id, image_path, is_main) VALUES (:car_id, :image_path, :is_main)";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':car_id', $carId, PDO::PARAM_INT);
            $stmt->bindValue(':image_path', $imagePath);
            $stmt->bindValue(':is_main', $isMain ? 1 : 0, PDO::PARAM_INT);
            
            return $stmt->execute();
            
        } catch(PDOException $e) {
            error_log("Error in addImage: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Xóa hình ảnh
     */
    public function deleteImage($imageId) {
        try {
            $sql = "DELETE FROM car_images WHERE id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $imageId, PDO::PARAM_INT);
            
            return $stmt->execute();
            
        } catch(PDOException $e) {
            error_log("Error in deleteImage: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Validate dữ liệu xe
     */
    public function validate($data) {
        $errors = [];
        
        if(empty($data['name'])) {
            $errors[] = 'Tên xe không được để trống';
        }
        
        if(empty($data['brand'])) {
            $errors[] = 'Hãng xe không được để trống';
        }
        
        if(empty($data['price_per_day']) || $data['price_per_day'] <= 0) {
            $errors[] = 'Giá thuê phải lớn hơn 0';
        }
        
        if(empty($data['seats']) || !in_array($data['seats'], [4, 5, 7, 9, 16])) {
            $errors[] = 'Số chỗ không hợp lệ';
        }
        
        return $errors;
    }
    
    /**
     * Thống kê xe theo trạng thái
     */
    public function getStatsByStatus() {
        try {
            $sql = "SELECT status, COUNT(*) as count FROM {$this->table} GROUP BY status";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            
            $stats = [];
            while($row = $stmt->fetch()) {
                $stats[$row['status']] = (int)$row['count'];
            }
            
            return $stats;
            
        } catch(PDOException $e) {
            error_log("Error in getStatsByStatus: " . $e->getMessage());
            return [];
        }
    }
}
?>