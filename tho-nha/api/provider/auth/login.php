<?php
/**
 * Provider Login — Tạo PHP session cho Nhà cung cấp/Thợ
 * ──────────────────────────────────────────────────────────
 * Được gọi bởi: pages/provider/dang-nhap.html
 * (Sau khi giao diện đã xác thực thông qua KRUD API)
 *
 * Method:  POST
 * Body:    { "name": "...", "phone": "...", "company": "..." }
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

if (!$input || empty($input['phone'])) {
    jsonResponse(false, 'Thiếu thông tin đăng nhập (phone)');
}

$name    = trim($input['name'] ?? 'Nhà cung cấp');
$phone   = trim($input['phone'] ?? '');
$company = trim($input['company'] ?? '');
$id      = $input['id'] ?? null;

// ── Tạo session an toàn ─────────────────────────────────────
setAuthSession($id, 'provider', $name, $phone, [
    'company' => $company,
    'danh_muc_thuc_hien' => $input['danh_muc_thuc_hien'] ?? '',
    'address' => $input['address'] ?? '',
    'avatartenfile' => $input['avatartenfile'] ?? '',
    'cccdmattruoctenfile' => $input['cccdmattruoctenfile'] ?? '',
    'cccdmatsautenfile' => $input['cccdmatsautenfile'] ?? '',
]);

jsonResponse(true, 'Đăng nhập thành công');
