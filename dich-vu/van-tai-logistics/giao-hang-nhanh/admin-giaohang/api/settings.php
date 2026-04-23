<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

$defaults = [
    'bank_id' => 'MB',
    'bank_name' => 'Ngân hàng Quân Đội',
    'bank_account_no' => '0333666999',
    'bank_account_name' => 'GIAO HANG NHANH',
    'qr_template' => 'compact',
    'company_name' => 'Giao Hàng Nhanh',
    'company_hotline' => '1900 1234',
    'company_email' => 'support@giaohangnhanh.local',
    'company_address' => '123 Nguyễn Huệ, TP. HCM',
    'google_sheets_webhook_url' => '',
    'max_upload_mb' => 25,
];

function fetch_settings_map() {
    global $defaults;
    return array_merge($defaults, admin_local_store_read('admin-settings.json', []));
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    admin_api_json([
        'success' => true,
        'data' => [
            'settings' => fetch_settings_map(),
        ],
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    admin_api_json(['success' => false, 'message' => 'Method không được hỗ trợ.'], 405);
}

$payload = admin_api_read_input();
$settingsData = $payload['settings'] ?? null;
if (!is_array($settingsData) || empty($settingsData)) {
    admin_api_json(['success' => false, 'message' => 'Không có dữ liệu cài đặt hợp lệ.'], 400);
}

$settings = fetch_settings_map();
foreach ($defaults as $key => $defaultValue) {
    if ($key === 'max_upload_mb') {
        $settings[$key] = max(1, (int) ($settingsData[$key] ?? $settings[$key] ?? $defaultValue));
        continue;
    }

    $settings[$key] = trim((string) ($settingsData[$key] ?? $settings[$key] ?? $defaultValue));
}

if (!admin_local_store_write('admin-settings.json', $settings)) {
    admin_api_json(['success' => false, 'message' => 'Không thể lưu cài đặt cục bộ.'], 500);
}

admin_api_json([
    'success' => true,
    'message' => 'Cập nhật cài đặt thành công.',
    'data' => [
        'settings' => $settings,
    ],
]);
