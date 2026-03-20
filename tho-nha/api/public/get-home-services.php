<?php
/**
 * Public — Get Home Services (categories + services overview)
 * Bảng service_categories → danhmuc, services → dichvu.
 * AS alias giữ nguyên API contract.
 */
require_once __DIR__ . '/../../config/database.php';

header("Content-Type: application/json; charset=utf-8");

$sql = "
SELECT
    dc.id   AS category_id,
    dc.ten  AS category_name,
    dv.id   AS service_id,
    dv.ten  AS service_name,
    dv.gia  AS price
FROM danhmuc dc
LEFT JOIN dichvu dv ON dv.iddanhmuc = dc.id
WHERE dc.hoatdong = 1 AND dv.hoatdong = 1
ORDER BY dc.id, dv.id
";

$stmt = $conn->query($sql);

if (!$stmt) {
    echo json_encode(["error" => "Query thất bại: " . $conn->error], JSON_UNESCAPED_UNICODE);
    exit;
}

$result = [];
while ($row = $stmt->fetch_assoc()) {
    $cid = $row['category_id'];

    if (!isset($result[$cid])) {
        $result[$cid] = [
            "name"     => $row['category_name'],
            "services" => []
        ];
    }

    $result[$cid]['services'][] = [
        "name"  => $row['service_name'],
        "price" => $row['price']
    ];
}

echo json_encode(array_values($result), JSON_UNESCAPED_UNICODE);
