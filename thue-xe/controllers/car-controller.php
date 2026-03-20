<?php
/**
 * Car Controller — v3
 * Bảng `cars` → `xe`, cột dùng AS alias để giữ API contract.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

// SELECT chuẩn cho bảng xe — alias giữ nguyên field name cũ
define('CAR_SELECT', "
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
    ngaytao           AS created_at");

class CarController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    public function getFeatured() {
        try {
            $sql  = "SELECT " . CAR_SELECT . "
                     FROM xe WHERE trangthai = 'available'
                     ORDER BY ngaytao DESC LIMIT 6";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getAll() {
        try {
            $sql  = "SELECT " . CAR_SELECT . "
                     FROM xe WHERE trangthai = 'available'
                     ORDER BY ngaytao DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getById() {
        try {
            $id = $_GET['id'] ?? 0;

            $sql  = "SELECT " . CAR_SELECT . " FROM xe WHERE id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':id' => $id]);
            $car = $stmt->fetch();

            // Ảnh xe: alias để giữ field name cũ
            $sql_img  = "SELECT id, idxe AS car_id, loai AS type, tep AS filename
                         FROM hinhanhxe WHERE idxe = :id";
            $stmt_img = $this->conn->prepare($sql_img);
            $stmt_img->execute([':id' => $id]);

            echo json_encode([
                'success' => true,
                'data'    => ['car' => $car, 'images' => $stmt_img->fetchAll()],
            ]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getFilterOptions() {
        try {
            $brands = array_column(
                $this->conn->query(
                    "SELECT DISTINCT thuonghieu FROM xe WHERE trangthai = 'available' ORDER BY thuonghieu ASC"
                )->fetchAll(),
                'thuonghieu'
            );

            $seats = array_column(
                $this->conn->query(
                    "SELECT DISTINCT socho FROM xe WHERE trangthai = 'available' ORDER BY socho ASC"
                )->fetchAll(),
                'socho'
            );

            $prices = $this->conn->query(
                "SELECT MIN(giathue) as min_price, MAX(giathue) as max_price
                 FROM xe WHERE trangthai = 'available'"
            )->fetch();

            echo json_encode([
                'success' => true,
                'brands'  => $brands,
                'seats'   => array_map('intval', $seats),
                'prices'  => [
                    'min' => (int)($prices['min_price'] ?? 0),
                    'max' => (int)($prices['max_price'] ?? 0),
                ],
            ]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function search() {
        try {
            $brand = $_GET['brand'] ?? '';
            $seats = $_GET['seats'] ?? 0;
            $price = $_GET['price'] ?? '';

            $sql    = "SELECT " . CAR_SELECT . " FROM xe WHERE trangthai = 'available'";
            $params = [];

            if ($brand) {
                $sql .= " AND thuonghieu = :brand";
                $params[':brand'] = $brand;
            }
            if ($seats) {
                $sql .= " AND socho = :seats";
                $params[':seats'] = $seats;
            }
            if ($price) {
                if ($price == '2000000') {
                    $sql .= " AND giathue >= 2000000";
                } else {
                    list($min, $max) = explode('-', $price);
                    $sql .= " AND giathue BETWEEN :min AND :max";
                    $params[':min'] = $min;
                    $params[':max'] = $max;
                }
            }

            $sql .= " ORDER BY ngaytao DESC";

            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$controller = new CarController();
$action     = $_GET['action'] ?? 'getFeatured';

match ($action) {
    'getFeatured'      => $controller->getFeatured(),
    'getAll'           => $controller->getAll(),
    'getById'          => $controller->getById(),
    'search'           => $controller->search(),
    'getFilterOptions' => $controller->getFilterOptions(),
    default            => print(json_encode(['success' => false, 'message' => 'Invalid action'])),
};
?>
