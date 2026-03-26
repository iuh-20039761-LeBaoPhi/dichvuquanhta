<?php
/**
 * Car Admin Controller
 * Đồng bộ schema hiện tại: xechiec + xemau + loaixe + datxe.
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json');

if (!isset($_SESSION['admin_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

require_once '../../config/database.php';

$action = $_GET['action'] ?? '';
$db     = new Database();
$conn   = $db->getConnection();

$carSelect = "
    xc.id                                   AS id,
    xm.id                                   AS model_id,
    xm.ten                                  AS name,
    xm.thuonghieu                           AS brand,
    xm.model                                AS model,
    xm.namsanxuat                           AS year,
    COALESCE(lx.ten, 'Khác')                AS car_type,
    xm.socho                                AS seats,
    xm.hopso                                AS transmission,
    xm.nhienlieu                            AS fuel_type,
    xm.giathue_ngay                         AS price_per_day,
    0.10                                    AS weekend_surcharge_rate,
    xm.tiledatcoc                           AS deposit_rate,
    xm.anhchinh                             AS main_image,
    xm.mota_chitiet                         AS description,
    ''                                      AS features,
    CASE
        WHEN xc.tinhrang = 'hoatdong' THEN 'available'
        WHEN xc.tinhrang IN ('baodoi', 'baoduong') THEN 'maintenance'
        ELSE 'rented'
    END                                     AS status,
    NULL                                    AS provider_id,
    ''                                      AS video_url,
    xc.ngaytao                              AS created_at";

switch ($action) {
    case 'list':
        $stmt = $conn->query(
            "SELECT " . $carSelect . "
             FROM xechiec xc
             INNER JOIN xemau xm ON xm.id = xc.idxemau
             LEFT JOIN loaixe lx ON lx.id = xm.idloaixe
             ORDER BY xc.ngaytao DESC"
        );
        echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
        break;

    case 'get':
        $id   = (int)($_GET['id'] ?? 0);
        $stmt = $conn->prepare(
            "SELECT " . $carSelect . "
             FROM xechiec xc
             INNER JOIN xemau xm ON xm.id = xc.idxemau
             LEFT JOIN loaixe lx ON lx.id = xm.idloaixe
             WHERE xc.id = ?"
        );
        $stmt->execute([$id]);
        $car = $stmt->fetch();
        echo json_encode(['success' => (bool)$car, 'data' => $car]);
        break;

    case 'stats':
        $stmt = $conn->query(
            "SELECT
                COUNT(*)                         AS total,
                SUM(tinhrang = 'hoatdong')       AS available,
                SUM(tinhrang = 'thaihoc')        AS rented,
                SUM(tinhrang IN ('baodoi','baoduong')) AS maintenance
             FROM xechiec"
        );
        echo json_encode(['success' => true, 'data' => $stmt->fetch()]);
        break;

    case 'create':
        $data = json_decode(file_get_contents('php://input'), true);
        try {
            $conn->beginTransaction();

            $typeName = trim((string)($data['car_type'] ?? 'Khác'));
            $typeStmt = $conn->prepare("SELECT id FROM loaixe WHERE ten = ? LIMIT 1");
            $typeStmt->execute([$typeName]);
            $typeRow = $typeStmt->fetch();
            if ($typeRow) {
                $typeId = (int)$typeRow['id'];
            } else {
                $insType = $conn->prepare("INSERT INTO loaixe (ten, mota, trangthai) VALUES (?, ?, 1)");
                $insType->execute([$typeName, 'Tạo bởi admin']);
                $typeId = (int)$conn->lastInsertId();
            }

            $modelName = trim((string)$data['name']);
            if ($modelName === '') {
                throw new RuntimeException('Tên xe không hợp lệ');
            }

            // Đảm bảo unique cho xemau.ten
            $probeName = $modelName;
            $i = 1;
            while (true) {
                $chk = $conn->prepare("SELECT id FROM xemau WHERE ten = ? LIMIT 1");
                $chk->execute([$probeName]);
                if (!$chk->fetch()) {
                    break;
                }
                $i++;
                $probeName = $modelName . ' #' . $i;
            }

            $insModel = $conn->prepare(
                "INSERT INTO xemau
                    (ten, thuonghieu, model, namsanxuat, idloaixe, socho, hopso, nhienlieu,
                     giathue_ngay, tiledatcoc, anhchinh, mota_chitiet, trangthai)
                 VALUES
                    (:ten, :thuonghieu, :model, :namsanxuat, :idloaixe, :socho, :hopso, :nhienlieu,
                     :giathue_ngay, :tiledatcoc, :anhchinh, :mota_chitiet, 'active')"
            );
            $insModel->execute([
                ':ten'          => $probeName,
                ':thuonghieu'   => trim((string)($data['brand'] ?? '')),
                ':model'        => trim((string)($data['model'] ?? '')),
                ':namsanxuat'   => (int)($data['year'] ?? date('Y')),
                ':idloaixe'     => $typeId,
                ':socho'        => (int)($data['seats'] ?? 5),
                ':hopso'        => trim((string)($data['transmission'] ?? 'Tự động')),
                ':nhienlieu'    => trim((string)($data['fuel_type'] ?? 'Xăng')),
                ':giathue_ngay' => (float)($data['price_per_day'] ?? 0),
                ':tiledatcoc'   => 0.3,
                ':anhchinh'     => trim((string)($data['main_image'] ?? '')),
                ':mota_chitiet' => trim((string)($data['description'] ?? '')),
            ]);

            $modelId = (int)$conn->lastInsertId();
            $carStatus = ($data['status'] ?? 'available') === 'available' ? 'hoatdong' : (($data['status'] ?? '') === 'maintenance' ? 'baoduong' : 'thaihoc');
            $plate = 'ADM-' . strtoupper(substr(md5((string)microtime(true)), 0, 6));

            $insCar = $conn->prepare("INSERT INTO xechiec (idxemau, bienso, km_hientai, tinhrang) VALUES (?, ?, 0, ?)");
            $insCar->execute([$modelId, $plate, $carStatus]);
            $carId = (int)$conn->lastInsertId();

            $conn->commit();
            echo json_encode(['success' => true, 'id' => $carId]);
        } catch (PDOException $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        } catch (RuntimeException $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        break;

    case 'update':
        $data = json_decode(file_get_contents('php://input'), true);
        $id   = (int)($data['id'] ?? 0);
        try {
            $find = $conn->prepare("SELECT idxemau FROM xechiec WHERE id = ? LIMIT 1");
            $find->execute([$id]);
            $row = $find->fetch();
            if (!$row) {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy xe']);
                break;
            }

            $modelId = (int)$row['idxemau'];

            $updModel = $conn->prepare(
                "UPDATE xemau SET
                    ten = :ten,
                    thuonghieu = :thuonghieu,
                    model = :model,
                    namsanxuat = :namsanxuat,
                    socho = :socho,
                    hopso = :hopso,
                    nhienlieu = :nhienlieu,
                    giathue_ngay = :giathue_ngay,
                    anhchinh = :anhchinh,
                    mota_chitiet = :mota_chitiet
                 WHERE id = :id"
            );
            $updModel->execute([
                ':ten'          => trim((string)($data['name'] ?? '')),
                ':thuonghieu'   => trim((string)($data['brand'] ?? '')),
                ':model'        => trim((string)($data['model'] ?? '')),
                ':namsanxuat'   => (int)($data['year'] ?? date('Y')),
                ':socho'        => (int)($data['seats'] ?? 5),
                ':hopso'        => trim((string)($data['transmission'] ?? 'Tự động')),
                ':nhienlieu'    => trim((string)($data['fuel_type'] ?? 'Xăng')),
                ':giathue_ngay' => (float)($data['price_per_day'] ?? 0),
                ':anhchinh'     => trim((string)($data['main_image'] ?? '')),
                ':mota_chitiet' => trim((string)($data['description'] ?? '')),
                ':id'           => $modelId,
            ]);

            $carStatus = ($data['status'] ?? 'available') === 'available' ? 'hoatdong' : (($data['status'] ?? '') === 'maintenance' ? 'baoduong' : 'thaihoc');
            $updCar = $conn->prepare("UPDATE xechiec SET tinhrang = ? WHERE id = ?");
            $updCar->execute([$carStatus, $id]);

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
                 WHERE idxechiec = ? AND trangthai IN ('pending', 'confirmed')"
            );
            $check->execute([$id]);
            if ($check->fetchColumn() > 0) {
                echo json_encode(['success' => false, 'message' => 'Không thể xóa xe đang có đơn đặt!']);
                break;
            }

            $find = $conn->prepare("SELECT idxemau FROM xechiec WHERE id = ? LIMIT 1");
            $find->execute([$id]);
            $row = $find->fetch();
            if (!$row) {
                echo json_encode(['success' => false, 'message' => 'Không tìm thấy xe']);
                break;
            }

            $stmt = $conn->prepare("DELETE FROM xechiec WHERE id = ?");
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
