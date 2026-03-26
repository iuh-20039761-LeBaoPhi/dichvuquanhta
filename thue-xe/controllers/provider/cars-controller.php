<?php
/**
 * Provider Cars Controller
 * Đồng bộ quản lý xe theo database hiện tại (`xemau`, `xechiec`, `loaixe`).
 */

require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['user_role'] ?? '') !== 'provider') {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

$action = $_GET['action'] ?? '';
$providerId = (int)$_SESSION['user_id'];

function ensureMediaTable(PDO $conn): void {
    $conn->exec(
        "CREATE TABLE IF NOT EXISTS xemau_media (
            id INT PRIMARY KEY AUTO_INCREMENT,
            idxemau INT NOT NULL,
            loai ENUM('image', 'video') NOT NULL,
            vitri VARCHAR(30) NOT NULL,
            tep VARCHAR(255) NOT NULL,
            sapxep INT DEFAULT 0,
            ngaytao DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_idxemau (idxemau),
            CONSTRAINT fk_xemau_media_idxemau
              FOREIGN KEY (idxemau) REFERENCES xemau(id)
              ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
    );
}

function ensureProviderCarMapTable(PDO $conn): void {
        $conn->exec(
                "CREATE TABLE IF NOT EXISTS nhacungcap_xechiec (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        idnhacungcap INT NOT NULL,
                        idxechiec INT NOT NULL,
                        ngaytao DATETIME DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE KEY uq_provider_car (idnhacungcap, idxechiec),
                        INDEX idx_provider (idnhacungcap),
                        INDEX idx_car (idxechiec),
                        CONSTRAINT fk_ncc_xc_provider
                            FOREIGN KEY (idnhacungcap) REFERENCES nguoidung(id)
                            ON DELETE CASCADE,
                        CONSTRAINT fk_ncc_xc_car
                            FOREIGN KEY (idxechiec) REFERENCES xechiec(id)
                            ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4"
        );
}

function uploadCarMedia(array $file, string $prefix, array $allowedMime): ?string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }

    if (!in_array($file['type'] ?? '', $allowedMime, true)) {
        return null;
    }

    $baseDir = dirname(__DIR__, 2) . '/uploads/cars/';
    if (!is_dir($baseDir) && !mkdir($baseDir, 0755, true) && !is_dir($baseDir)) {
        return null;
    }

    $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
    if ($ext === '') {
        $ext = in_array($file['type'], ['image/jpeg', 'image/jpg'], true) ? 'jpg' : 'bin';
    }

    $filename = $prefix . '_' . uniqid('', true) . '.' . $ext;
    $target = $baseDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        return null;
    }

    return 'uploads/cars/' . $filename;
}

