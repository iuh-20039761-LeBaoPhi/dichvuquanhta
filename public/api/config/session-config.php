<?php
/**
 * public/api/config/session-config.php
 * Cấu hình session dùng chung cho toàn bộ DVQT.
 */

if (session_status() === PHP_SESSION_NONE) {
    session_name('THONHA_SESSID');
    session_set_cookie_params([
        'lifetime' => 86400 * 7,
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

function jsonResponse(bool $success, string $message = '', array $data = []): void {
    header('Content-Type: application/json; charset=utf-8');
    $response = ['success' => $success, 'message' => $message];
    if (!empty($data)) $response = array_merge($response, $data);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

function setAuthSession($id, string $role, string $name, string $phone, array $extra = []): void {
    $_SESSION['auth'] = [
        'logged_in' => true,
        'id'        => $id,
        'role'      => $role,
        'name'      => $name,
        'phone'     => $phone,
        'extra'     => $extra,
        'login_at'  => date('Y-m-d H:i:s'),
    ];
}
