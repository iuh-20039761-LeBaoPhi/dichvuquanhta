<?php
/**
 * public/api/provider/auth/login.php
 * Endpoint tạo session PHP sau khi frontend đã xác thực nhà cung cấp.
 */

require_once __DIR__ . '/../../config/session-config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Method Not Allowed');
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input || empty($input['phone'])) {
    jsonResponse(false, 'Thiếu thông tin (phone)');
}

$name    = trim($input['name'] ?? 'Nhà cung cấp');
$phone   = trim($input['phone'] ?? '');
$address = trim($input['address'] ?? '');
$company = trim($input['company'] ?? '');
$id      = $input['id'] ?? null;

setAuthSession($id, 'provider', $name, $phone, [
    'address' => $address,
    'company' => $company,
]);

jsonResponse(true, 'Đăng nhập thành công');
