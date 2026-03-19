<?php
// File: api/get_services.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';

$category_id = isset($_GET['category_id']) ? (int)$_GET['category_id'] : 0;

if ($category_id <= 0) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Category ID không hợp lệ"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Query lấy dịch vụ theo category (bao gồm pricing_json cho phí di chuyển/khảo sát)
$sql = "SELECT id, name, price, labor_cost, material_cost, brand, warranty, duration, brand_prices, description, pricing_json FROM services
        WHERE category_id = ? AND is_active = 1
        ORDER BY name ASC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Lỗi prepare statement: " . $conn->error
    ], JSON_UNESCAPED_UNICODE);
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
        // Pricing fields mới: travelFee, surveyFee, priceRange (null nếu chưa có)
        "pricing_json"  => $pj,
        "travel_fee"    => $pj['travelFee']  ?? null,
        "survey_fee"    => $pj['surveyFee']  ?? null,
        "price_range"   => $pj['priceRange'] ?? null,
    ];
}

// Trả về array trực tiếp
echo json_encode($services, JSON_UNESCAPED_UNICODE);

$stmt->close();
$conn->close();
?>