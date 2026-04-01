<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

if (empty($_SESSION['logged_in']) || empty($_SESSION['user']) || !is_array($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized'
    ]);
    exit;
}

$user = $_SESSION['user'];
$phone = trim((string)($user['sodienthoai'] ?? ($_SESSION['user_phone'] ?? '')));

if ($phone === '') {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Missing phone in session'
    ]);
    exit;
}

echo json_encode([
    'success' => true,
    'user' => [
        'id' => $user['id'] ?? ($_SESSION['user_id'] ?? null),
        'ten' => (string)($user['ten'] ?? ($_SESSION['user_name'] ?? '')),
        'sodienthoai' => $phone,
        'vai_tro' => (string)($user['vai_tro'] ?? ($_SESSION['user_role'] ?? 'khach_hang')),
        'anh_dai_dien' => (string)($user['anh_dai_dien'] ?? ''),
        'dia_chi' => (string)($user['dia_chi'] ?? '')
    ]
], JSON_UNESCAPED_UNICODE);
