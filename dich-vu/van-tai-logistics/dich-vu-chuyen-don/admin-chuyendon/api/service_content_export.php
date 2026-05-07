<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

header('Content-Type: application/json; charset=utf-8');

function moving_service_content_response(bool $success, array $payload = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => $success] + $payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

moving_service_content_response(false, [
    'message' => 'Endpoint này đã deprecated. Trang dịch vụ chuyển dọn không còn export ra file JSON public; hãy đọc dữ liệu qua ../../public/service_content.php.',
], 410);
