<?php
/**
 * Customer Login — Tạo PHP session cho khách hàng
 * ──────────────────────────────────────────────────────────
 * Được gọi bởi: ThoNhaApp.login('customer', ...) -> app-helper.js
 * (Sau khi giao diện đã xác thực thông qua KRUD API)
 *
 * Method:  POST
 * Body:    { "name": "...", "phone": "...", "address": "..." }
 * Response: { "success": true } hoặc { "success": false, "message": "..." }
 *
 * Luồng:
 *   1. Frontend xác thực danh tính qua KRUD API (từ bảng 'khachhang')
 *   2. Sau khi OK, gọi POST endpoint này để PHP tạo session
 *   3. PHP lưu role = "customer" vào session an toàn
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

if (!$input || empty($input['phone'])) {
    jsonResponse(false, 'Thiếu thông tin đăng nhập (phone)');
}

$name    = trim($input['name'] ?? 'Khách hàng');
$phone   = trim($input['phone'] ?? '');
$address = trim($input['address'] ?? '');
$id      = $input['id'] ?? null;

// ── Tạo session an toàn ─────────────────────────────────────
setAuthSession($id, 'customer', $name, $phone, [
    'address' => $address,
]);

jsonResponse(true, 'Đăng nhập thành công');
