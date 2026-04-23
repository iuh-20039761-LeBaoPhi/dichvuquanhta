<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../admin-chuyendon/config/local_store.php';

$settings = moving_admin_store_read('admin-settings.json', []);
$maxUploadMb = (int) ($settings['max_upload_mb'] ?? 25);
if ($maxUploadMb <= 0) {
    $maxUploadMb = 25;
}

echo json_encode([
    'success' => true,
    'data' => [
        'settings' => [
            'max_upload_mb' => $maxUploadMb,
        ],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
