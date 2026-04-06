<?php
/**
 * public/api/customer/auth/login.php
 * Endpoint tạo session PHP sau khi frontend đã xác thực khách hàng.
 */

require_once __DIR__ . '/../../config/session-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method Not Allowed');
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['phone'])) {
    jsonResponse(false, 'Thiếu thông tin (phone)');
}

$name    = trim($input['name'] ?? 'Khách hàng');
$phone   = trim($input['phone'] ?? '');
$address = trim($input['address'] ?? '');
$id      = $input['id'] ?? null;

setAuthSession($id, 'customer', $name, $phone, [
    'address' => $address,
]);

jsonResponse(true, 'Đăng nhập thành công');