try {
    $db = new Database();
    $conn = $db->getConnection();

    if ($action === 'getMyCars') {
        ensureMediaTable($conn);
        ensureProviderCarMapTable($conn);

        $stmt = $conn->prepare(
            "SELECT
                xc.id               AS id,
                xm.id               AS model_id,
                xm.ten              AS name,
                xm.thuonghieu       AS brand,
                xm.model            AS model,
                xm.namsanxuat       AS year,
                lx.ten              AS car_type,
                xm.socho            AS seats,
                xm.hopso            AS transmission,
                xm.nhienlieu        AS fuel_type,
                xm.giathue_ngay     AS price_per_day,
                xm.tiledatcoc       AS deposit_rate,
                xm.anhchinh         AS main_image,
                xm.mota_chitiet     AS description,
                CASE
                    WHEN xc.tinhrang = 'hoatdong' THEN 'available'
                    WHEN xc.tinhrang IN ('baoduong', 'baodoi') THEN 'maintenance'
                    ELSE 'rented'
                END                 AS status,
                xc.bienso           AS license_plate,
                xc.km_hientai       AS mileage,
                xc.ngaytao          AS created_at
             FROM xechiec xc
             INNER JOIN xemau xm ON xm.id = xc.idxemau
             LEFT JOIN loaixe lx ON lx.id = xm.idloaixe
               INNER JOIN nhacungcap_xechiec m ON m.idxechiec = xc.id
               WHERE m.idnhacungcap = ?
             ORDER BY xc.ngaytao DESC"
        );
           $stmt->execute([$providerId]);
        $cars = $stmt->fetchAll();

        if (!empty($cars)) {
            $modelIds = array_values(array_unique(array_map(static fn($x) => (int)$x['model_id'], $cars)));
            $ph = implode(',', array_fill(0, count($modelIds), '?'));
            $mediaStmt = $conn->prepare(
                "SELECT idxemau, loai, vitri, tep
                 FROM xemau_media
                 WHERE idxemau IN ($ph)
                 ORDER BY sapxep ASC, id ASC"
            );
            $mediaStmt->execute($modelIds);
            $mediaRows = $mediaStmt->fetchAll();

            $mediaMap = [];
            foreach ($mediaRows as $row) {
                $modelId = (int)$row['idxemau'];
                if (!isset($mediaMap[$modelId])) {
                    $mediaMap[$modelId] = ['images' => [], 'video_url' => ''];
                }
                if ($row['loai'] === 'image') {
                    $mediaMap[$modelId]['images'][$row['vitri']] = $row['tep'];
                } elseif ($row['loai'] === 'video') {
                    $mediaMap[$modelId]['video_url'] = $row['tep'];
                }
            }

            foreach ($cars as &$car) {
                $modelId = (int)$car['model_id'];
                $car['images'] = $mediaMap[$modelId]['images'] ?? [];
                $car['video_url'] = $mediaMap[$modelId]['video_url'] ?? '';
            }
            unset($car);
        }

        echo json_encode(['success' => true, 'data' => $cars]);
        exit;
    }

    if ($action === 'create') {
        ensureMediaTable($conn);
        ensureProviderCarMapTable($conn);

        $name         = trim((string)($_POST['name'] ?? ''));
        $brand        = trim((string)($_POST['brand'] ?? ''));
        $model        = trim((string)($_POST['model'] ?? ''));
        $carType      = trim((string)($_POST['car_type'] ?? 'Sedan'));
        $year         = (int)($_POST['year'] ?? date('Y'));
        $seats        = (int)($_POST['seats'] ?? 5);
        $transmission = trim((string)($_POST['transmission'] ?? 'Tự động'));
        $fuelType     = trim((string)($_POST['fuel_type'] ?? 'Xăng'));
        $pricePerDay  = (float)($_POST['price_per_day'] ?? 0);
        $description  = trim((string)($_POST['description'] ?? ''));
        $licensePlate = strtoupper(trim((string)($_POST['license_plate'] ?? '')));

        if ($name === '' || $brand === '' || $model === '' || $pricePerDay <= 0 || $licensePlate === '') {
            echo json_encode(['success' => false, 'message' => 'Thiếu thông tin bắt buộc']);
            exit;
        }

        if ($year < 1990 || $year > (int)date('Y') + 1) {
            echo json_encode(['success' => false, 'message' => 'Năm sản xuất không hợp lệ']);
            exit;
        }

        if ($seats < 2 || $seats > 50) {
            echo json_encode(['success' => false, 'message' => 'Số chỗ ngồi không hợp lệ']);
            exit;
        }

        $requiredImageKeys = ['front', 'back', 'left', 'right', 'interior'];
        foreach ($requiredImageKeys as $key) {
            if (!isset($_FILES['image_' . $key]) || ($_FILES['image_' . $key]['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
                echo json_encode(['success' => false, 'message' => 'Vui lòng tải đủ 5 ảnh xe (trước/sau/trái/phải/nội thất)']);
                exit;
            }
        }
        if (!isset($_FILES['video']) || ($_FILES['video']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            echo json_encode(['success' => false, 'message' => 'Vui lòng tải lên 1 video xe']);
            exit;
        }

        $imageMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        $videoMime = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];

        $imagePaths = [];
        foreach ($requiredImageKeys as $key) {
            $path = uploadCarMedia($_FILES['image_' . $key], 'car_' . $key, $imageMime);
            if (!$path) {
                echo json_encode(['success' => false, 'message' => 'Ảnh tải lên không hợp lệ. Chỉ chấp nhận JPG/PNG/WEBP']);
                exit;
            }
            $imagePaths[$key] = $path;
        }

        $videoPath = uploadCarMedia($_FILES['video'], 'car_video', $videoMime);
        if (!$videoPath) {
            echo json_encode(['success' => false, 'message' => 'Video tải lên không hợp lệ. Chỉ chấp nhận MP4/WEBM/MOV/AVI']);
            exit;
        }

        $conn->beginTransaction();

        $carTypeIdStmt = $conn->prepare("SELECT id FROM loaixe WHERE ten = ? LIMIT 1");
        $carTypeIdStmt->execute([$carType]);
        $carTypeRow = $carTypeIdStmt->fetch();
        if (!$carTypeRow) {
            $insertType = $conn->prepare("INSERT INTO loaixe (ten, mota, trangthai) VALUES (?, ?, 1)");
            $insertType->execute([$carType, 'Tạo bởi nhà cung cấp #' . $providerId]);
            $carTypeId = (int)$conn->lastInsertId();
        } else {
            $carTypeId = (int)$carTypeRow['id'];
        }

        $stmt = $conn->prepare(
            "INSERT INTO xemau (
                ten, thuonghieu, model, namsanxuat, idloaixe,
                socho, hopso, nhienlieu, giathue_ngay,
                tiledatcoc, anhchinh, mota_chitiet, trangthai
            ) VALUES (
                :ten, :thuonghieu, :model, :namsanxuat, :idloaixe,
                :socho, :hopso, :nhienlieu, :giathue_ngay,
                :tiledatcoc, :anhchinh, :mota_chitiet, 'active'
            )"
        );

        $stmt->execute([
            ':ten'             => $name,
            ':thuonghieu'      => $brand,
            ':model'           => $model,
            ':namsanxuat'      => $year,
            ':idloaixe'        => $carTypeId,
            ':socho'           => $seats,
            ':hopso'           => $transmission,
            ':nhienlieu'       => $fuelType,
            ':giathue_ngay'    => $pricePerDay,
            ':tiledatcoc'      => 0.3,
            ':anhchinh'        => $imagePaths['front'],
            ':mota_chitiet'    => $description,
        ]);

        $modelId = (int)$conn->lastInsertId();

        $insertCar = $conn->prepare(
            "INSERT INTO xechiec (idxemau, bienso, km_hientai, tinhrang) VALUES (?, ?, 0, 'hoatdong')"
        );
        $insertCar->execute([$modelId, $licensePlate]);
        $carId = (int)$conn->lastInsertId();

        $mapStmt = $conn->prepare(
            "INSERT INTO nhacungcap_xechiec (idnhacungcap, idxechiec) VALUES (?, ?)"
        );
        $mapStmt->execute([$providerId, $carId]);

        $insertMedia = $conn->prepare(
            "INSERT INTO xemau_media (idxemau, loai, vitri, tep, sapxep) VALUES (?, ?, ?, ?, ?)"
        );
        $order = 1;
        foreach ($requiredImageKeys as $key) {
            $insertMedia->execute([$modelId, 'image', $key, $imagePaths[$key], $order]);
            $order++;
        }
        $insertMedia->execute([$modelId, 'video', 'video', $videoPath, 99]);

        $conn->commit();

        echo json_encode(['success' => true, 'id' => $carId, 'model_id' => $modelId]);
        exit;
    }

    if ($action === 'updateStatus') {
        ensureProviderCarMapTable($conn);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $carId = (int)($body['car_id'] ?? 0);
        $newStatus = trim((string)($body['status'] ?? ''));

        $allowedStatuses = ['available', 'maintenance'];
        if ($carId <= 0 || !in_array($newStatus, $allowedStatuses, true)) {
            echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ']);
            exit;
        }

        $check = $conn->prepare(
            "SELECT xc.id
             FROM xechiec xc
             INNER JOIN nhacungcap_xechiec m ON m.idxechiec = xc.id
             WHERE xc.id = ? AND m.idnhacungcap = ?
             LIMIT 1"
        );
        $check->execute([$carId, $providerId]);
        if (!$check->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Không tìm thấy xe thuộc nhà cung cấp']);
            exit;
        }

        $mappedStatus = $newStatus === 'available' ? 'hoatdong' : 'baoduong';

        $stmt = $conn->prepare("UPDATE xechiec SET tinhrang = ? WHERE id = ?");
        $stmt->execute([$mappedStatus, $carId]);
        echo json_encode(['success' => true]);
        exit;
    }

    echo json_encode(['success' => false, 'message' => 'Invalid action']);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống: ' . $e->getMessage()]);
}
