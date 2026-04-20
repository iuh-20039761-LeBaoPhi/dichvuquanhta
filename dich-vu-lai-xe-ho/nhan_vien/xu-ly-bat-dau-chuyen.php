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

// Gọi API cập nhật
$url = 'https://api.dvqt.vn/krud/';
$payload = json_encode([
    'action' => 'update',
    'table' => 'datlich_taixe',
    'id' => $donhang_id,
    'data' => [
        'thoigian_batdau_thucte' => date('Y-m-d H:i:s'),
        'trangthai' => 'Đang thực hiện'
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
    echo json_encode(['success' => true, 'message' => 'Bắt đầu chuyến đi thành công']);
}
exit;