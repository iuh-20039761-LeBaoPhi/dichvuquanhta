<?php
// File: api/get_categories.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Include file kết nối database
require_once 'db.php';

// Nếu db.php không có biến $conn, tạo kết nối mới
if (!isset($conn)) {
    $conn = new mysqli("localhost", "root", "", "thonha");
    
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode([
            "status" => "error",
            "message" => "Lỗi kết nối database: " . $conn->connect_error
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// Set charset UTF-8
$conn->set_charset("utf8mb4");

// Query lấy danh mục - SỬA TÊN BẢNG
$sql = "SELECT id, name FROM service_categories WHERE is_active = 1 ORDER BY id ASC";
$result = $conn->query($sql);

if (!$result) {
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => "Lỗi query: " . $conn->error
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$categories = [];
while ($row = $result->fetch_assoc()) {
    $categories[] = [
        "id" => (int)$row['id'],
        "name" => $row['name']
    ];
}

// Trả về array trực tiếp
echo json_encode($categories, JSON_UNESCAPED_UNICODE);

$conn->close();
?>