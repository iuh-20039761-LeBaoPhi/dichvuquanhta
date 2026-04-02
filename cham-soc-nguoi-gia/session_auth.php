<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');

const SESSION_IDLE_TIMEOUT = 1800; // 30 phut khong hoat dong se het phien.

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
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function normalize_user(array $rawUser, string $accountType, string $sourceTable): array
{
    $name = trim((string)($rawUser['ten'] ?? $rawUser['hovaten'] ?? $rawUser['ho_ten'] ?? $rawUser['name'] ?? ''));
    $phone = trim((string)($rawUser['sodienthoai'] ?? $rawUser['so_dien_thoai'] ?? $rawUser['phone'] ?? ''));
    $role = trim((string)($rawUser['vai_tro'] ?? $rawUser['role'] ?? ''));
    $accountStatus = trim((string)($rawUser['trangthai'] ?? $rawUser['trang_thai'] ?? $rawUser['status'] ?? ''));

    if ($role === '') {
        $role = $accountType === 'nhan_vien' ? 'nhan_vien' : 'khach_hang';
    }

    if ($accountType === 'nhan_vien' && $accountStatus === '') {
        $accountStatus = 'active';
    }

    return array_merge($rawUser, [
        'id' => $rawUser['id'] ?? $rawUser['ID'] ?? $rawUser['ma'] ?? null,
        'ten' => $name,
        'sodienthoai' => $phone,
        'email' => (string)($rawUser['email'] ?? ''),
        'dia_chi' => (string)($rawUser['dia_chi'] ?? $rawUser['address'] ?? ''),
        'anh_dai_dien' => (string)($rawUser['anh_dai_dien'] ?? $rawUser['avatar'] ?? ''),
        'vai_tro' => $role,
        'loai_tai_khoan' => $accountType,
        'bang_nguon' => $sourceTable,
        'trangthai' => $accountStatus,
    ]);
}

function get_action(array $payload): string
{
    $action = trim((string)($_GET['action'] ?? $payload['action'] ?? 'current'));
    return $action !== '' ? strtolower($action) : 'current';
}

function enforce_idle_timeout(): void
{
    if (!isset($_SESSION['last_activity'])) {
        return;
    }

    $lastActivity = (int)$_SESSION['last_activity'];
    if ($lastActivity > 0 && (time() - $lastActivity) > SESSION_IDLE_TIMEOUT) {
        clear_session_data();
        json_response(401, [
            'success' => false,
            'message' => 'Phiên đăng nhập đã hết hạn do không hoạt động'
        ]);
    }
}

function is_session_valid(): bool
{
    return !empty($_SESSION['logged_in']) && isset($_SESSION['user']) && is_array($_SESSION['user']);
}

$payload = read_payload();
$action = get_action($payload);

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(405, [
            'success' => false,
            'message' => 'Method not allowed'
        ]);
    }

    $accountType = trim((string)($payload['loai_tai_khoan'] ?? 'khach_hang'));
    if ($accountType !== 'nhan_vien') {
        $accountType = 'khach_hang';
    }

    $sourceTable = trim((string)($payload['bang_nguon'] ?? ($accountType === 'nhan_vien' ? 'nhacungcap_nguoigia' : 'khachhang')));
    $rawUser = $payload['user'] ?? [];

    if (!is_array($rawUser) || $rawUser === []) {
        json_response(422, [
            'success' => false,
            'message' => 'Thiếu dữ liệu tài khoản để lưu session'
        ]);
    }

    $user = normalize_user($rawUser, $accountType, $sourceTable);

    if (trim((string)$user['ten']) === '' || trim((string)$user['sodienthoai']) === '') {
        json_response(422, [
            'success' => false,
            'message' => 'Thông tin tài khoản không hợp lệ'
        ]);
    }

    session_regenerate_id(true);

    $_SESSION['logged_in'] = true;
    $_SESSION['user'] = $user;
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['ten'];
    $_SESSION['user_phone'] = $user['sodienthoai'];
    $_SESSION['user_role'] = $user['vai_tro'];
    $_SESSION['user_status'] = (string)($user['trangthai'] ?? '');
    $_SESSION['last_activity'] = time();

    json_response(200, [
        'success' => true,
        'message' => 'Lưu session thành công',
        'user' => $user
    ]);
}

if ($action === 'logout' || $action === 'close' || $action === 'clear') {
    clear_session_data();
    json_response(200, [
        'success' => true,
        'message' => 'Đã xóa session'
    ]);
}

enforce_idle_timeout();

if (!is_session_valid()) {
    json_response(401, [
        'success' => false,
        'message' => 'Unauthorized'
    ]);
}

$_SESSION['last_activity'] = time();
$user = $_SESSION['user'];

json_response(200, [
    'success' => true,
    'user' => $user,
    'idle_timeout' => SESSION_IDLE_TIMEOUT
]);
