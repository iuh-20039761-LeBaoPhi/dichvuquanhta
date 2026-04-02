<?php
/**
 * Admin Login — Tạo PHP session cho Quản trị viên
 * ──────────────────────────────────────────────────────────
 * Được gọi bởi: pages/admin/dang-nhap.html
 * (Sau khi giao diện đã xác thực thông qua KRUD API)
 *
 * Method:  POST
 * Body:    { "name": "...", "email": "..." }
 * Response: { "success": true }
 * ──────────────────────────────────────────────────────────
 */

require_once __DIR__ . '/../../../config/session-config.php';

// ── Chỉ chấp nhận POST ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method Not Allowed');
}

// ── Đọc dữ liệu JSON ────────────────────────────────────────
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    jsonResponse(false, 'Thiếu thông tin đăng nhập');
}

$name  = trim($input['name']  ?? 'Admin');
$email = trim($input['email'] ?? 'admin@thonha.com');

// ── Tạo session an toàn ─────────────────────────────────────
setAuthSession('admin', 'admin', $name, $email);

jsonResponse(true, 'Đăng nhập Admin thành công');
