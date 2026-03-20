<?php
/**
 * Public — Book Service
 * Bảng bookings → datlich, cột tiếng Việt không dấu.
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../../config/session.php';
require_once __DIR__ . '/../../config/database.php';

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

$name            = trim($data['name']           ?? '');
$phone           = trim($data['phone']          ?? '');
$service_name    = trim($data['service_id']     ?? ''); // field vẫn là service_id từ frontend
$address         = trim($data['address']        ?? '');
$note            = trim($data['note']           ?? '');
$selected_brand  = trim($data['selected_brand'] ?? '') ?: null;
$estimated_price = isset($data['estimated_price']) && $data['estimated_price'] > 0
    ? (int)$data['estimated_price'] : null;

// Nếu khách đã đăng nhập thì gắn idkhachhang, không bắt buộc
$user_id = (isset($_SESSION['user_id']) && $_SESSION['user_role'] === 'customer')
    ? (int)$_SESSION['user_id']
    : null;

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
$check_stmt = $conn->prepare("SELECT id FROM datlich WHERE madondatlich = ?");
$check_stmt->bind_param("s", $order_code);
$check_stmt->execute();
if ($check_stmt->get_result()->num_rows > 0) {
    $order_code = "TN" . rand(100000, 999999);
}
$check_stmt->close();

$stmt = $conn->prepare(
    "INSERT INTO datlich (madondatlich, tenkhachhang, sodienthoai, tendichvu, diachi, ghichu, trangthai, thuonghieuchon, giauoctinh, idkhachhang, ngaytao)
     VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, NOW())"
);
$stmt->bind_param("sssssssii", $order_code, $name, $phone, $service_name, $address, $note, $selected_brand, $estimated_price, $user_id);

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
