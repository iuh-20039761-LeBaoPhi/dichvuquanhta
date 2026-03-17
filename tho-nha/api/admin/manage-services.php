<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');

// ❌ Không dùng * nếu dùng session
// header('Access-Control-Allow-Origin: *');

require_once '../db.php';

// 🔒 Bảo vệ admin
if (!isset($_SESSION['admin_id'])) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unauthorized'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? ($_GET['action'] ?? '');

/**
 * Xây dựng pricing_json từ dữ liệu form admin.
 * Trả về array hoặc null nếu không có phí nào được nhập.
 */
function _buildPricingJson(array $data): ?array {
    $result = [];

    // Phí di chuyển
    $tfFixed = isset($data['travel_fee_fixed']) && $data['travel_fee_fixed'] !== ''
        ? intval($data['travel_fee_fixed']) : null;
    $tfMin = isset($data['travel_fee_min']) && $data['travel_fee_min'] !== ''
        ? intval($data['travel_fee_min']) : null;
    $tfMax = isset($data['travel_fee_max']) && $data['travel_fee_max'] !== ''
        ? intval($data['travel_fee_max']) : null;

    if ($tfFixed !== null || $tfMin !== null || $tfMax !== null) {
        $result['travelFee'] = array_filter([
            'mode'        => ($tfMin !== null || $tfMax !== null) ? 'distanceTier' : 'fixed',
            'fixedAmount' => $tfFixed,
            'min'         => $tfMin ?? $tfFixed,
            'max'         => $tfMax ?? $tfFixed,
        ], fn($v) => $v !== null);
    }

    // Phí khảo sát
    $sfAmt = isset($data['survey_fee_amount']) && $data['survey_fee_amount'] !== ''
        ? intval($data['survey_fee_amount']) : null;

    if ($sfAmt !== null) {
        $result['surveyFee'] = [
            'amount'        => $sfAmt,
            'required'      => !empty($data['survey_fee_required']),
            'waiveIfBooked' => !empty($data['survey_fee_waive']),
            'deductToFinal' => !empty($data['survey_fee_deduct']),
        ];
    }

    return empty($result) ? null : $result;
}

