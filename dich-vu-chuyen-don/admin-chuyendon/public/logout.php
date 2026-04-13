<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_boot_session();

$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();

moving_admin_redirect('login.php');
