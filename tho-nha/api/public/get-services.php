<?php
/**
 * Public — Get Services by Category
 * Bảng services → dichvu, service_categories → danhmuc.
 * AS alias giữ nguyên API contract.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';

$category_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;

if ($category_id <= 0) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Category ID không hợp lệ"], JSON_UNESCAPED_UNICODE);
    exit;
}

$sql = "SELECT id,
               ten              AS name,
               gia              AS price,
               tiencong         AS labor_cost,
               chiphivatlieu    AS material_cost,
               thuonghieu       AS brand,
               baohanh          AS warranty,
               thoigianthuchien AS duration,
               giatheothuonghieu AS brand_prices,
               mota             AS description,
               jsongia          AS pricing_json
        FROM dichvu
        WHERE iddanhmuc = ? AND hoatdong = 1
        ORDER BY ten ASC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi prepare statement: " . $conn->error], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt->bind_param("i", $category_id);
$stmt->execute();
$result = $stmt->get_result();

$services = [];
while ($row = $result->fetch_assoc()) {
    $pj = !empty($row['pricing_json']) ? json_decode($row['pricing_json'], true) : null;
    $services[] = [
        "id"            => (int)$row['id'],
        "name"          => $row['name'],
        "price"         => $row['price'],
        "labor_cost"    => $row['labor_cost'],
        "material_cost" => $row['material_cost'],
        "brand"         => $row['brand'],
        "warranty"      => $row['warranty'],
        "duration"      => $row['duration'],
        "brand_prices"  => $row['brand_prices'] ? json_decode($row['brand_prices'], true) : null,
        "description"   => $row['description'],
        "pricing_json"  => $pj,
        "travel_fee"    => $pj['travelFee']  ?? null,
        "survey_fee"    => $pj['surveyFee']  ?? null,
        "price_range"   => $pj['priceRange'] ?? null,
    ];
}

echo json_encode($services, JSON_UNESCAPED_UNICODE);

$stmt->close();
$conn->close();
