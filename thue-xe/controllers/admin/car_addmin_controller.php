<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../../config/database.php';

$action = $_GET['action'] ?? '';
$db = new Database();
$conn = $db->getConnection();

switch ($action) {
    case 'list':
        $stmt = $conn->query("SELECT * FROM cars ORDER BY created_at DESC");
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id = (int)($_GET['id'] ?? 0);
        $stmt = $conn->prepare("SELECT * FROM cars WHERE id = ?");
        $stmt->execute([$id]);
        $car = $stmt->fetch();
        echo json_encode(['success' => (bool)$car, 'data' => $car]);
        break;

    case 'stats':
        $stmt = $conn->query("SELECT
            COUNT(*) as total,
            SUM(status = 'available') as available,
            SUM(status = 'rented') as rented,
            SUM(status = 'maintenance') as maintenance
            FROM cars");
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'create':
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $stmt = $conn->prepare("INSERT INTO cars (name, brand, model, year, seats, transmission, fuel_type, price_per_day, main_image, description, features, status)
                VALUES (:name, :brand, :model, :year, :seats, :transmission, :fuel_type, :price, :image, :desc, :features, :status)");
            $stmt->execute([
                ':name'         => $data['name'],
                ':brand'        => $data['brand'],
                ':model'        => $data['model'],
                ':year'         => (int)$data['year'],
                ':seats'        => (int)$data['seats'],
                ':transmission' => $data['transmission'],
                ':fuel_type'    => $data['fuel_type'],
                ':price'        => (float)$data['price_per_day'],
                ':image'        => $data['main_image'] ?? '',
                ':desc'         => $data['description'] ?? '',
                ':features'     => $data['features'] ?? '',
                ':status'       => $data['status'] ?? 'available',
            ]);
            echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'update':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = (int)($data['id'] ?? 0);
        try {
            $stmt = $conn->prepare("UPDATE cars SET name=:name, brand=:brand, model=:model, year=:year,
                seats=:seats, transmission=:transmission, fuel_type=:fuel_type, price_per_day=:price,
                main_image=:image, description=:desc, features=:features, status=:status WHERE id=:id");
            $stmt->execute([
                ':name'         => $data['name'],
                ':brand'        => $data['brand'],
                ':model'        => $data['model'],
                ':year'         => (int)$data['year'],
                ':seats'        => (int)$data['seats'],
                ':transmission' => $data['transmission'],
                ':fuel_type'    => $data['fuel_type'],
                ':price'        => (float)$data['price_per_day'],
                ':image'        => $data['main_image'] ?? '',
                ':desc'         => $data['description'] ?? '',
                ':features'     => $data['features'] ?? '',
                ':status'       => $data['status'] ?? 'available',
                ':id'           => $id,
            ]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'upload':
        if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'message' => 'Không có file hoặc lỗi upload']);
            break;
        }
        $file = $_FILES['image'];
        $allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        $maxSize = 5 * 1024 * 1024;
        if (!in_array($file['type'], $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Định dạng không hỗ trợ (jpg, png, webp, gif)']);
            break;
        }
        if ($file['size'] > $maxSize) {
            echo json_encode(['success' => false, 'message' => 'File quá lớn (tối đa 5MB)']);
            break;
        }
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = uniqid() . '.' . $ext;
        $uploadDir = '../../assets/images/cars/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
        if (move_uploaded_file($file['tmp_name'], $uploadDir . $filename)) {
            echo json_encode(['success' => true, 'filename' => $filename]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Không thể lưu file, kiểm tra quyền thư mục']);
        }
        break;

    case 'delete':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = (int)($data['id'] ?? 0);
        try {
            $check = $conn->prepare("SELECT COUNT(*) FROM bookings WHERE car_id = ? AND status IN ('pending', 'confirmed')");
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) {
                echo json_encode(['success' => false, 'message' => 'Không thể xóa xe đang có đơn đặt!']);
                break;
            }
            $stmt = $conn->prepare("DELETE FROM cars WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
