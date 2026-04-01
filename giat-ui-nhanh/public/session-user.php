<?php
declare(strict_types=1);

session_start();

header('Content-Type: application/json; charset=utf-8');

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

$action = isset($_GET['action']) ? (string) $_GET['action'] : '';

if (!in_array($action, ['get', 'set', 'logout'], true)) {
    respond(400, [
        'success' => false,
        'message' => 'Action không hợp lệ.',
    ]);
}

if ($action === 'get') {
    $user = isset($_SESSION['user']) && is_array($_SESSION['user']) ? $_SESSION['user'] : null;

    respond(200, [
        'success' => true,
        'hasUser' => $user !== null,
        'user' => $user,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'success' => false,
        'message' => 'Phương thức không được hỗ trợ.',
    ]);
}

if ($action === 'logout') {
    unset($_SESSION['user']);

    respond(200, [
        'success' => true,
        'message' => 'Đã đăng xuất.',
    ]);
}

$rawBody = file_get_contents('php://input');
$input = json_decode((string) $rawBody, true);

if (!is_array($input) || !isset($input['user']) || !is_array($input['user'])) {
    respond(400, [
        'success' => false,
        'message' => 'Dữ liệu người dùng không hợp lệ.',
    ]);
}

$user = $input['user'];

$sessionUser = [
    'id' => isset($user['id']) ? (string) $user['id'] : '',
    'user_name' => isset($user['user_name']) ? trim((string) $user['user_name']) : '',
    'user_tel' => isset($user['user_tel']) ? trim((string) $user['user_tel']) : '',
    'user_email' => isset($user['user_email']) ? trim((string) $user['user_email']) : '',
];

if ($sessionUser['user_tel'] === '') {
    respond(400, [
        'success' => false,
        'message' => 'Thiếu số điện thoại người dùng.',
    ]);
}

$_SESSION['user'] = $sessionUser;

respond(200, [
    'success' => true,
    'message' => 'Đã lưu phiên đăng nhập.',
    'user' => $sessionUser,
]);
