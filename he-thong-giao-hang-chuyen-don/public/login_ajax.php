<?php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        echo json_encode(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ thông tin.']);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, username, password, role, fullname, phone, is_locked, lock_reason, is_approved FROM users WHERE username = ?");
    if (!$stmt) {
        error_log('Login Prepare Error: ' . $conn->error); // Ghi log lỗi server
        echo json_encode(['status' => 'error', 'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.']);
        exit;
    }
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        // --- FIX: Kiểm tra xem tài khoản có bị khóa không ---
        if ($user['is_locked'] == 1) {
            $reason = $user['lock_reason'] ? $user['lock_reason'] : "Vi phạm chính sách";
            echo json_encode(['status' => 'error', 'message' => 'Tài khoản bị khóa. Lý do: ' . $reason]);
            exit;
        } elseif ($user['role'] === 'shipper' && $user['is_approved'] == 0) {
            echo json_encode(['status' => 'error', 'message' => 'Tài khoản shipper của bạn đang chờ quản trị viên duyệt.']);
            exit;
        }

        if (password_verify($password, $user['password'])) {
            // BẢO MẬT: Tạo lại Session ID để chống Session Fixation
            session_regenerate_id(true);

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];

            echo json_encode(['status' => 'success', 'message' => 'Đăng nhập thành công!', 'user' => $user]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Mật khẩu không chính xác.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Tên đăng nhập không tồn tại.']);
    }
    $stmt->close();
}
$conn->close();
?>
