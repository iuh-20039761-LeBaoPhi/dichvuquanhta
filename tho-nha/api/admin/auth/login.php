<?php
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

$data     = json_decode(file_get_contents('php://input'), true);
$email    = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';

if (!$email || !$password) {
    echo json_encode(['status' => 'error', 'message' => 'Thiếu thông tin']);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND role = 'admin' LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user || !password_verify($password, $user['password'])) {
    echo json_encode(['status' => 'error', 'message' => 'Sai email hoặc mật khẩu']);
    exit;
}
if ($user['status'] === 'blocked') {
    echo json_encode(['status' => 'error', 'message' => 'Tài khoản đã bị khóa']);
    exit;
}

$_SESSION['admin_id']       = $user['id'];
$_SESSION['admin_username'] = $user['full_name']; // Giữ key cũ để tương thích admin panel

echo json_encode([
    'status'   => 'success',
    'username' => $user['full_name']
]);
