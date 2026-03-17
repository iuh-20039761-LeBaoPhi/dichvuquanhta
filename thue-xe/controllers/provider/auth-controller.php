<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');
require_once '../../config/database.php';

$action = $_GET['action'] ?? '';

if ($action === 'checkLogin') {
    if (isset($_SESSION['user_id']) && $_SESSION['user_role'] === 'provider') {
        echo json_encode(['success' => true, 'id' => $_SESSION['user_id'], 'name' => $_SESSION['user_name'], 'email' => $_SESSION['user_email'], 'company' => $_SESSION['user_company']]);
    } else {
        echo json_encode(['success' => false]);
    }
    exit;
}

if ($action === 'logout') {
    unset($_SESSION['user_id'], $_SESSION['user_name'], $_SESSION['user_email'], $_SESSION['user_role'], $_SESSION['user_company']);
    echo json_encode(['success' => true]);
    exit;
}

if ($action === 'register') {
    // Nhận multipart/form-data
    $full_name      = trim($_POST['full_name']      ?? '');
    $email          = strtolower(trim($_POST['email'] ?? ''));
    $phone          = trim($_POST['phone']           ?? '');
    $password       = $_POST['password']             ?? '';
    $company_name   = trim($_POST['company_name']   ?? '');
    $license_number = trim($_POST['license_number'] ?? '');
    $address        = trim($_POST['address']         ?? '');
    $description    = trim($_POST['description']     ?? '');

    if (!$full_name || !$email || !$phone || !$password || !$company_name) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ các trường bắt buộc']); exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Email không hợp lệ']); exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Mật khẩu phải có ít nhất 6 ký tự']); exit;
    }
    if (empty($_FILES['cccd_front']['tmp_name']) || empty($_FILES['cccd_back']['tmp_name'])) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng tải lên ảnh CCCD mặt trước và mặt sau']); exit;
    }

    function uploadImageTX($file, $prefix) {
        $allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!in_array($file['type'], $allowed)) return null;
        if ($file['size'] > 5 * 1024 * 1024) return null;
        $ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = $prefix . '_' . uniqid() . '.' . strtolower($ext);
        $dir      = __DIR__ . '/../../uploads/providers/';
        if (!is_dir($dir)) mkdir($dir, 0755, true);
        if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
            return 'uploads/providers/' . $filename;
        }
        return null;
    }

    $avatar_path     = isset($_FILES['avatar']['tmp_name'])     && $_FILES['avatar']['error']     === 0 ? uploadImageTX($_FILES['avatar'],     'avatar')     : null;
    $cccd_front_path = isset($_FILES['cccd_front']['tmp_name']) && $_FILES['cccd_front']['error'] === 0 ? uploadImageTX($_FILES['cccd_front'], 'cccd_front') : null;
    $cccd_back_path  = isset($_FILES['cccd_back']['tmp_name'])  && $_FILES['cccd_back']['error']  === 0 ? uploadImageTX($_FILES['cccd_back'],  'cccd_back')  : null;

    if (!$cccd_front_path || !$cccd_back_path) {
        echo json_encode(['success' => false, 'message' => 'Upload ảnh CCCD thất bại. Chỉ chấp nhận JPG/PNG, tối đa 5MB.']); exit;
    }

    try {
        $db   = new Database();
        $conn = $db->getConnection();

        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['success' => false, 'message' => 'Email này đã được đăng ký']); exit;
        }

        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare(
            "INSERT INTO users (full_name, email, phone, password, role, status, company_name, license_number, address, description, avatar, cccd_front, cccd_back)
             VALUES (?, ?, ?, ?, 'provider', 'pending', ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([$full_name, $email, $phone, $hashed, $company_name, $license_number, $address, $description, $avatar_path, $cccd_front_path, $cccd_back_path]);

        echo json_encode(['success' => true, 'message' => 'Đăng ký thành công! Vui lòng chờ admin xét duyệt tài khoản.']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống, vui lòng thử lại']);
    }
    exit;
}

if ($action === 'login') {
    $data     = json_decode(file_get_contents('php://input'), true);
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ thông tin']); exit;
    }

    try {
        $db   = new Database();
        $conn = $db->getConnection();

        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND role = 'provider' LIMIT 1");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            echo json_encode(['success' => false, 'message' => 'Email hoặc mật khẩu không đúng']); exit;
        }

        switch ($user['status']) {
            case 'pending':
                echo json_encode(['success' => false, 'message' => 'Tài khoản đang chờ admin xét duyệt']); exit;
            case 'rejected':
                echo json_encode(['success' => false, 'message' => 'Tài khoản đã bị từ chối. Vui lòng liên hệ admin.']); exit;
            case 'blocked':
                echo json_encode(['success' => false, 'message' => 'Tài khoản đã bị khóa']); exit;
        }

        $_SESSION['user_id']      = $user['id'];
        $_SESSION['user_name']    = $user['full_name'];
        $_SESSION['user_email']   = $user['email'];
        $_SESSION['user_role']    = 'provider';
        $_SESSION['user_company'] = $user['company_name'];

        echo json_encode(['success' => true, 'name' => $user['full_name'], 'company' => $user['company_name']]);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống!']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
