<?php
session_start();
require_once __DIR__ . '/../includes/admin_api_common.php';

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();
giaohang_admin_clear_shared_admin_cookies();
header('Location: ' . giaohang_admin_shared_login_url());
exit;
