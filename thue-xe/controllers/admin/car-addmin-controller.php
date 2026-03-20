<?php
/**
 * Car Admin Controller — v3
 * Bảng `cars` → `xe`, bảng `bookings` → `datxe`.
 * Cột dùng AS alias để giữ API contract.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../../config/database.php';

// SELECT chuẩn cho xe — alias giữ nguyên field name cũ
define('CAR_ADMIN_SELECT', "
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

$action = $_GET['action'] ?? '';
$db     = new Database();
$conn   = $db->getConnection();

switch ($action) {
    case 'list':
        $stmt = $conn->query(
            "SELECT " . CAR_ADMIN_SELECT . " FROM xe ORDER BY ngaytao DESC"
        );
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id   = (int)($_GET['id'] ?? 0);
        $stmt = $conn->prepare(
            "SELECT " . CAR_ADMIN_SELECT . " FROM xe WHERE id = ?"
        );
        $stmt->execute([$id]);
        $car = $stmt->fetch();
        echo json_encode(['success' => (bool)$car, 'data' => $car]);
        break;

    case 'stats':
        $stmt = $conn->query(
            "SELECT
                COUNT(*)                         AS total,
                SUM(trangthai = 'available')     AS available,
                SUM(trangthai = 'rented')        AS rented,
                SUM(trangthai = 'maintenance')   AS maintenance
             FROM xe"
        );
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'create':
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            // INSERT dùng tên cột mới của bảng xe
            $stmt = $conn->prepare(
                "INSERT INTO xe
                    (ten, thuonghieu, model, namsanxuat, socho, hopso, nhienlieu,
                     giathue, anhchinh, mota, tienich, trangthai)
                 VALUES
                    (:ten, :thuonghieu, :model, :namsanxuat, :socho, :hopso, :nhienlieu,
                     :giathue, :anhchinh, :mota, :tienich, :trangthai)"
            );
            $stmt->execute([
                ':ten'         => $data['name'],
                ':thuonghieu'  => $data['brand'],
                ':model'       => $data['model'],
                ':namsanxuat'  => (int)$data['year'],
                ':socho'       => (int)$data['seats'],
                ':hopso'       => $data['transmission'],
                ':nhienlieu'   => $data['fuel_type'],
                ':giathue'     => (float)$data['price_per_day'],
                ':anhchinh'    => $data['main_image']   ?? '',
                ':mota'        => $data['description']  ?? '',
                ':tienich'     => $data['features']     ?? '',
                ':trangthai'   => $data['status']       ?? 'available',
            ]);
            echo json_encode(['success' => true, 'id' => $conn->lastInsertId()]);
        } catch (PDOException $e) {
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'update':
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int)($data['id'] ?? 0);
        try {
            $stmt = $conn->prepare(
                "UPDATE xe SET
                    ten = :ten, thuonghieu = :thuonghieu, model = :model,
                    namsanxuat = :namsanxuat, socho = :socho, hopso = :hopso,
                    nhienlieu = :nhienlieu, giathue = :giathue,
                    anhchinh = :anhchinh, mota = :mota, tienich = :tienich,
                    trangthai = :trangthai
                 WHERE id = :id"
            );
            $stmt->execute([
                ':ten'        => $data['name'],
                ':thuonghieu' => $data['brand'],
                ':model'      => $data['model'],
                ':namsanxuat' => (int)$data['year'],
                ':socho'      => (int)$data['seats'],
                ':hopso'      => $data['transmission'],
                ':nhienlieu'  => $data['fuel_type'],
                ':giathue'    => (float)$data['price_per_day'],
                ':anhchinh'   => $data['main_image']  ?? '',
                ':mota'       => $data['description'] ?? '',
                ':tienich'    => $data['features']    ?? '',
                ':trangthai'  => $data['status']      ?? 'available',
                ':id'         => $id,
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
        $file    = $_FILES['image'];
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

        $ext       = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename  = uniqid() . '.' . $ext;
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
        $id   = (int)($data['id'] ?? 0);
        try {
            // Kiểm tra đơn đặt xe đang active trong datxe
            $check = $conn->prepare(
                "SELECT COUNT(*) FROM datxe
                 WHERE idxe = ? AND trangthai IN ('pending', 'confirmed')"
            );
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) {
                echo json_encode(['success' => false, 'message' => 'Không thể xóa xe đang có đơn đặt!']);
                break;
            }
            $stmt = $conn->prepare("DELETE FROM xe WHERE id = ?");
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
