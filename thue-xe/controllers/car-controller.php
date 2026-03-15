<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
require_once '../config/database.php';

class CarController {
    private $conn;
    
    public function __construct() {
        $db = new Database();
        $this->conn = $db->getConnection();
    }
    
    public function getFeatured() {
        try {
            $sql = "SELECT * FROM cars WHERE status = 'available' ORDER BY created_at DESC LIMIT 6";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
    
    public function getAll() {
        try {
            $sql = "SELECT * FROM cars WHERE status = 'available' ORDER BY created_at DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
    
    public function getById() {
        try {
            $id = $_GET['id'] ?? 0;
            $sql = "SELECT * FROM cars WHERE id = :id";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':id' => $id]);
            $car = $stmt->fetch();
            
            $sql_img = "SELECT * FROM car_images WHERE car_id = :id";
            $stmt_img = $this->conn->prepare($sql_img);
            $stmt_img->execute([':id' => $id]);
            
            echo json_encode(['success' => true, 'data' => ['car' => $car, 'images' => $stmt_img->fetchAll()]]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
    
    public function getFilterOptions() {
        try {
            $brands = array_column(
                $this->conn->query(
                    "SELECT DISTINCT brand FROM cars WHERE status = 'available' ORDER BY brand ASC"
                )->fetchAll(),
                'brand'
            );

            $seats = array_column(
                $this->conn->query(
                    "SELECT DISTINCT seats FROM cars WHERE status = 'available' ORDER BY seats ASC"
                )->fetchAll(),
                'seats'
            );

            $prices = $this->conn->query(
                "SELECT MIN(price_per_day) as min_price, MAX(price_per_day) as max_price FROM cars WHERE status = 'available'"
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
            
            $sql = "SELECT * FROM cars WHERE status = 'available'";
            $params = [];
            
            if($brand) {
                $sql .= " AND brand = :brand";
                $params[':brand'] = $brand;
            }
            if($seats) {
                $sql .= " AND seats = :seats";
                $params[':seats'] = $seats;
            }
            if($price) {
                if($price == '2000000') {
                    $sql .= " AND price_per_day >= 2000000";
                } else {
                    list($min, $max) = explode('-', $price);
                    $sql .= " AND price_per_day BETWEEN :min AND :max";
                    $params[':min'] = $min;
                    $params[':max'] = $max;
                }
            }
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        } catch(PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}

$controller = new CarController();
$action = $_GET['action'] ?? 'getFeatured';

match($action) {
    'getFeatured'      => $controller->getFeatured(),
    'getAll'           => $controller->getAll(),
    'getById'          => $controller->getById(),
    'search'           => $controller->search(),
    'getFilterOptions' => $controller->getFilterOptions(),
    default            => print(json_encode(['success' => false, 'message' => 'Invalid action']))
};
?>