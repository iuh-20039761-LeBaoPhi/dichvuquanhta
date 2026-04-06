<?php
/**
 * public/api/auth/logout.php
 * Endpoint đăng xuất dùng chung cho tòan hệ thống DVQT.
 */

require_once __DIR__ . '/../config/session-config.php';

// Xóa dữ liệu session
$_SESSION = [];

// Xóa cookie session nếu có
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params['path'], $params['domain'],
        $params['secure'], $params['httponly']
    );
}

session_destroy();

jsonResponse(true, 'Đăng xuất thành công');
