<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
	session_start();
}

// Xóa session admin
unset($_SESSION['admin_logged_in'], $_SESSION['admin_user']);

// Tạo session mới để tránh tấn công
session_regenerate_id(true);

// Chuyển hướng về trang đăng nhập
header('Location: login.php');
exit;
?>