<?php
/**
 * Public — Get Categories
 * Bảng service_categories → danhmuc, cột hoatdong.
 * AS alias giữ nguyên API contract.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../../config/database.php';

$sql    = "SELECT id, ten AS name FROM danhmuc WHERE hoatdong = 1 ORDER BY id ASC";
$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi query: " . $conn->error], JSON_UNESCAPED_UNICODE);
    exit;
}

$categories = [];
while ($row = $result->fetch_assoc()) {
    $categories[] = [
        "id"   => (int)$row['id'],
        "name" => $row['name']
    ];
}

echo json_encode($categories, JSON_UNESCAPED_UNICODE);

$conn->close();
