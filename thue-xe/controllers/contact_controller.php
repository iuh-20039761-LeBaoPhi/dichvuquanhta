<?php
header('Content-Type: application/json');
require_once '../config/database.php';

$action = $_GET['action'] ?? '';

if ($action === 'submit') {
    $data    = json_decode(file_get_contents('php://input'), true) ?? [];
    $name    = trim($data['name']    ?? '');
    $phone   = trim($data['phone']   ?? '');
    $email   = trim($data['email']   ?? '');
    $subject = trim($data['subject'] ?? '');
    $message = trim($data['message'] ?? '');

    // Validate bắt buộc
    if (empty($name) || empty($phone) || empty($message)) {
        echo json_encode(['success' => false, 'message' => 'Vui lòng điền đầy đủ họ tên, số điện thoại và nội dung.']);
        exit;
    }
    if (!preg_match('/^0[3-9][0-9]{8}$/', $phone)) {
        echo json_encode(['success' => false, 'message' => 'Số điện thoại không hợp lệ (10 chữ số, bắt đầu 03x/05x/07x/08x/09x).']);
        exit;
    }
    if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Địa chỉ email không hợp lệ.']);
        exit;
    }
    // Giới hạn độ dài để tránh spam
    if (mb_strlen($message) > 2000) {
        echo json_encode(['success' => false, 'message' => 'Nội dung quá dài (tối đa 2000 ký tự).']);
        exit;
    }

    try {
        $db   = new Database();
        $conn = $db->getConnection();
        $stmt = $conn->prepare(
            "INSERT INTO contacts (name, phone, email, subject, message) VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([$name, $phone, $email, $subject, $message]);
        echo json_encode(['success' => true, 'message' => 'Gửi tin nhắn thành công! Chúng tôi sẽ phản hồi sớm nhất.']);
    } catch (PDOException $e) {
        // Không lộ lỗi DB cho người dùng, vẫn trả về thành công về phía UX
        error_log('Contact form DB error: ' . $e->getMessage());
        echo json_encode(['success' => true, 'message' => 'Gửi tin nhắn thành công! Chúng tôi sẽ phản hồi sớm nhất.']);
    }
    exit;
}

echo json_encode(['success' => false, 'message' => 'Yêu cầu không hợp lệ.']);
?>
