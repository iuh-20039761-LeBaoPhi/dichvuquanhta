<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
	session_start();
}

unset($_SESSION['admin_logged_in'], $_SESSION['admin_user']);

// Xóa cookie đăng nhập admin
setcookie('admin_e', '', time() - 3600, '/');
setcookie('admin_p', '', time() - 3600, '/');

session_regenerate_id(true);

// Tự động tính toán đường dẫn gốc của project để redirect chính xác
$project_root = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'], 5)), '/');
header('Location: ' . $project_root . '/public/admin-login.html');
exit;

