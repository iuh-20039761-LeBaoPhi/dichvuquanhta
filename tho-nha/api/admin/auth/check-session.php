<?php
/**
 * Admin Check Session — Kiểm tra PHP session dành cho trang quản trị
 * ─────────────────────────────────────────────────────────────────
 * Được gọi bởi: shell.js (admin) mỗi khi tải trang
 *
 * Method:  GET
 * Response: { "status": "logged_in", "role": "admin", "username": "...", "email": "..." }
 *           hoặc status "logged_out"
 * ─────────────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../../../config/session-config.php';

// Kiểm tra phiên đăng nhập với role = 'admin'
$auth = getAuthSession();

if (!$auth || $auth['role'] !== 'admin') {
    jsonResponse(true, 'User is NOT logged in or session expired', ['status' => 'logged_out']);
}

// Nếu đã đăng nhập, trả về info (dùng jsonResponse() từ session-config)
jsonResponse(true, 'Logged in', [
    'status'   => 'logged_in',
    'role'     => 'admin',
    'username' => $auth['name'] ?? 'Admin',
    'email'    => $auth['phone'] ?? ''
]);
