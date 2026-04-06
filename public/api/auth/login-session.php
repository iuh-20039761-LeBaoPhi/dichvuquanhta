<?php
/**
 * public/api/auth/login-session.php
 * Endpoint khởi tạo session tập trung cho DVQT (ADMIN, PROVIDER, CUSTOMER).
 */

require_once __DIR__ . '/../config/session-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method Not Allowed');
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    jsonResponse(false, 'Invalid JSON input');
}

$role    = trim($input['role'] ?? 'customer');
$id      = $input['id'] ?? null;
$name    = trim($input['name'] ?? 'Guest');
$phone   = trim($input['phone'] ?? $input['email'] ?? '');
$extra   = $input['extra'] ?? [];

// Nếu là Provider hoặc Customer và chưa gán extra cụ thể
if (empty($extra)) {
    if ($role === 'provider') {
        $extra = [
            'address' => trim($input['address'] ?? ''),
            'company' => trim($input['company'] ?? '')
        ];
    } elseif ($role === 'customer') {
        $extra = [
            'address' => trim($input['address'] ?? '')
        ];
    }
}

setAuthSession($id, $role, $name, $phone, $extra);

jsonResponse(true, 'Đăng nhập thành công');
