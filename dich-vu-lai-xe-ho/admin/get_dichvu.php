<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if (!function_exists('dichvu_normalize_includes')) {
    function dichvu_normalize_includes($raw): array
    {
        if (is_string($raw)) {
            $trimmed = trim($raw);
            if ($trimmed === '') {
                return [];
            }

            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                $raw = $decoded;
            } else {
                $raw = preg_split('/\r\n|\r|\n/', $trimmed) ?: [];
            }
        }

        if (!is_array($raw)) {
            return [];
        }

        $items = [];
        foreach ($raw as $item) {
            $value = trim((string)$item);
            if ($value !== '') {
                $items[] = $value;
            }
        }

        return $items;
    }
}

if (!function_exists('dichvu_normalize_pricing')) {
    function dichvu_normalize_pricing($raw): array
    {
        if (is_string($raw)) {
            $trimmed = trim($raw);
            if ($trimmed === '') {
                return [];
            }

            $decoded = json_decode($trimmed, true);
            $raw = is_array($decoded) ? $decoded : [];
        }

        if (!is_array($raw)) {
            return [];
        }

        $rows = [];
        foreach ($raw as $row) {
            if (!is_array($row)) {
                continue;
            }

            $label = trim((string)($row['label'] ?? ''));
            $type = trim((string)($row['type'] ?? ''));
            $valueRaw = $row['value'] ?? '';
            $hoursRaw = $row['hours'] ?? '';

            if ($label === '' && $type === '' && (string)$valueRaw === '' && (string)$hoursRaw === '') {
                continue;
            }

            $rows[] = [
                'label' => $label,
                'value' => is_numeric((string)$valueRaw) ? (float)$valueRaw : 0,
                'hours' => is_numeric((string)$hoursRaw) ? (float)$hoursRaw : 0,
                'type' => $type,
            ];
        }

        return $rows;
    }
}

if (!function_exists('dichvu_normalize_row')) {
    function dichvu_normalize_row(array $row): array
    {
        return [
            'id' => (int)($row['id'] ?? 0),
            'name' => trim((string)($row['name'] ?? '')),
            'image' => trim((string)($row['image'] ?? '')),
            'alt' => trim((string)($row['alt'] ?? '')),
            'description' => trim((string)($row['description'] ?? '')),
            'includes' => dichvu_normalize_includes($row['includes'] ?? []),
            'pricing' => dichvu_normalize_pricing($row['pricing'] ?? []),
        ];
    }
}

if (!function_exists('dichvu_includes_to_text')) {
    function dichvu_includes_to_text(array $items): string
    {
        return implode("\n", array_map(static fn($item): string => trim((string)$item), $items));
    }
}

if (!function_exists('get_dichvu_data')) {
    function get_dichvu_data(): array
    {
        // Đổi bảng từ dichvu_mevabe sang dichvu_taixe
        $result = admin_api_list_table('dichvu_taixe');
        $rows = $result['rows'] ?? [];

        $normalized = array_map(static fn(array $row): array => dichvu_normalize_row($row), $rows);
        usort($normalized, static fn(array $a, array $b): int => ($b['id'] <=> $a['id']));

        return [
            'rows' => $normalized,
            'error' => (string)($result['error'] ?? ''),
        ];
    }
}

if (!function_exists('get_dichvu_by_id')) {
    function get_dichvu_by_id(int $id): array
    {
        if ($id <= 0) {
            return ['row' => null, 'error' => 'Mã dịch vụ không hợp lệ.'];
        }

        $result = get_dichvu_data();
        if (($result['error'] ?? '') !== '') {
            return ['row' => null, 'error' => (string)$result['error']];
        }

        foreach (($result['rows'] ?? []) as $row) {
            if ((int)($row['id'] ?? 0) === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Không tìm thấy dịch vụ.'];
    }
}

if (!function_exists('dichvu_build_payload_from_post')) {
    function dichvu_build_payload_from_post(array $post): array
    {
        $name = trim((string)($post['name'] ?? ''));
        $image = trim((string)($post['image'] ?? ''));
        $alt = trim((string)($post['alt'] ?? ''));
        $description = trim((string)($post['description'] ?? ''));

        $includesText = str_replace("\r", '', (string)($post['includes_text'] ?? ''));
        $includes = array_values(array_filter(array_map('trim', explode("\n", $includesText)), static fn(string $item): bool => $item !== ''));

        if ($name === '') {
            return ['success' => false, 'message' => 'Tên dịch vụ không được để trống.'];
        }
        if ($description === '') {
            return ['success' => false, 'message' => 'Mô tả dịch vụ không được để trống.'];
        }
        if (!$includes) {
            return ['success' => false, 'message' => 'Cần ít nhất 1 mục trong danh sách công việc bao gồm.'];
        }

        $labels = is_array($post['pricing_label'] ?? null) ? $post['pricing_label'] : [];
        $values = is_array($post['pricing_value'] ?? null) ? $post['pricing_value'] : [];
        $hours = is_array($post['pricing_hours'] ?? null) ? $post['pricing_hours'] : [];
        $types = is_array($post['pricing_type'] ?? null) ? $post['pricing_type'] : [];

        $maxRows = max(count($labels), count($values), count($hours), count($types));
        $pricing = [];

        for ($i = 0; $i < $maxRows; $i++) {
            $label = trim((string)($labels[$i] ?? ''));
            $type = trim((string)($types[$i] ?? ''));
            $valueRaw = trim((string)($values[$i] ?? ''));
            $hoursRaw = trim((string)($hours[$i] ?? ''));

            if ($label === '' && $type === '' && $valueRaw === '' && $hoursRaw === '') {
                continue;
            }

            if ($label === '' || $type === '' || $valueRaw === '' || $hoursRaw === '') {
                return ['success' => false, 'message' => 'Thông tin bảng giá dòng ' . ($i + 1) . ' chưa đầy đủ.'];
            }

            if (!is_numeric($valueRaw) || (float)$valueRaw < 0) {
                return ['success' => false, 'message' => 'Giá trị dòng ' . ($i + 1) . ' không hợp lệ.'];
            }

            if (!is_numeric($hoursRaw) || (float)$hoursRaw <= 0) {
                return ['success' => false, 'message' => 'Số giờ dòng ' . ($i + 1) . ' không hợp lệ.'];
            }

            $pricing[] = [
                'label' => $label,
                'value' => (float)$valueRaw,
                'hours' => (float)$hoursRaw,
                'type' => $type,
            ];
        }

        if (!$pricing) {
            return ['success' => false, 'message' => 'Cần ít nhất 1 dòng bảng giá.'];
        }

        if ($alt === '') {
            $alt = 'Dịch vụ ' . $name;
        }

        $includesJson = json_encode($includes, JSON_UNESCAPED_UNICODE);
        $pricingJson = json_encode($pricing, JSON_UNESCAPED_UNICODE);
        if ($includesJson === false || $pricingJson === false) {
            return ['success' => false, 'message' => 'Không thể mã hóa dữ liệu includes/pricing.'];
        }

        return [
            'success' => true,
            'message' => '',
            'data' => [
                'name' => $name,
                'image' => $image,
                'alt' => $alt,
                'description' => $description,
                'includes' => $includesJson,
                'pricing' => $pricingJson,
            ],
        ];
    }
}