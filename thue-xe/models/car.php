<?php
/**
 * Car Model — v3 (bảng `xe`, cột tiếng Việt không dấu)
 * API contract giữ nguyên nhờ AS alias trong selectSql.
 */

require_once __DIR__ . '/base-model.php';

class Car extends BaseModel {
    protected $table = 'xe';

    /**
     * SELECT với AS alias: output JSON giữ nguyên field name cũ.
     */
    protected $selectSql = "
        id,
        ten               AS name,
        thuonghieu        AS brand,
        model,
        namsanxuat        AS year,
        loaixe            AS car_type,
        socho             AS seats,
        hopso             AS transmission,
        nhienlieu         AS fuel_type,
        giathue           AS price_per_day,
        tilephicuoituan   AS weekend_surcharge_rate,
        tiledatcoc        AS deposit_rate,
        anhchinh          AS main_image,
        mota              AS description,
        tienich           AS features,
        trangthai         AS status,
        idnhacungcap      AS provider_id,
        urlvideo          AS video_url,
        ngaytao           AS created_at";

    /**
     * Ánh xạ English key → Vietnamese DB column.
     * Dùng trong WHERE conditions, create(), update().
     */
    protected $columnMap = [
        'name'                   => 'ten',
        'brand'                  => 'thuonghieu',
        'year'                   => 'namsanxuat',
        'car_type'               => 'loaixe',
        'seats'                  => 'socho',
        'transmission'           => 'hopso',
        'fuel_type'              => 'nhienlieu',
        'price_per_day'          => 'giathue',
        'weekend_surcharge_rate' => 'tilephicuoituan',
        'deposit_rate'           => 'tiledatcoc',
        'main_image'             => 'anhchinh',
        'description'            => 'mota',
        'features'               => 'tienich',
        'status'                 => 'trangthai',
        'provider_id'            => 'idnhacungcap',
        'video_url'              => 'urlvideo',
        'created_at'             => 'ngaytao',
    ];

    // Properties (giữ nguyên tên English cho tương thích code ngoài)
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
     * Lấy xe có sẵn.
     */
    public function getAvailableCars($limit = null) {
        return $this->getAll(['status' => 'available'], 'ngaytao DESC', $limit);
    }

    /**
     * Lấy xe nổi bật (6 xe mới nhất có sẵn).
     */
    public function getFeaturedCars() {
        return $this->getAvailableCars(6);
    }

    /**
     * Tìm kiếm xe theo bộ lọc.
     */
    public function search($filters = []) {
        try {
            $sql    = "SELECT {$this->selectSql} FROM {$this->table} WHERE trangthai = 'available'";
            $params = [];

            if (!empty($filters['brand'])) {
                $sql .= " AND thuonghieu = :brand";
                $params[':brand'] = $filters['brand'];
            }

            if (!empty($filters['seats'])) {
                $sql .= " AND socho = :seats";
                $params[':seats'] = $filters['seats'];
            }

            if (!empty($filters['price'])) {
                if ($filters['price'] == '2000000') {
                    $sql .= " AND giathue >= 2000000";
                } else {
                    $priceRange = explode('-', $filters['price']);
                    if (count($priceRange) == 2) {
                        $sql .= " AND giathue BETWEEN :min_price AND :max_price";
                        $params[':min_price'] = (float)$priceRange[0];
                        $params[':max_price'] = (float)$priceRange[1];
                    }
                }
            }

            if (!empty($filters['transmission'])) {
                $sql .= " AND hopso = :transmission";
                $params[':transmission'] = $filters['transmission'];
            }

            if (!empty($filters['fuel_type'])) {
                $sql .= " AND nhienlieu = :fuel_type";
                $params[':fuel_type'] = $filters['fuel_type'];
            }

            $sql .= " ORDER BY ngaytao DESC";

            $stmt = $this->conn->prepare($sql);
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            $stmt->execute();
            return $stmt->fetchAll();

        } catch (PDOException $e) {
            error_log("Error in Car::search: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Lấy xe cùng với hình ảnh.
     */
    public function getCarWithImages($carId) {
        try {
            $car = $this->getById($carId);
            if (!$car) return null;

            // hinhanhxe: alias để giữ field name cũ
            $sql  = "SELECT id, idxe AS car_id, loai AS type, tep AS filename
                     FROM hinhanhxe WHERE idxe = :car_id ORDER BY id ASC";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':car_id', $carId, PDO::PARAM_INT);
            $stmt->execute();

            return ['car' => $car, 'images' => $stmt->fetchAll()];

        } catch (PDOException $e) {
            error_log("Error in Car::getCarWithImages: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Lấy danh sách hãng xe.
     */
    public function getBrands() {
        try {
            $sql  = "SELECT DISTINCT thuonghieu FROM {$this->table} ORDER BY thuonghieu ASC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_COLUMN);

        } catch (PDOException $e) {
            error_log("Error in Car::getBrands: " . $e->getMessage());
            return [];
        }
    }

    /**
     * Kiểm tra xe có sẵn.
     */
    public function isAvailable($carId) {
        $car = $this->getById($carId);
        return $car && $car['status'] === 'available';
    }

    /**
     * Cập nhật trạng thái xe.
     */
    public function updateStatus($carId, $status) {
        $validStatuses = ['available', 'rented', 'maintenance'];
        if (!in_array($status, $validStatuses)) return false;
        // columnMap dịch 'status' → 'trangthai'
        return $this->update($carId, ['status' => $status]);
    }

    /**
     * Thêm hình ảnh cho xe.
     */
    public function addImage($carId, $imagePath, $type = 'front') {
        try {
            // hinhanhxe dùng trực tiếp tên cột mới
            $sql  = "INSERT INTO hinhanhxe (idxe, loai, tep) VALUES (:idxe, :loai, :tep)";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':idxe', $carId, PDO::PARAM_INT);
            $stmt->bindValue(':loai', $type);
            $stmt->bindValue(':tep',  $imagePath);
            return $stmt->execute();

        } catch (PDOException $e) {
            error_log("Error in Car::addImage: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Xóa hình ảnh.
     */
    public function deleteImage($imageId) {
        try {
            $sql  = "DELETE FROM hinhanhxe WHERE id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindValue(':id', $imageId, PDO::PARAM_INT);
            return $stmt->execute();

        } catch (PDOException $e) {
            error_log("Error in Car::deleteImage: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Validate dữ liệu xe (keys English, giống input từ request).
     */
    public function validate($data) {
        $errors = [];

        if (empty($data['name'])) {
            $errors[] = 'Tên xe không được để trống';
        }
        if (empty($data['brand'])) {
            $errors[] = 'Hãng xe không được để trống';
        }
        if (empty($data['price_per_day']) || $data['price_per_day'] <= 0) {
            $errors[] = 'Giá thuê phải lớn hơn 0';
        }
        if (empty($data['seats']) || !in_array($data['seats'], [4, 5, 7, 9, 16])) {
            $errors[] = 'Số chỗ không hợp lệ';
        }

        return $errors;
    }

    /**
     * Thống kê xe theo trạng thái.
     */
    public function getStatsByStatus() {
        try {
            // alias trangthai → status cho key PHP thống nhất
            $sql  = "SELECT trangthai AS status, COUNT(*) as count
                     FROM {$this->table} GROUP BY trangthai";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();

            $stats = [];
            while ($row = $stmt->fetch()) {
                $stats[$row['status']] = (int)$row['count'];
            }
            return $stats;

        } catch (PDOException $e) {
            error_log("Error in Car::getStatsByStatus: " . $e->getMessage());
            return [];
        }
    }
}
?>
