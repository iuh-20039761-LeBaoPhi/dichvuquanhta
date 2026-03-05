<?php
session_start();
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = trim($_POST['name'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $subject = trim($_POST['subject'] ?? 'Tuvan');
    $message = trim($_POST['message'] ?? '');

    $errors = [];
    if (empty($name))
        $errors[] = "Chưa nhập họ tên.";
    if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL))
        $errors[] = "Email không hợp lệ.";
    if (empty($phone))
        $errors[] = "Chưa nhập số điện thoại.";
    if (empty($message))
        $errors[] = "Chưa nhập nội dung tin nhắn.";

    if (!empty($errors)) {
        echo json_encode(['status' => 'error', 'message' => implode('<br>', $errors)]);
        exit;
    }

    $user_id = $_SESSION['user_id'] ?? null;
    $ip_address = $_SERVER['REMOTE_ADDR'];
    $status = 0; // 0 = Mới

    $stmt = $conn->prepare("INSERT INTO contact_messages (user_id, name, email, phone, subject, message, ip_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("issssssi", $user_id, $name, $email, $phone, $subject, $message, $ip_address, $status);

    if ($stmt->execute()) {
        echo json_encode(['status' => 'success', 'message' => 'Gửi tin nhắn thành công! Chúng tôi sẽ liên hệ với bạn sớm nhất.']);
    } else {
        error_log("Inquiry Error: " . $stmt->error);
        echo json_encode(['status' => 'error', 'message' => 'Có lỗi xảy ra, vui lòng thử lại.']);
    }
    $stmt->close();
    $conn->close();
} else {
    echo json_encode(['status' => 'error', 'message' => 'Phương thức không hợp lệ.']);
}
?>
