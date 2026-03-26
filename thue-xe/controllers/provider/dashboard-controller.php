<?php
require_once dirname(__DIR__) . '/session.php';

function app_root_path(): string {
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '');
    if ($scriptName !== '') {
        $root = str_replace('\\', '/', dirname($scriptName, 3));
        if ($root !== '' && $root !== '.') {
            return rtrim($root, '/') . '/';
        }
    }
    return '/';
}

$appRoot = app_root_path();

$isLoggedIn = isset($_SESSION['user_id'], $_SESSION['user_role']);
$role = $_SESSION['user_role'] ?? '';

if (!$isLoggedIn) {
    header('Location: ' . $appRoot . 'views/pages/provider/dang-nhap.html?redirect=' . rawurlencode('controllers/provider/dashboard-controller.php'), true, 302);
    exit;
}

if ($role !== 'provider') {
    if ($role === 'customer') {
        header('Location: ' . $appRoot . 'controllers/customer/dashboard-controller.php', true, 302);
        exit;
    }

    if ($role === 'admin' || isset($_SESSION['admin_id'])) {
        header('Location: ' . $appRoot . 'admin/index.php', true, 302);
        exit;
    }

    http_response_code(403);
    echo '403 - Ban khong co quyen truy cap trang nay';
    exit;
}

require dirname(__DIR__, 2) . '/views/pages/provider/bang-dieu-khien.html';
