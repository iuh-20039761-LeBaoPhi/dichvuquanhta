<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

function fetch_settings_map($conn) {
    $settings = [];
    $result = $conn->query("SELECT id, setting_key, setting_value FROM system_settings ORDER BY id ASC");
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $settings[$row['setting_key']] = [
                'id' => intval($row['id'] ?? 0),
                'key' => $row['setting_key'] ?? '',
                'value' => $row['setting_value'] ?? '',
            ];
        }
    }
    return $settings;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    admin_api_json([
        'success' => true,
        'data' => [
            'settings' => fetch_settings_map($conn),
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

foreach ($settingsData as $key => $value) {
    $settingKey = trim((string) $key);
    if ($settingKey === '') {
        continue;
    }
    $settingValue = is_scalar($value) ? trim((string) $value) : json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $checkStmt = $conn->prepare("SELECT id FROM system_settings WHERE setting_key = ? LIMIT 1");
    $checkStmt->bind_param('s', $settingKey);
    $checkStmt->execute();
    $existing = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();

    if ($existing) {
        $stmt = $conn->prepare("UPDATE system_settings SET setting_value = ? WHERE setting_key = ?");
        $stmt->bind_param('ss', $settingValue, $settingKey);
    } else {
        $stmt = $conn->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES (?, ?)");
        $stmt->bind_param('ss', $settingKey, $settingValue);
    }
    $stmt->execute();
    $stmt->close();
}

admin_api_json([
    'success' => true,
    'message' => 'Cập nhật cài đặt thành công.',
    'data' => [
        'settings' => fetch_settings_map($conn),
    ],
]);
