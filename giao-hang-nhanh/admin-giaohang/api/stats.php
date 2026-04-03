<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header('Content-Type: application/json; charset=UTF-8');

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Bạn không có quyền truy cập endpoint này.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

http_response_code(410);
echo json_encode([
    'success' => false,
    'source' => 'krud-client',
    'message' => 'Dashboard admin đã chuyển sang đọc dữ liệu trực tiếp từ KRUD ở frontend. stats.php không còn dùng nữa.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
