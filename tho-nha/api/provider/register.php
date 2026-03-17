<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../db.php';

// Đọc từ $_POST (multipart/form-data)
$full_name    = trim($_POST['full_name']    ?? '');
$email        = strtolower(trim($_POST['email'] ?? ''));
$phone        = trim($_POST['phone']        ?? '');
$password     = $_POST['password']          ?? '';
$company_name = trim($_POST['company_name'] ?? '');
$address      = trim($_POST['address']      ?? '');
$description  = trim($_POST['description']  ?? '');

if (!$full_name || !$email || !$phone || !$password || !$company_name) {
    echo json_encode(['status' => 'error', 'message' => 'Vui lòng điền đầy đủ các trường bắt buộc']);
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
if (empty($_FILES['cccd_front']['tmp_name']) || empty($_FILES['cccd_back']['tmp_name'])) {
    echo json_encode(['status' => 'error', 'message' => 'Vui lòng tải lên ảnh CCCD mặt trước và mặt sau']);
    exit;
}

// Kiểm tra email trùng
$stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
if ($stmt->get_result()->num_rows > 0) {
    echo json_encode(['status' => 'error', 'message' => 'Email này đã được đăng ký']);
    exit;
}

// --- Hàm upload ảnh ---
function uploadImage($file, $prefix) {
    $allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!in_array($file['type'], $allowed)) return null;
    if ($file['size'] > 5 * 1024 * 1024) return null; // 5MB

    $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $prefix . '_' . uniqid() . '.' . strtolower($ext);
    $dir      = __DIR__ . '/../../uploads/providers/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        return 'uploads/providers/' . $filename;
    }
    return null;
}

$avatar_path     = isset($_FILES['avatar']['tmp_name'])     && $_FILES['avatar']['error']     === 0 ? uploadImage($_FILES['avatar'],     'avatar')     : null;
$cccd_front_path = isset($_FILES['cccd_front']['tmp_name']) && $_FILES['cccd_front']['error'] === 0 ? uploadImage($_FILES['cccd_front'], 'cccd_front') : null;
$cccd_back_path  = isset($_FILES['cccd_back']['tmp_name'])  && $_FILES['cccd_back']['error']  === 0 ? uploadImage($_FILES['cccd_back'],  'cccd_back')  : null;

if (!$cccd_front_path || !$cccd_back_path) {
    echo json_encode(['status' => 'error', 'message' => 'Upload ảnh CCCD thất bại. Chỉ chấp nhận JPG/PNG, tối đa 5MB.']);
    exit;
}

$hashed = password_hash($password, PASSWORD_DEFAULT);
$role   = 'provider';
$status = 'pending';

$stmt = $conn->prepare(
    "INSERT INTO users (full_name, email, phone, password, role, status, company_name, address, description, avatar, cccd_front, cccd_back)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$stmt->bind_param("ssssssssssss",
    $full_name, $email, $phone, $hashed, $role, $status,
    $company_name, $address, $description,
    $avatar_path, $cccd_front_path, $cccd_back_path
);

if ($stmt->execute()) {
    echo json_encode(['status' => 'success', 'message' => 'Đăng ký thành công! Vui lòng chờ admin xét duyệt tài khoản.']);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Đăng ký thất bại, vui lòng thử lại']);
}
