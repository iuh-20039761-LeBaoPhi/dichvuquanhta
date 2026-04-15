<?php
/**
 * Đăng xuất khỏi hệ thống
 * Xóa toàn bộ session và cookie, chuyển hướng về trang chủ
 */

// Bắt đầu session
session_start();

// Xóa toàn bộ biến session
$_SESSION = [];

// Xóa cookie session nếu có
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000, // Đặt thời gian quá khứ để xóa cookie
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

// Hủy session
session_destroy();

// Chuyển hướng về trang chủ
header('Location: index.html');
exit;
?>