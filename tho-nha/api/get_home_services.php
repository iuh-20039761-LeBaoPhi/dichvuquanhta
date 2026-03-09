<?php
require "db.php";

$sql = "
SELECT 
    c.id AS category_id,
    c.name AS category_name,
    s.id AS service_id,
    s.name AS service_name,
    s.price
FROM service_categories c
LEFT JOIN services s ON s.category_id = c.id
WHERE c.is_active = 1 AND s.is_active = 1
ORDER BY c.id, s.id
";

$stmt = $pdo->query($sql);

$result = [];
while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $cid = $row['category_id'];

    if (!isset($result[$cid])) {
        $result[$cid] = [
            "name" => $row['category_name'],
            "services" => []
        ];
    }

    $result[$cid]['services'][] = [
        "name" => $row['service_name'],
        "price" => $row['price']
    ];
}

echo json_encode(array_values($result), JSON_UNESCAPED_UNICODE);
