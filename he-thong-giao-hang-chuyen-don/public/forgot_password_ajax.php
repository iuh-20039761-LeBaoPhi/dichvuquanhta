<?php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $email = trim($_POST['email'] ?? '');

    if (empty($email)) {
        echo json_encode(['status' => 'error', 'message' => 'Vui lòng nhập email.']);
        exit;
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['status' => 'error', 'message' => 'Email không hợp lệ.']);
        exit;
    }

    // Kiểm tra email có tồn tại trong hệ thống không
    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        // Trong thực tế: Tại đây bạn sẽ tạo token và gửi email reset password
        // Ở đây ta giả lập thành công
        echo json_encode(['status' => 'success', 'message' => 'Yêu cầu thành công! Vui lòng kiểm tra email để đặt lại mật khẩu.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Email này chưa được đăng ký.']);
    }
    $stmt->close();
}
$conn->close();
?>
