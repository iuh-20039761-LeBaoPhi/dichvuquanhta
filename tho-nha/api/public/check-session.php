<?php
/**
 * check-session.php
 * ──────────────────────────────────────────────────────────
 * Kiểm tra trạng thái đăng nhập hiện tại từ PHP session.
 *
 * Được gọi bởi: ThoNhaApp.checkSession() -> app-helper.js
 * Method:        GET
 * Response:      { logged_in: bool, role?: string, name?: string, ... }
 * ──────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../../config/session-config.php';

$auth = getAuthSession();

if ($auth) {
    echo json_encode([
        'logged_in' => true,
        'id'        => $auth['id'] ?? null,
        'role'      => $auth['role'] ?? 'customer',
        'name'      => $auth['name'] ?? 'User',
        'phone'     => $auth['phone'] ?? '',
        'extra'     => $auth['extra'] ?? [],
    ], JSON_UNESCAPED_UNICODE);
} else {
    echo json_encode([
        'logged_in' => false,
    ]);
}
