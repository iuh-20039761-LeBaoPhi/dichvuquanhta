<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../admin-chuyendon/includes/admin_api_common.php';

$pageSlug = 'dich-vu-chuyen-don';
$contentTable = 'noi_dung_trang_chuyen_don';
$servicesTable = 'noi_dung_trang_chuyen_don_dich_vu';

function moving_public_service_content_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function moving_public_service_content_normalize_text($value): string
{
    return trim(preg_replace('/\s+/u', ' ', (string) ($value ?? '')) ?? '');
}

function moving_public_service_content_normalize_items($value): array
{
    if (is_array($value)) {
        $items = $value;
    } else {
        $decoded = json_decode((string) $value, true);
        $items = is_array($decoded) ? $decoded : preg_split('/\r\n|\r|\n/', (string) $value);
    }

    $normalized = [];
    foreach ($items as $item) {
        $text = moving_public_service_content_normalize_text($item);
        if ($text !== '') {
            $normalized[] = $text;
        }
    }

    return array_values(array_unique($normalized));
}

function moving_public_service_content_find_section_row(array $rows, string $sectionKey): array
{
    foreach ($rows as $row) {
        if (moving_public_service_content_normalize_text($row['section_key'] ?? '') === $sectionKey) {
            return is_array($row) ? $row : [];
        }
    }

    return [];
}

try {
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
        moving_public_service_content_response([
            'success' => false,
            'message' => 'Method không hợp lệ.',
        ], 405);
    }

    $sectionResult = moving_admin_api_list_table($contentTable);
    if ((string) ($sectionResult['error'] ?? '') !== '') {
        throw new RuntimeException('Không lấy được dữ liệu KRUD cho nội dung trang: ' . $sectionResult['error']);
    }

    $serviceResult = moving_admin_api_list_table($servicesTable);
    if ((string) ($serviceResult['error'] ?? '') !== '') {
        throw new RuntimeException('Không lấy được dữ liệu KRUD cho dịch vụ trang: ' . $serviceResult['error']);
    }

    $sectionRows = array_values(array_filter(
        $sectionResult['rows'] ?? [],
        static fn($row) => moving_public_service_content_normalize_text($row['page_slug'] ?? '') === $pageSlug
    ));
    $serviceRows = array_values(array_filter(
        $serviceResult['rows'] ?? [],
        static fn($row) => moving_public_service_content_normalize_text($row['page_slug'] ?? '') === $pageSlug
    ));

    $hero = moving_public_service_content_find_section_row($sectionRows, 'hero');
    $section = moving_public_service_content_find_section_row($sectionRows, 'services_section');

    $normalizedServices = [];
    foreach ($serviceRows as $service) {
        if (!is_array($service)) {
            continue;
        }

        $serviceKey = moving_public_service_content_normalize_text($service['service_key'] ?? $service['id'] ?? '');
        if ($serviceKey === '') {
            continue;
        }

        $normalizedServices[] = [
            'id' => $serviceKey,
            'service_key' => $serviceKey,
            'is_visible' => (string) ($service['is_visible'] ?? '1') === '0' ? '0' : '1',
            'label' => moving_public_service_content_normalize_text($service['label'] ?? ''),
            'title' => moving_public_service_content_normalize_text($service['title'] ?? ''),
            'summary' => moving_public_service_content_normalize_text($service['summary'] ?? ''),
            'image' => moving_public_service_content_normalize_text($service['image'] ?? ''),
            'image_alt' => moving_public_service_content_normalize_text($service['image_alt'] ?? ''),
            'service_items' => moving_public_service_content_normalize_items($service['service_items'] ?? $service['service_items_json'] ?? []),
            'cta' => [
                'booking_label' => moving_public_service_content_normalize_text($service['booking_label'] ?? ''),
                'booking_url' => moving_public_service_content_normalize_text($service['booking_url'] ?? ''),
                'pricing_label' => moving_public_service_content_normalize_text($service['pricing_label'] ?? ''),
                'pricing_url' => moving_public_service_content_normalize_text($service['pricing_url'] ?? ''),
            ],
            'sort_order' => (int) ($service['sort_order'] ?? 0),
        ];
    }

    usort($normalizedServices, static function (array $left, array $right): int {
        $byOrder = ((int) ($left['sort_order'] ?? 0)) <=> ((int) ($right['sort_order'] ?? 0));
        if ($byOrder !== 0) {
            return $byOrder;
        }

        return strcmp((string) ($left['service_key'] ?? ''), (string) ($right['service_key'] ?? ''));
    });

    moving_public_service_content_response([
        'success' => true,
        'data' => [
            'hero' => [
                'eyebrow' => moving_public_service_content_normalize_text($hero['eyebrow'] ?? ''),
                'title' => moving_public_service_content_normalize_text($hero['title'] ?? ''),
                'description' => moving_public_service_content_normalize_text($hero['description'] ?? ''),
                'primary_cta_label' => moving_public_service_content_normalize_text($hero['primary_cta_label'] ?? ''),
                'primary_cta_url' => moving_public_service_content_normalize_text($hero['primary_cta_url'] ?? ''),
                'secondary_cta_label' => moving_public_service_content_normalize_text($hero['secondary_cta_label'] ?? ''),
                'secondary_cta_url' => moving_public_service_content_normalize_text($hero['secondary_cta_url'] ?? ''),
            ],
            'services_section' => [
                'eyebrow' => moving_public_service_content_normalize_text($section['eyebrow'] ?? $section['section_eyebrow'] ?? ''),
                'title' => moving_public_service_content_normalize_text($section['title'] ?? $section['section_title'] ?? ''),
                'description' => moving_public_service_content_normalize_text($section['description'] ?? $section['section_description'] ?? ''),
            ],
            'services' => $normalizedServices,
            'updated_at' => date('c'),
        ],
    ]);
} catch (Throwable $error) {
    moving_public_service_content_response([
        'success' => false,
        'message' => $error->getMessage(),
        'data' => [
            'hero' => new stdClass(),
            'services_section' => new stdClass(),
            'services' => [],
        ],
    ], 500);
}
