<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    admin_api_json([
        'success' => false,
        'message' => 'Endpoint chỉ hỗ trợ phương thức POST.',
    ], 405);
}

$input = admin_api_read_input();

function ghn_export_clean_text($value): string
{
    return trim((string) ($value ?? ''));
}

function ghn_export_clean_visibility($value): string
{
    return (string) $value === '0' ? '0' : '1';
}

$heroInput = is_array($input['hero'] ?? null) ? $input['hero'] : [];
$sectionInput = is_array($input['services_section'] ?? null) ? $input['services_section'] : [];
$servicesInput = is_array($input['services'] ?? null) ? $input['services'] : [];

$payload = [
    'page_slug' => 'dich-vu-giao-hang',
    'hero' => [
        'badge_label' => ghn_export_clean_text($heroInput['badge_label'] ?? ''),
        'title' => ghn_export_clean_text($heroInput['title'] ?? ''),
        'description' => ghn_export_clean_text($heroInput['description'] ?? ''),
    ],
    'services_section' => [
        'title' => ghn_export_clean_text($sectionInput['title'] ?? ''),
        'description' => ghn_export_clean_text($sectionInput['description'] ?? ''),
    ],
    'services' => [],
];

$legacyServices = [];

foreach ($servicesInput as $service) {
    if (!is_array($service)) {
        continue;
    }

    $normalized = [
        'service_key' => ghn_export_clean_text($service['service_key'] ?? ''),
        'is_visible' => ghn_export_clean_visibility($service['is_visible'] ?? '1'),
        'ten' => ghn_export_clean_text($service['ten'] ?? ''),
        'bieutuong' => ghn_export_clean_text($service['bieutuong'] ?? ''),
        'khauhieu' => ghn_export_clean_text($service['khauhieu'] ?? ''),
        'phamvi' => ghn_export_clean_text($service['phamvi'] ?? ''),
        'uutien' => ghn_export_clean_text($service['uutien'] ?? ''),
        'phuhopcho' => ghn_export_clean_text($service['phuhopcho'] ?? ''),
        'mota' => ghn_export_clean_text($service['mota'] ?? ''),
    ];

    if ($normalized['ten'] === '') {
        continue;
    }

    if ($normalized['service_key'] === '') {
        $normalized['service_key'] = 'dich-vu-' . (count($payload['services']) + 1);
    }

    $payload['services'][] = $normalized;

    if ($normalized['is_visible'] === '1') {
        $legacyServices[] = [
            'ten' => $normalized['ten'],
            'bieutuong' => $normalized['bieutuong'],
            'khauhieu' => $normalized['khauhieu'],
            'phamvi' => $normalized['phamvi'],
            'uutien' => $normalized['uutien'],
            'phuhopcho' => $normalized['phuhopcho'],
            'mota' => $normalized['mota'],
        ];
    }
}

$dataDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'data';
if (!is_dir($dataDir) && !@mkdir($dataDir, 0777, true) && !is_dir($dataDir)) {
    admin_api_json([
        'success' => false,
        'message' => 'Không tạo được thư mục export public/data.',
    ], 500);
}

$pageJsonPath = $dataDir . DIRECTORY_SEPARATOR . 'dich-vu-giao-hang-page.json';
$legacyJsonPath = $dataDir . DIRECTORY_SEPARATOR . 'dsdichvugiaohang.json';

$pageJson = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$legacyJson = json_encode($legacyServices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if ($pageJson === false || $legacyJson === false) {
    admin_api_json([
        'success' => false,
        'message' => 'Không encode được dữ liệu JSON để export.',
    ], 500);
}

if (@file_put_contents($pageJsonPath, $pageJson . PHP_EOL, LOCK_EX) === false) {
    admin_api_json([
        'success' => false,
        'message' => 'Không ghi được file dich-vu-giao-hang-page.json.',
    ], 500);
}

if (@file_put_contents($legacyJsonPath, $legacyJson . PHP_EOL, LOCK_EX) === false) {
    admin_api_json([
        'success' => false,
        'message' => 'Đã ghi file mới nhưng không cập nhật được dsdichvugiaohang.json.',
    ], 500);
}

admin_api_json([
    'success' => true,
    'message' => 'Đã export nội dung dịch vụ giao hàng.',
    'page_json_url' => '../../public/data/dich-vu-giao-hang-page.json',
    'legacy_json_url' => '../../public/data/dsdichvugiaohang.json',
]);
