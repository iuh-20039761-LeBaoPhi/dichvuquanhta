<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json');
require_once '../../config/database.php';

$action = $_GET['action'] ?? '';

if ($action === 'changePassword') {
    if (!isset($_SESSION['admin_id'])) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
    $data           = json_decode(file_get_contents('php://input'), true);
    $currentPwd     = $data['current_password'] ?? '';
    $newPwd         = $data['new_password'] ?? '';
    $confirmPwd     = $data['confirm_password'] ?? '';

    if (empty($currentPwd) || empty($newPwd) || empty($confirmPwd)) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ các trường']);
        exit;
    }
    if (strlen($newPwd) < 6) {
        echo json_encode(['success' => false, 'message' => 'Mật khẩu mới phải có ít nhất 6 ký tự']);
        exit;
    }
    if ($newPwd !== $confirmPwd) {
        echo json_encode(['success' => false, 'message' => 'Xác nhận mật khẩu không khớp']);
        exit;
    }

    try {
        $db   = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare("SELECT password FROM admins WHERE id = ? LIMIT 1");
        $stmt->execute([$_SESSION['admin_id']]);
        $admin = $stmt->fetch();

        if (!$admin || !password_verify($currentPwd, $admin['password'])) {
            echo json_encode(['success' => false, 'message' => 'Mật khẩu hiện tại không đúng']);
            exit;
        }

        $hashed = password_hash($newPwd, PASSWORD_DEFAULT);
        $upd    = $conn->prepare("UPDATE admins SET password = ? WHERE id = ?");
        $upd->execute([$hashed, $_SESSION['admin_id']]);
        echo json_encode(['success' => true, 'message' => 'Đổi mật khẩu thành công!']);
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống!']);
    }
    exit;
}

if ($action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $username = trim($data['username'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ thông tin!']);
        exit;
    }

    try {
        $db = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare("SELECT * FROM users WHERE email = ? AND role = 'admin' LIMIT 1");
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password'])) {
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_name'] = $admin['full_name'];
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Tên đăng nhập hoặc mật khẩu không đúng!']);
        }
    } catch (PDOException $e) {
        echo json_encode(['success' => false, 'message' => 'Lỗi hệ thống!']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Invalid action']);
?>
