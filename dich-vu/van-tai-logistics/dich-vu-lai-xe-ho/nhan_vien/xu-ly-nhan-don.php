<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Phương thức không hợp lệ']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$donhang_id = (int)($input['donhang_id'] ?? 0);

if ($donhang_id <= 0) {
    echo json_encode(['success' => false, 'message' => 'ID đơn hàng không hợp lệ']);
    exit;
}

$user = $_SESSION['user'] ?? null;
if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

// Gọi API cập nhật
$url = 'https://api.dvqt.vn/krud/';
$payload = json_encode([
    'action' => 'update',
    'table' => 'datlich_taixe',
    'id' => $donhang_id,
    'data' => [
        'id_taixe' => $user['id'] ?? 0,
        'ten_taixe' => $user['hovaten'] ?? '',
        'sdt_taixe' => $user['sodienthoai'] ?? '',
        'email_taixe' => $user['email'] ?? '',
        'trangthai' => 'Đã nhận',
        'ngaynhan' => date('Y-m-d H:i:s')
    ]
]);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
]);

$raw = curl_exec($ch);
curl_close($ch);

$result = json_decode($raw, true);

if (isset($result['error']) && $result['error']) {
    echo json_encode(['success' => false, 'message' => $result['error']]);
} else {
    echo json_encode(['success' => true, 'message' => 'Nhận đơn thành công']);
}
exit;