<?php
/**
 * check-session.php (Thuê Xe)
 * Trả về trạng thái đăng nhập cho script initAuthNav()
 */

// Đảm bảo cùng tên session với hệ thống chung (DVQT / Thợ Nhà)
session_name('THONHA_SESSID');
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=utf-8');

if (!empty($_SESSION['auth']) && $_SESSION['auth']['logged_in'] === true) {
    echo json_encode([
        'logged_in' => true,
        'id'        => $_SESSION['auth']['id'] ?? null,
        'role'      => $_SESSION['auth']['role'] ?? 'customer',
        'name'      => $_SESSION['auth']['name'] ?? 'User',
        'phone'     => $_SESSION['auth']['phone'] ?? '',
        'meta'      => $_SESSION['auth']['extra'] ?? [],
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode(['logged_in' => false]);
}
