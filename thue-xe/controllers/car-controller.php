<?php
/**
 * Car Controller
 * Đồng bộ schema hiện tại: xechiec + xemau + loaixe.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

class CarController {
    private $conn;

    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }

    private function carSelect(): string {
        return "
            xc.id                                      AS id,
            xm.ten                                     AS name,
            xm.thuonghieu                              AS brand,
            xm.model                                   AS model,
            xm.namsanxuat                              AS year,
            lx.ten                                     AS car_type,
            xm.socho                                   AS seats,
            xm.hopso                                   AS transmission,
            xm.nhienlieu                               AS fuel_type,
            xm.giathue_ngay                            AS price_per_day,
            xm.tiledatcoc                              AS deposit_rate,
            xm.anhchinh                                AS main_image,
            xm.mota_chitiet                            AS description,
            ''                                         AS features,
            CASE
                WHEN xc.tinhrang = 'hoatdong' THEN 'available'
                WHEN xc.tinhrang IN ('baodoi', 'baoduong') THEN 'maintenance'
                ELSE 'rented'
            END                                        AS status,
            xc.bienso                                  AS license_plate,
            xc.km_hientai                              AS mileage,
            xc.ngaytao                                 AS created_at,
            ''                                         AS video_url
        ";
    }

    private function hasMediaTable(): bool {
        try {
            $stmt = $this->conn->prepare("SHOW TABLES LIKE 'xemau_media'");
            $stmt->execute();
            return (bool)$stmt->fetchColumn();
        } catch (PDOException $e) {
            return false;
        }
    }

    private function getImagesByModelId(int $modelId): array {
        if (!$this->hasMediaTable()) {
            return [];
        }

        $stmt = $this->conn->prepare(
            "SELECT id, idxemau, loai, vitri, tep
             FROM xemau_media
             WHERE idxemau = ? AND loai = 'image'
             ORDER BY sapxep ASC, id ASC"
        );
        $stmt->execute([$modelId]);

        $images = [];
        foreach ($stmt->fetchAll() as $row) {
            $images[] = [
                'id' => (int)$row['id'],
                'car_id' => $modelId,
                'type' => $row['vitri'],
                'filename' => $row['tep'],
                'image_path' => $row['tep'],
            ];
        }
        return $images;
    }

    public function getFeatured() {
        try {
            $sql  = "SELECT " . $this->carSelect() . ", xm.id AS model_id
                     FROM xechiec xc
                     INNER JOIN xemau xm ON xm.id = xc.idxemau
                     LEFT JOIN loaixe lx ON lx.id = xm.idloaixe
                     WHERE xc.tinhrang = 'hoatdong'
                     ORDER BY xc.ngaytao DESC LIMIT 6";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getAll() {
        try {
            $sql  = "SELECT " . $this->carSelect() . ", xm.id AS model_id
                     FROM xechiec xc
                     INNER JOIN xemau xm ON xm.id = xc.idxemau
                     LEFT JOIN loaixe lx ON lx.id = xm.idloaixe
                     WHERE xc.tinhrang = 'hoatdong'
                     ORDER BY xc.ngaytao DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getById() {
        try {
            $id = (int)($_GET['id'] ?? 0);
            if ($id <= 0) {
                echo json_encode(['success' => false, 'message' => 'ID không hợp lệ']);
                return;
            }

            $sql  = "SELECT " . $this->carSelect() . ", xm.id AS model_id
                     FROM xechiec xc
                     INNER JOIN xemau xm ON xm.id = xc.idxemau
                     LEFT JOIN loaixe lx ON lx.id = xm.idloaixe
                     WHERE xc.id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':id' => $id]);
            $car = $stmt->fetch();

            if (!$car) {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy xe']);
                return;
            }

            $images = $this->getImagesByModelId((int)$car['model_id']);

            echo json_encode([
                'success' => true,
                'data'    => ['car' => $car, 'images' => $images],
            ]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function getFilterOptions() {
        try {
            $brands = array_column(
                $this->conn->query(
                    "SELECT DISTINCT xm.thuonghieu
                     FROM xechiec xc
                     INNER JOIN xemau xm ON xm.id = xc.idxemau
                     WHERE xc.tinhrang = 'hoatdong'
                     ORDER BY xm.thuonghieu ASC"
                )->fetchAll(),
                'thuonghieu'
            );

            $seats = array_column(
                $this->conn->query(
                    "SELECT DISTINCT xm.socho
                     FROM xechiec xc
                     INNER JOIN xemau xm ON xm.id = xc.idxemau
                     WHERE xc.tinhrang = 'hoatdong'
                     ORDER BY xm.socho ASC"
                )->fetchAll(),
                'socho'
            );

            $prices = $this->conn->query(
                "SELECT MIN(xm.giathue_ngay) as min_price, MAX(xm.giathue_ngay) as max_price
                 FROM xechiec xc
                 INNER JOIN xemau xm ON xm.id = xc.idxemau
                 WHERE xc.tinhrang = 'hoatdong'"
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

            $sql    = "SELECT " . $this->carSelect() . ", xm.id AS model_id
                       FROM xechiec xc
                       INNER JOIN xemau xm ON xm.id = xc.idxemau
                       LEFT JOIN loaixe lx ON lx.id = xm.idloaixe
                       WHERE xc.tinhrang = 'hoatdong'";
            $params = [];

            if ($brand) {
                $sql .= " AND xm.thuonghieu = :brand";
                $params[':brand'] = $brand;
            }
            if ($seats) {
                $sql .= " AND xm.socho = :seats";
                $params[':seats'] = $seats;
            }
            if ($price) {
                if ($price == '2000000') {
                    $sql .= " AND xm.giathue_ngay >= 2000000";
                } else {
                    $parts = explode('-', $price);
                    if (count($parts) === 2) {
                        $min = (float)$parts[0];
                        $max = (float)$parts[1];
                        $sql .= " AND xm.giathue_ngay BETWEEN :min AND :max";
                        $params[':min'] = $min;
                        $params[':max'] = $max;
                    }
                }
            }

            $sql .= " ORDER BY xc.ngaytao DESC";

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
