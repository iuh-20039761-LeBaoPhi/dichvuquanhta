<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/admin_api_common.php';
moving_admin_boot_session();

if (isset($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin') {
    moving_admin_redirect('admin_stats.php');
}

$email = trim((string) ($_COOKIE['admin_e'] ?? ''));
$password = (string) ($_COOKIE['admin_p'] ?? '');
$admin = moving_admin_find_shared_admin_account($email, $password);

if (is_array($admin)) {
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) ($admin['id'] ?? 0);
    $_SESSION['username'] = (string) ($admin['username'] ?? $admin['email'] ?? 'admin');
    $_SESSION['role'] = 'admin';
    $_SESSION['fullname'] = (string) ($admin['fullname'] ?? $admin['hovaten'] ?? $admin['ten'] ?? 'Admin');
    $_SESSION['email'] = (string) ($admin['email'] ?? $email);
    moving_admin_redirect('admin_stats.php');
}

$_SESSION = [];
moving_admin_clear_shared_admin_cookies();
moving_admin_redirect(moving_admin_shared_login_url());
