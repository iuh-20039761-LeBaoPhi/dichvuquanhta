<?php
session_start();

// 1. Xóa tất cả các biến session
$_SESSION = [];

// 2. Xóa session cookie
if (ini_get('session.use_cookies')) {
	$params = session_get_cookie_params();
	setcookie(
		session_name(),
		'',
		time() - 42000,
		$params['path'],
		$params['domain'],
		$params['secure'],
		$params['httponly']
	);
}

// 3. Xóa các cookie của hệ thống (User và Admin)
// Thêm các cookie cụ thể nếu biết tên, hoặc xóa toàn bộ trong vòng lặp bên dưới
$target_cookies = ['dvqt_u', 'dvqt_p', 'admin_e', 'admin_p'];
foreach ($target_cookies as $cname) {
	setcookie($cname, '', time() - 3600, '/');
}

// 4. Xóa tất cả các cookie khác hiện có trong trình duyệt cho domain này
if (isset($_COOKIE)) {
	foreach ($_COOKIE as $key => $value) {
		setcookie($key, '', time() - 3600, '/');
		setcookie($key, '', time() - 3600); // Thử xóa cả không có path
	}
}

// 5. Hủy session trên server
session_destroy();

// 6. Chuyển hướng về trang chủ
header('Location: index.html');
exit;
?>
