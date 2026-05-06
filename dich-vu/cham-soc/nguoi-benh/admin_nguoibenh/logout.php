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

// Redirect về đúng trang đăng nhập admin.
// - Trên hosting (dichvuquanhta.vn): luôn dùng đường dẫn root để tránh lặp "/dichvuquanhta" trong URL.
// - Trên local XAMPP: giữ hỗ trợ chạy trong thư mục con "/dichvuquanhta".
$host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
$isProdHost = (bool) preg_match('/(^|\\.)dichvuquanhta\\.vn$/', $host);

$basePath = '';
if (!$isProdHost) {
	$scriptName = str_replace('\\\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
	if (stripos($scriptName, '/dichvuquanhta/') === 0) {
		$basePath = '/dichvuquanhta';
	}
}

header('Location: ' . $basePath . '/public/admin-login.html');
exit;

