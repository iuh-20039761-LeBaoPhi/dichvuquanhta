<?php
/**
 * Logout script for Giat Ui Nhanh
 * Clears both PHP sessions and authentication cookies (dvqt_u, dvqt_p)
 */

// 1. Clear PHP Session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
$_SESSION = [];
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}
session_destroy();

// 2. Clear Auth Cookies
$cookieOptions = [
    'expires' => time() - 3600,
    'path' => '/',
    'domain' => '', // Default to current domain
    'secure' => false,
    'httponly' => false, // Set to false so JS can also see it's gone if needed
    'samesite' => 'Lax'
];

setcookie('dvqt_u', '', $cookieOptions);
setcookie('dvqt_p', '', $cookieOptions);

// Also fallback for older PHP versions
setcookie('dvqt_u', '', time() - 3600, '/');
setcookie('dvqt_p', '', time() - 3600, '/');

// 3. Handle Response
$isAjax = (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') || 
          (isset($_GET['action']) && $_GET['action'] === 'api');

if ($isAjax) {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        "success" => true,
        "message" => "Đăng xuất thành công"
    ]);
} else {
    // Redirect to login page
    $redirect = isset($_GET['redirect']) ? $_GET['redirect'] : '../index.html';
    header("Location: " . $redirect);
}
exit;