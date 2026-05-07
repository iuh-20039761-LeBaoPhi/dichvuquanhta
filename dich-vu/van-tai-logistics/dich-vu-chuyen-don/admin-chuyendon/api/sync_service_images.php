<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

header('Content-Type: application/json; charset=utf-8');

http_response_code(409);
echo json_encode([
    'success' => false,
    'message' => 'Endpoint này đã bị khóa. KRUD là nguồn dữ liệu chuẩn; hãy cập nhật ảnh trong admin để lưu vào KRUD rồi export lại JSON public.',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
