<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

const SESSION_IDLE_TIMEOUT = 1800; // 30 phút

function json_response(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function clear_session_data(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(
            session_name(),
            '',
            time() - 42000,
            $params['path'],
            $params['domain'],
            (bool)$params['secure'],
            (bool)$params['httponly']
        );
    }
    session_destroy();
}

function read_payload(): array
{
    $raw = file_get_contents('php://input');
    return ($raw !== false && trim($raw) !== '') ? (json_decode($raw, true) ?? []) : [];
}

function enforce_idle_timeout(): void
{
    if (!isset($_SESSION['last_activity'])) return;
    if ((time() - (int)$_SESSION['last_activity']) > SESSION_IDLE_TIMEOUT) {
        clear_session_data();
        json_response(401, ['success' => false, 'message' => 'Phiên đăng nhập đã hết hạn']);
    }
}

$payload = read_payload();
$action = strtolower(trim((string)($_GET['action'] ?? $payload['action'] ?? 'current')));

// Xử lý Logout
if (in_array($action, ['logout', 'close', 'clear'])) {
    clear_session_data();
    json_response(200, ['success' => true, 'message' => 'Đã đăng xuất']);
}

// Xử lý Login (Lưu session)
if ($action === 'login') {
    $rawUser = $payload['user'] ?? [];
    if (empty($rawUser)) {
        json_response(422, ['success' => false, 'message' => 'Thiếu dữ liệu tài khoản']);
    }

    session_regenerate_id(true);
    $_SESSION['logged_in'] = true;
    $_SESSION['user'] = $rawUser;
    $_SESSION['last_activity'] = time();

    json_response(200, ['success' => true, 'message' => 'Lưu session thành công', 'user' => $rawUser]);
}

// Mặc định: Trả về trạng thái session hiện tại
enforce_idle_timeout();

if (empty($_SESSION['logged_in']) || !isset($_SESSION['user'])) {
    json_response(401, ['success' => false, 'message' => 'Chưa đăng nhập']);
}

$_SESSION['last_activity'] = time();
json_response(200, [
    'success' => true,
    'user' => $_SESSION['user'],
    'idle_timeout' => SESSION_IDLE_TIMEOUT
]);

