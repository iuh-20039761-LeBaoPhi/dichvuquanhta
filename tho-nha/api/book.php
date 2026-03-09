<?php
// File: api/book.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

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

// Chỉ chấp nhận POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        "status" => "error",
        "message" => "Chỉ chấp nhận POST request"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Lấy dữ liệu JSON từ request body
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validate dữ liệu
if (!$data) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Dữ liệu không hợp lệ"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$name = trim($data['name'] ?? '');
$phone = trim($data['phone'] ?? '');
$service_id = trim($data['service_id'] ?? '');
$address = trim($data['address'] ?? '');
$note = trim($data['note'] ?? '');

// Validate các trường bắt buộc
if (empty($name) || empty($phone) || empty($service_id) || empty($address)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Vui lòng điền đầy đủ thông tin bắt buộc"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Validate số điện thoại
if (!preg_match('/^(0|\+84)[0-9]{9}$/', $phone)) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Số điện thoại không hợp lệ"
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

// Tạo mã đơn hàng
$order_code = "TN" . rand(100000, 999999);

// Kiểm tra trùng mã (rất hiếm nhưng cần check)
$check_sql = "SELECT id FROM bookings WHERE order_code = ?";
$check_stmt = $conn->prepare($check_sql);
$check_stmt->bind_param("s", $order_code);
$check_stmt->execute();
if ($check_stmt->get_result()->num_rows > 0) {
    // Nếu trùng, tạo lại
    $order_code = "TN" . rand(100000, 999999);
}
$check_stmt->close();

// Lấy thông tin service để lấy service_id và price
$service_sql = "SELECT id, price FROM services WHERE name = ? AND is_active = 1 LIMIT 1";
$service_stmt = $conn->prepare($service_sql);
$service_stmt->bind_param("s", $service_id);
$service_stmt->execute();
$service_result = $service_stmt->get_result();

if ($service_result->num_rows === 0) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "message" => "Dịch vụ không tồn tại hoặc đã ngừng hoạt động"
    ], JSON_UNESCAPED_UNICODE);
    $service_stmt->close();
    exit;
}

$service_row = $service_result->fetch_assoc();
$service_id_real = $service_row['id'];
$service_price = $service_row['price'];
$service_stmt->close();

// Bắt đầu transaction
$conn->begin_transaction();

try {
    // 1. Insert vào bảng bookings
    $booking_sql = "INSERT INTO bookings (order_code, customer_name, phone, address, note, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, 'new', NOW())";
    $booking_stmt = $conn->prepare($booking_sql);
    $booking_stmt->bind_param("sssss", $order_code, $name, $phone, $address, $note);
    
    if (!$booking_stmt->execute()) {
        throw new Exception("Lỗi khi tạo đơn hàng: " . $booking_stmt->error);
    }
    
    $booking_id = $conn->insert_id;
    $booking_stmt->close();
    
    // 2. Insert vào bảng booking_services
    $booking_service_sql = "INSERT INTO booking_services (booking_id, service_id, price) VALUES (?, ?, ?)";
    $booking_service_stmt = $conn->prepare($booking_service_sql);
    $booking_service_stmt->bind_param("iis", $booking_id, $service_id_real, $service_price);
    
    if (!$booking_service_stmt->execute()) {
        throw new Exception("Lỗi khi thêm dịch vụ: " . $booking_service_stmt->error);
    }
    
    $booking_service_stmt->close();
    
    // Commit transaction
    $conn->commit();
    
    // Trả về kết quả thành công
    echo json_encode([
        "status" => "success",
        "message" => "Đặt lịch thành công",
        "order_code" => $order_code,
        "booking_id" => $booking_id
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    // Rollback nếu có lỗi
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

$conn->close();
?>