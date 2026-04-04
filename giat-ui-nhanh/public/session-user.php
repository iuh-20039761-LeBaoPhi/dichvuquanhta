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

$sessionUser = $user;

$sessionUser['id'] = isset($sessionUser['id'])
    ? (string) $sessionUser['id']
    : (isset($sessionUser['makhachhang']) ? (string) $sessionUser['makhachhang'] : (isset($sessionUser['user_id']) ? (string) $sessionUser['user_id'] : (isset($sessionUser['provider_id']) ? (string) $sessionUser['provider_id'] : (isset($sessionUser['idnhacungcap']) ? (string) $sessionUser['idnhacungcap'] : ''))));

$sessionUser['user_name'] = isset($sessionUser['user_name'])
    ? trim((string) $sessionUser['user_name'])
    : (isset($sessionUser['hovaten']) ? trim((string) $sessionUser['hovaten']) : (isset($sessionUser['ten']) ? trim((string) $sessionUser['ten']) : ''));

$sessionUser['user_tel'] = isset($sessionUser['user_tel'])
    ? trim((string) $sessionUser['user_tel'])
    : (isset($sessionUser['sodienthoai']) ? trim((string) $sessionUser['sodienthoai']) : (isset($sessionUser['phone']) ? trim((string) $sessionUser['phone']) : ''));

$sessionUser['user_email'] = isset($sessionUser['user_email'])
    ? trim((string) $sessionUser['user_email'])
    : (isset($sessionUser['email']) ? trim((string) $sessionUser['email']) : '');

$sessionUser['account_type'] = isset($sessionUser['account_type'])
    ? trim((string) $sessionUser['account_type'])
    : '';

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
