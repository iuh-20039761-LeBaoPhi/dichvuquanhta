<?php
/**
 * Service Model — v3 (bảng `dichvu`, cột tiếng Việt không dấu)
 * API contract giữ nguyên nhờ AS alias trong selectSql.
 */

require_once __DIR__ . '/base-model.php';

class Service extends BaseModel {
    protected $table = 'dichvu';

    /**
     * SELECT với AS alias: output JSON giữ nguyên field name cũ.
     * ENUM donvi giữ giá trị 'ngày'/'chuyến' → field 'unit' output không đổi.
     */
    protected $selectSql = "
        id,
        ten        AS name,
        icon,
        gia        AS price,
        donvi      AS unit,
        mota       AS description,
        trangthai  AS status";

    /**
     * Ánh xạ English key → Vietnamese DB column.
     */
    protected $columnMap = [
        'name'        => 'ten',
        'price'       => 'gia',
        'unit'        => 'donvi',
        'description' => 'mota',
        'status'      => 'trangthai',
    ];

    // Properties
    public $id;
    public $name;
    public $description;
    public $price;
    public $icon;
    public $status;

    /**
     * Lấy dịch vụ đang hoạt động.
     */
    public function getActiveServices() {
        return $this->getAll(['status' => 1], 'id ASC');
    }

    /**
     * Lấy dịch vụ theo IDs.
     */
    public function getByIds($serviceIds) {
        try {
            if (empty($serviceIds)) return [];

            $placeholders = implode(',', array_fill(0, count($serviceIds), '?'));
            $sql  = "SELECT {$this->selectSql} FROM {$this->table}
                     WHERE id IN ($placeholders) AND trangthai = 1";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($serviceIds);
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in Service::getByIds: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Tính tổng giá các dịch vụ.
     */
    public function calculateTotalPrice($serviceIds) {
        $services = $this->getByIds($serviceIds);
        $total    = 0;
        foreach ($services as $service) {
            $total += (float)$service['price'];
        }
        return $total;
    }

    /**
     * Kích hoạt/Vô hiệu hóa dịch vụ.
     */
    public function toggleStatus($serviceId) {
        $service = $this->getById($serviceId);
        if (!$service) return false;
        // 'status' alias đã được xử lý trong selectSql, giá trị trả về là int
        $newStatus = $service['status'] == 1 ? 0 : 1;
        return $this->update($serviceId, ['status' => $newStatus]);
    }

    /**
     * Validate dữ liệu dịch vụ.
     */
    public function validate($data) {
        $errors = [];
        if (empty($data['name'])) {
            $errors[] = 'Tên dịch vụ không được để trống';
        }
        if (!isset($data['price']) || $data['price'] < 0) {
            $errors[] = 'Giá dịch vụ phải lớn hơn hoặc bằng 0';
        }
        if (empty($data['icon'])) {
            $errors[] = 'Icon không được để trống';
        }
        return $errors;
    }

    /**
     * Tìm kiếm dịch vụ.
     */
    public function search($keyword) {
        try {
            $sql  = "SELECT {$this->selectSql}
                     FROM {$this->table}
                     WHERE (ten LIKE :kw OR mota LIKE :kw) AND trangthai = 1
                     ORDER BY ten ASC";

            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':kw', "%$keyword%");
            $stmt->execute();
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in Service::search: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Lấy dịch vụ phổ biến.
     */
    public function getPopularServices($limit = 5) {
        // Không có bảng booking_services → trả về dịch vụ active thông thường
        return $this->getActiveServices();
    }

    /**
     * Thống kê dịch vụ.
     */
    public function getStats() {
        try {
            $sql  = "SELECT
                         COUNT(*)                                  as total,
                         SUM(CASE WHEN trangthai = 1 THEN 1 END)  as active,
                         SUM(CASE WHEN trangthai = 0 THEN 1 END)  as inactive,
                         AVG(gia)                                  as avg_price,
                         MIN(gia)                                  as min_price,
                         MAX(gia)                                  as max_price
                     FROM {$this->table}";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            return $stmt->fetch();

        } catch (PDOException $e) {
            error_log("Error in Service::getStats: " . $e->getMessage());
            return null;
        }
    }
}
?>
