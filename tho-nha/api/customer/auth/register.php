<?php
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

$data      = json_decode(file_get_contents('php://input'), true);
$full_name = trim($data['full_name'] ?? '');
$email     = strtolower(trim($data['email'] ?? ''));
$phone     = trim($data['phone'] ?? '');
$password  = $data['password'] ?? '';

if (!$full_name || !$email || !$phone || !$password) {
    echo json_encode(['status' => 'error', 'message' => 'Vui lòng điền đầy đủ thông tin']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['status' => 'error', 'message' => 'Email không hợp lệ']);
    exit;
}
if (strlen($password) < 6) {
    echo json_encode(['status' => 'error', 'message' => 'Mật khẩu phải có ít nhất 6 ký tự']);
    exit;
}

$stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Email này đã được đăng ký']);
    exit;
}

$hashed = password_hash($password, PASSWORD_DEFAULT);
$role   = 'customer';
$status = 'active';
$stmt = $conn->prepare("INSERT INTO users (full_name, email, phone, password, role, status) VALUES (?, ?, ?, ?, ?, ?)");
$stmt->bind_param("ssssss", $full_name, $email, $phone, $hashed, $role, $status);

if ($stmt->execute()) {
    $_SESSION['user_id']    = $conn->insert_id;
    $_SESSION['user_name']  = $full_name;
    $_SESSION['user_email'] = $email;
    $_SESSION['user_phone'] = $phone;
    $_SESSION['user_role']  = 'customer';
    echo json_encode(['status' => 'success', 'name' => $full_name]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Đăng ký thất bại, vui lòng thử lại']);
}
