<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method not allowed'
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '{}', true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid payload'
    ]);
    exit;
}

$name = trim((string)($payload['ten'] ?? ''));
$phone = trim((string)($payload['sodienthoai'] ?? ''));
$role = trim((string)($payload['vai_tro'] ?? 'khach_hang'));

if ($name === '' || $phone === '') {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Missing user data'
    ]);
    exit;
}

session_regenerate_id(true);

$user = [
    'id' => $payload['id'] ?? null,
    'ten' => $name,
    'sodienthoai' => $phone,
    'vai_tro' => $role !== '' ? $role : 'khach_hang',
    'anh_dai_dien' => (string)($payload['anh_dai_dien'] ?? ''),
    'dia_chi' => (string)($payload['dia_chi'] ?? '')
];

$_SESSION['logged_in'] = true;
$_SESSION['user'] = $user;
$_SESSION['user_id'] = $user['id'];
$_SESSION['user_name'] = $user['ten'];
$_SESSION['user_phone'] = $user['sodienthoai'];
$_SESSION['user_role'] = $user['vai_tro'];

echo json_encode([
    'success' => true,
    'message' => 'Session saved',
    'user' => $user
], JSON_UNESCAPED_UNICODE);
