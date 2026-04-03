<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

require_once __DIR__ . '/../config/local_store.php';

header('Content-Type: application/json; charset=UTF-8');

function admin_api_json($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function admin_api_require_admin() {
    if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
        admin_api_json([
            'success' => false,
            'message' => 'Bạn không có quyền truy cập endpoint này.',
        ], 401);
    }
}

function admin_api_read_input() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    return !empty($_POST) ? $_POST : $_GET;
}

function admin_api_get_pagination($defaultLimit = 10, $maxLimit = 100) {
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = intval($_GET['limit'] ?? $defaultLimit);
    if ($limit <= 0) {
        $limit = $defaultLimit;
    }
    $limit = min($limit, $maxLimit);

    return [$page, $limit, ($page - 1) * $limit];
}

function admin_api_value_or_null($value) {
    if ($value === null) {
        return null;
    }
    return is_string($value) ? trim($value) : $value;
}
