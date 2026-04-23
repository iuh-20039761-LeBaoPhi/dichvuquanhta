<?php
require_once __DIR__ . '/../includes/bootstrap.php';

moving_admin_require_login();

header('Content-Type: application/json; charset=utf-8');

$defaults = [
    'max_upload_mb' => 25,
];

function moving_admin_settings_fetch_map() {
    global $defaults;
    return array_merge($defaults, moving_admin_store_read('admin-settings.json', []));
}

function moving_admin_settings_json($payload, $statusCode = 200) {
    http_response_code((int) $statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
    moving_admin_settings_json([
        'success' => true,
        'data' => [
            'settings' => moving_admin_settings_fetch_map(),
        ],
    ]);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    moving_admin_settings_json(['success' => false, 'message' => 'Method không được hỗ trợ.'], 405);
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput ?: '', true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$settingsData = $payload['settings'] ?? null;
if (!is_array($settingsData) || empty($settingsData)) {
    moving_admin_settings_json(['success' => false, 'message' => 'Không có dữ liệu cài đặt hợp lệ.'], 400);
}

$settings = moving_admin_settings_fetch_map();
$settings['max_upload_mb'] = max(1, (int) ($settingsData['max_upload_mb'] ?? $settings['max_upload_mb'] ?? $defaults['max_upload_mb']));

if (!moving_admin_store_write('admin-settings.json', $settings)) {
    moving_admin_settings_json(['success' => false, 'message' => 'Không thể lưu cài đặt cục bộ.'], 500);
}

moving_admin_settings_json([
    'success' => true,
    'message' => 'Cập nhật cài đặt thành công.',
    'data' => [
        'settings' => $settings,
    ],
]);
