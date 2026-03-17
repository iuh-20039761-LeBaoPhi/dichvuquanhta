<?php
// File: api/book.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

if (!isset($conn)) {
    $conn = new mysqli("localhost", "root", "", "thonha");
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Lỗi kết nối database: " . $conn->connect_error], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$conn->set_charset("utf8mb4");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Chỉ chấp nhận POST request"], JSON_UNESCAPED_UNICODE);
    exit;
}

$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Dữ liệu không hợp lệ"], JSON_UNESCAPED_UNICODE);
    exit;
}

$name            = trim($data['name'] ?? '');
$phone           = trim($data['phone'] ?? '');
$service_name    = trim($data['service_id'] ?? ''); // field vẫn là service_id từ frontend
$address         = trim($data['address'] ?? '');
$note            = trim($data['note'] ?? '');
$selected_brand  = trim($data['selected_brand']  ?? '') ?: null;
$estimated_price = isset($data['estimated_price']) && $data['estimated_price'] > 0
    ? (int)$data['estimated_price'] : null;

if (empty($name) || empty($phone) || empty($service_name) || empty($address)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Vui lòng điền đầy đủ thông tin bắt buộc"], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!preg_match('/^(0|\+84)[0-9]{9}$/', $phone)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Số điện thoại không hợp lệ"], JSON_UNESCAPED_UNICODE);
    exit;
}

// Tạo mã đơn hàng
$order_code = "TN" . rand(100000, 999999);
$check_stmt = $conn->prepare("SELECT id FROM bookings WHERE order_code = ?");
$check_stmt->bind_param("s", $order_code);
$check_stmt->execute();
if ($check_stmt->get_result()->num_rows > 0) {
    $order_code = "TN" . rand(100000, 999999);
}
$check_stmt->close();

// Lưu selected_brand + estimated_price nếu cột tồn tại trong DB (migration an toàn)
// Dùng INSERT với các cột tùy chọn — nếu cột chưa có, fallback về INSERT cơ bản
$has_new_cols = false;
$col_check = $conn->query("SHOW COLUMNS FROM `bookings` LIKE 'estimated_price'");
if ($col_check && $col_check->num_rows > 0) $has_new_cols = true;

if ($has_new_cols) {
    $stmt = $conn->prepare(
        "INSERT INTO bookings (order_code, customer_name, phone, service_name, address, note, status, selected_brand, estimated_price, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, NOW())"
    );
    $stmt->bind_param("sssssssi", $order_code, $name, $phone, $service_name, $address, $note, $selected_brand, $estimated_price);
} else {
    $stmt = $conn->prepare(
        "INSERT INTO bookings (order_code, customer_name, phone, service_name, address, note, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'new', NOW())"
    );
    $stmt->bind_param("ssssss", $order_code, $name, $phone, $service_name, $address, $note);
}

if ($stmt->execute()) {
    echo json_encode([
        "status"     => "success",
        "message"    => "Đặt lịch thành công",
        "order_code" => $order_code,
        "booking_id" => $conn->insert_id
    ], JSON_UNESCAPED_UNICODE);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Lỗi khi tạo đơn hàng: " . $stmt->error], JSON_UNESCAPED_UNICODE);
}

$stmt->close();
$conn->close();
?>