try {

    switch ($action) {

        /* ==================== GET ALL ==================== */
        case 'get_all':

            $sql = "
                SELECT
                    sc.id AS category_id,
                    sc.name AS category_name,
                    sc.description AS category_description,
                    sc.is_active AS category_active,
                    s.id AS service_id,
                    s.name AS service_name,
                    s.price,
                    s.labor_cost,
                    s.material_cost,
                    s.brand,
                    s.warranty,
                    s.duration,
                    s.description AS service_description,
                    s.is_active AS service_active,
                    s.pricing_json
                FROM service_categories sc
                LEFT JOIN services s ON sc.id = s.category_id
                ORDER BY sc.id, s.id
            ";

            $result = $conn->query($sql);
            if (!$result) throw new Exception($conn->error);

            $categories = [];

            while ($row = $result->fetch_assoc()) {
                $catId = $row['category_id'];

                if (!isset($categories[$catId])) {
                    $categories[$catId] = [
                        'id' => $catId,
                        'name' => $row['category_name'],
                        'description' => $row['category_description'],
                        'is_active' => $row['category_active'],
                        'services' => []
                    ];
                }

                if ($row['service_id']) {
                    $pj = !empty($row['pricing_json']) ? json_decode($row['pricing_json'], true) : [];
                    $categories[$catId]['services'][] = [
                        'id'            => $row['service_id'],
                        'name'          => $row['service_name'],
                        'price'         => $row['price'],
                        'labor_cost'    => $row['labor_cost'],
                        'material_cost' => $row['material_cost'],
                        'brand'         => $row['brand'],
                        'warranty'      => $row['warranty'],
                        'duration'      => $row['duration'],
                        'description'   => $row['service_description'],
                        'is_active'     => $row['service_active'],
                        'pricing_json'  => $row['pricing_json'] ?? null,
                        // Flatten pricing fields for admin UI convenience
                        'travel_fee_fixed'    => $pj['travelFee']['fixedAmount'] ?? null,
                        'travel_fee_min'      => $pj['travelFee']['min']         ?? null,
                        'travel_fee_max'      => $pj['travelFee']['max']         ?? null,
                        'survey_fee_amount'   => $pj['surveyFee']['amount']      ?? null,
                        'survey_fee_required' => $pj['surveyFee']['required']    ?? false,
                        'survey_fee_waive'    => $pj['surveyFee']['waiveIfBooked']  ?? false,
                        'survey_fee_deduct'   => $pj['surveyFee']['deductToFinal']  ?? false,
                    ];
                }
            }

            echo json_encode([
                'status' => 'success',
                'data' => array_values($categories)
            ], JSON_UNESCAPED_UNICODE);
            break;

        /* ==================== CATEGORY ==================== */
        case 'add_category':
            $name = trim($data['name'] ?? '');
            $description = trim($data['description'] ?? '');

            if ($name === '') throw new Exception('Tên danh mục không được để trống');

            $stmt = $conn->prepare(
                "INSERT INTO service_categories (name, description) VALUES (?, ?)"
            );
            $stmt->bind_param("ss", $name, $description);
            $stmt->execute();

            echo json_encode(['status'=>'success','message'=>'Thêm danh mục thành công']);
            break;

        case 'update_category':
            $id = intval($data['id'] ?? 0);
            $name = trim($data['name'] ?? '');
            $description = trim($data['description'] ?? '');

            if (!$id || $name === '') throw new Exception('Thông tin không hợp lệ');

            $stmt = $conn->prepare(
                "UPDATE service_categories SET name=?, description=? WHERE id=?"
            );
            $stmt->bind_param("ssi", $name, $description, $id);
            $stmt->execute();

            echo json_encode(['status'=>'success','message'=>'Cập nhật danh mục thành công']);
            break;

        case 'delete_category':
            $id = intval($data['id'] ?? 0);
            if (!$id) throw new Exception('ID không hợp lệ');

            $stmt = $conn->prepare(
                "SELECT COUNT(*) AS total FROM services WHERE category_id=?"
            );
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $count = $stmt->get_result()->fetch_assoc()['total'];

            if ($count > 0) {
                throw new Exception('Danh mục đang có dịch vụ');
            }

            $stmt = $conn->prepare("DELETE FROM service_categories WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();

            echo json_encode(['status'=>'success','message'=>'Xóa danh mục thành công']);
            break;

        /* ==================== SERVICE ==================== */
        case 'add_service':
            $category_id    = intval($data['category_id'] ?? 0);
            $name           = trim($data['name'] ?? '');
            $price          = floatval($data['price'] ?? 0);
            $labor_cost     = trim($data['labor_cost'] ?? '') ?: null;
            $material_cost  = trim($data['material_cost'] ?? '') ?: null;
            $brand          = trim($data['brand'] ?? '') ?: null;
            $warranty       = trim($data['warranty'] ?? '') ?: null;
            $duration       = trim($data['duration'] ?? '') ?: null;
            $description    = trim($data['description'] ?? '');

            if (!$category_id || $name === '' || !$price) {
                throw new Exception('Thiếu thông tin');
            }

            // Xây dựng pricing_json từ các trường phí
            $pricing = _buildPricingJson($data);
            $pricing_json = $pricing ? json_encode($pricing, JSON_UNESCAPED_UNICODE) : null;

            $stmt = $conn->prepare(
                "INSERT INTO services (category_id, name, price, labor_cost, material_cost, brand, warranty, duration, description, pricing_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->bind_param("isdsssssss", $category_id, $name, $price, $labor_cost, $material_cost, $brand, $warranty, $duration, $description, $pricing_json);
            $stmt->execute();

            echo json_encode(['status'=>'success','message'=>'Thêm dịch vụ thành công']);
            break;

        case 'update_service':
            $id             = intval($data['id'] ?? 0);
            $category_id    = intval($data['category_id'] ?? 0);
            $name           = trim($data['name'] ?? '');
            $price          = floatval($data['price'] ?? 0);
            $labor_cost     = trim($data['labor_cost'] ?? '') ?: null;
            $material_cost  = trim($data['material_cost'] ?? '') ?: null;
            $brand          = trim($data['brand'] ?? '') ?: null;
            $warranty       = trim($data['warranty'] ?? '') ?: null;
            $duration       = trim($data['duration'] ?? '') ?: null;
            $description    = trim($data['description'] ?? '');

            if (!$id || !$category_id || $name === '' || !$price) {
                throw new Exception('Thông tin không hợp lệ');
            }

            $pricing = _buildPricingJson($data);
            $pricing_json = $pricing ? json_encode($pricing, JSON_UNESCAPED_UNICODE) : null;

            $stmt = $conn->prepare(
                "UPDATE services
                 SET category_id=?, name=?, price=?, labor_cost=?, material_cost=?, brand=?, warranty=?, duration=?, description=?, pricing_json=?
                 WHERE id=?"
            );
            $stmt->bind_param("isdsssssssi", $category_id, $name, $price, $labor_cost, $material_cost, $brand, $warranty, $duration, $description, $pricing_json, $id);
            $stmt->execute();

            echo json_encode(['status'=>'success','message'=>'Cập nhật dịch vụ thành công']);
            break;

        case 'delete_service':
            $id = intval($data['id'] ?? 0);
            if (!$id) throw new Exception('ID không hợp lệ');

            $stmt = $conn->prepare("DELETE FROM services WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();

            echo json_encode(['status'=>'success','message'=>'Xóa dịch vụ thành công']);
            break;

        default:
            throw new Exception('Action không hợp lệ');
    }

} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
