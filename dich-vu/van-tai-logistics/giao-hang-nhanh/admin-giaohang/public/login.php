<?php
session_start();
require_once __DIR__ . '/../includes/admin_api_common.php';

if (isset($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin') {
    header('Location: admin_stats.php');
    exit;
}

$email = trim((string) ($_COOKIE['admin_e'] ?? ''));
$password = (string) ($_COOKIE['admin_p'] ?? '');
$admin = giaohang_admin_find_shared_admin_account($email, $password);

if (is_array($admin)) {
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) ($admin['id'] ?? 0);
    $_SESSION['username'] = (string) ($admin['username'] ?? $admin['email'] ?? 'admin');
    $_SESSION['role'] = 'admin';
    $_SESSION['fullname'] = (string) ($admin['fullname'] ?? $admin['hovaten'] ?? $admin['ten'] ?? 'Admin');
    $_SESSION['email'] = (string) ($admin['email'] ?? $email);
    $_SESSION['phone'] = (string) ($admin['phone'] ?? $admin['sodienthoai'] ?? '');
    header('Location: admin_stats.php');
    exit;
}

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();
giaohang_admin_clear_shared_admin_cookies();
header('Location: ' . giaohang_admin_shared_login_url());
exit;
