<?php
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../../../config/database.php';

$data     = json_decode(file_get_contents('php://input'), true);
$phone    = trim($data['phone'] ?? '');
$password = $data['password'] ?? '';

if (!$phone || !$password) {
    echo json_encode(['status' => 'error', 'message' => 'Vui lòng điền đầy đủ thông tin']);
    exit;
}

$stmt = $conn->prepare("SELECT * FROM users WHERE phone = ? AND role = 'provider' LIMIT 1");
$stmt->bind_param("s", $phone);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user || !password_verify($password, $user['password'])) {
    echo json_encode(['status' => 'error', 'message' => 'Số điện thoại hoặc mật khẩu không đúng']);
    exit;
}

switch ($user['status']) {
    case 'pending':
        echo json_encode(['status' => 'error', 'message' => 'Tài khoản đang chờ admin xét duyệt']);
        exit;
    case 'rejected':
        echo json_encode(['status' => 'error', 'message' => 'Tài khoản đã bị từ chối. Vui lòng liên hệ admin.']);
        exit;
    case 'blocked':
        echo json_encode(['status' => 'error', 'message' => 'Tài khoản đã bị khóa']);
        exit;
}

$_SESSION['user_id']      = $user['id'];
$_SESSION['user_name']    = $user['full_name'];
$_SESSION['user_email']   = $user['email'];
$_SESSION['user_role']    = 'provider';
$_SESSION['user_company'] = $user['company_name'];

echo json_encode([
    'status'  => 'success',
    'name'    => $user['full_name'],
    'company' => $user['company_name']
]);
