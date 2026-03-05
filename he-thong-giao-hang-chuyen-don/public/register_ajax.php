<?php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $fullname = trim($_POST['fullname'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';

    // Validate
    if (empty($username) || empty($password) || empty($email) || empty($phone) || empty($fullname)) {
        echo json_encode(['status' => 'error', 'message' => 'Vui lòng nhập đầy đủ thông tin.']);
        exit;
    } elseif ($password !== $confirm_password) {
        echo json_encode(['status' => 'error', 'message' => 'Mật khẩu xác nhận không khớp.']);
        exit;
    } elseif (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[a-z]/', $password) || !preg_match('/[0-9]/', $password) || !preg_match('/[\W_]/', $password)) {
        echo json_encode(['status' => 'error', 'message' => 'Mật khẩu yếu. Yêu cầu: tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.']);
        exit;
    } elseif (!preg_match('/^[a-zA-Z0-9_.]{3,20}$/', $username)) {
        echo json_encode(['status' => 'error', 'message' => 'Tên đăng nhập không hợp lệ (3-20 ký tự, không dấu, không khoảng trắng).']);
        exit;
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'Email không hợp lệ.']);
        exit;
    } elseif (!preg_match('/^0[0-9]{9,10}$/', $phone)) {
        echo json_encode(['status' => 'error', 'message' => 'Số điện thoại không hợp lệ.']);
        exit;
    } elseif (strlen($fullname) < 2) {
        echo json_encode(['status' => 'error', 'message' => 'Họ và tên quá ngắn.']);
        exit;
    }

    // Kiểm tra trùng lặp (Username, Email hoặc Số điện thoại)
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ? OR phone = ?");
    if (!$stmt) {
        error_log('Register Check Error: ' . $conn->error);
        echo json_encode(['status' => 'error', 'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.']);
        exit;
    }
    $stmt->bind_param("sss", $username, $email, $phone);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        echo json_encode(['status' => 'error', 'message' => 'Tên đăng nhập, Email hoặc Số điện thoại đã được sử dụng.']);
    } else {
        // Tạo tài khoản
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        $role = 'customer';

        $insert_stmt = $conn->prepare("INSERT INTO users (username, email, phone, fullname, password, role) VALUES (?, ?, ?, ?, ?, ?)");
        if (!$insert_stmt) {
            error_log('Register Insert Error: ' . $conn->error);
            echo json_encode(['status' => 'error', 'message' => 'Lỗi hệ thống. Vui lòng thử lại sau.']);
            exit;
        }
        $insert_stmt->bind_param("ssssss", $username, $email, $phone, $fullname, $hashed_password, $role);

        if ($insert_stmt->execute()) {
            // BẢO MẬT: Chống Session Fixation
            session_regenerate_id(true);
            // Đăng ký thành công -> Tự động đăng nhập luôn (Set Session)
            $_SESSION['user_id'] = $insert_stmt->insert_id;
            $_SESSION['username'] = $username;
            $_SESSION['role'] = $role;

            // Trả về thông tin user để điền vào form đặt hàng
            echo json_encode(['status' => 'success', 'message' => 'Đăng ký thành công!', 'user' => ['fullname' => $fullname, 'phone' => $phone]]);
        } else {
            error_log('Register Execute Error: ' . $insert_stmt->error);
            echo json_encode(['status' => 'error', 'message' => 'Không thể tạo tài khoản. Vui lòng thử lại.']);
        }
        $insert_stmt->close();
    }
    $stmt->close();
}
$conn->close();
?>
