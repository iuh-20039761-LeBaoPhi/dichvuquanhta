<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

header('Content-Type: application/json; charset=utf-8');

$targetPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'dich-vu-chuyen-don-page.json';

function moving_service_content_response(bool $success, array $payload = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => $success] + $payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function moving_service_content_normalize_text($value): string
{
    return trim(preg_replace('/\s+/u', ' ', (string) ($value ?? '')) ?? '');
}

function moving_service_content_normalize_items($value): array
{
    if (is_array($value)) {
        $items = $value;
    } else {
        $decoded = json_decode((string) $value, true);
        $items = is_array($decoded) ? $decoded : preg_split('/\r\n|\r|\n/', (string) $value);
    }

    $normalized = [];
    foreach ($items as $item) {
        $text = moving_service_content_normalize_text($item);
        if ($text !== '') {
            $normalized[] = $text;
        }
    }

    return array_values(array_unique($normalized));
}

function moving_service_content_write_json(string $path, array $payload): void
{
    $encoded = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        throw new RuntimeException('Không mã hóa được JSON nội dung dịch vụ.');
    }

    $handle = @fopen($path, 'cb+');
    if (!$handle) {
        throw new RuntimeException('Không mở được file JSON public để ghi.');
    }

    $written = false;
    if (flock($handle, LOCK_EX)) {
        ftruncate($handle, 0);
        rewind($handle);
        $bytes = fwrite($handle, $encoded . PHP_EOL);
        fflush($handle);
        flock($handle, LOCK_UN);
        $written = $bytes !== false;
    }
    fclose($handle);

    if (!$written) {
        throw new RuntimeException('Không cập nhật được file JSON public.');
    }
}

try {
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        moving_service_content_response(false, ['message' => 'Method không hợp lệ.'], 405);
    }

    $body = json_decode(file_get_contents('php://input') ?: '{}', true);
    if (!is_array($body)) {
        throw new InvalidArgumentException('Payload không hợp lệ.');
    }

    $hero = is_array($body['hero'] ?? null) ? $body['hero'] : [];
    $section = is_array($body['services_section'] ?? null) ? $body['services_section'] : [];
    $services = is_array($body['services'] ?? null) ? $body['services'] : [];

    $normalizedServices = [];
    foreach ($services as $service) {
        if (!is_array($service)) {
            continue;
        }

        $serviceKey = moving_service_content_normalize_text($service['service_key'] ?? $service['id'] ?? '');
        if ($serviceKey === '') {
            continue;
        }

        $normalizedServices[] = [
            'id' => $serviceKey,
            'service_key' => $serviceKey,
            'is_visible' => (string) ($service['is_visible'] ?? '1') === '0' ? '0' : '1',
            'label' => moving_service_content_normalize_text($service['label'] ?? ''),
            'title' => moving_service_content_normalize_text($service['title'] ?? ''),
            'summary' => moving_service_content_normalize_text($service['summary'] ?? ''),
            'image' => moving_service_content_normalize_text($service['image'] ?? ''),
            'image_alt' => moving_service_content_normalize_text($service['image_alt'] ?? ''),
            'service_items' => moving_service_content_normalize_items($service['service_items'] ?? $service['service_items_json'] ?? []),
            'cta' => [
                'booking_label' => moving_service_content_normalize_text($service['booking_label'] ?? ''),
                'booking_url' => moving_service_content_normalize_text($service['booking_url'] ?? ''),
                'pricing_label' => moving_service_content_normalize_text($service['pricing_label'] ?? ''),
                'pricing_url' => moving_service_content_normalize_text($service['pricing_url'] ?? ''),
            ],
            'sort_order' => (int) ($service['sort_order'] ?? 0),
        ];
    }

    usort($normalizedServices, static function (array $left, array $right): int {
        return ((int) ($left['sort_order'] ?? 0)) <=> ((int) ($right['sort_order'] ?? 0));
    });

    $payload = [
        'hero' => [
            'eyebrow' => moving_service_content_normalize_text($hero['eyebrow'] ?? ''),
            'title' => moving_service_content_normalize_text($hero['title'] ?? ''),
            'description' => moving_service_content_normalize_text($hero['description'] ?? ''),
            'primary_cta_label' => moving_service_content_normalize_text($hero['primary_cta_label'] ?? ''),
            'primary_cta_url' => moving_service_content_normalize_text($hero['primary_cta_url'] ?? ''),
            'secondary_cta_label' => moving_service_content_normalize_text($hero['secondary_cta_label'] ?? ''),
            'secondary_cta_url' => moving_service_content_normalize_text($hero['secondary_cta_url'] ?? ''),
        ],
        'services_section' => [
            'eyebrow' => moving_service_content_normalize_text($section['eyebrow'] ?? $section['section_eyebrow'] ?? ''),
            'title' => moving_service_content_normalize_text($section['title'] ?? $section['section_title'] ?? ''),
            'description' => moving_service_content_normalize_text($section['description'] ?? $section['section_description'] ?? ''),
        ],
        'services' => $normalizedServices,
        'updated_at' => date('c'),
    ];

    moving_service_content_write_json($targetPath, $payload);

    moving_service_content_response(true, [
        'message' => 'Đã export JSON public cho trang dịch vụ chuyển dọn.',
        'updated_at' => $payload['updated_at'],
        'path' => $targetPath,
    ]);
} catch (Throwable $error) {
    moving_service_content_response(false, ['message' => $error->getMessage()], 500);
}
