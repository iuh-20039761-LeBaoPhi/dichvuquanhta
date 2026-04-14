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
            $value = trim((string) $item);
            if ($value !== '') {
                $items[] = $value;
            }
        }

        return $items;
    }
}

if (!function_exists('dichvu_normalize_time_slots')) {
    function dichvu_normalize_time_slots($raw): array
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

        $items = [];
        foreach ($raw as $item) {
            if (!is_array($item)) {
                continue;
            }
            $value = trim((string) ($item['value'] ?? ''));
            $label = trim((string) ($item['label'] ?? ''));
            if ($value !== '' || $label !== '') {
                $items[] = ['value' => $value, 'label' => $label];
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
            return is_array($decoded) ? $decoded : [];
        }
        return is_array($raw) ? $raw : [];
    }
}

if (!function_exists('dichvu_normalize_row')) {
    function dichvu_normalize_row(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'loai' => dichvu_normalize_includes($row['loai'] ?? []),
            'name' => trim((string) ($row['name'] ?? '')),
            'image' => trim((string) ($row['image'] ?? '')),
            'alt' => trim((string) ($row['alt'] ?? '')),
            'description' => trim((string) ($row['description'] ?? '')),
            'includes' => dichvu_normalize_includes($row['includes'] ?? []),
            'time_slots' => dichvu_normalize_time_slots($row['time_slots'] ?? []),
            'pricing' => dichvu_normalize_pricing($row['pricing'] ?? []),
        ];
    }
}

if (!function_exists('dichvu_includes_to_text')) {
    function dichvu_includes_to_text(array $items): string
    {
        return implode("\n", array_map(static fn($item): string => trim((string) $item), $items));
    }
}

if (!function_exists('get_dichvu_data')) {
    function get_dichvu_data(): array
    {
        $result = admin_api_list_table('dichvu_donvesinh');
        $rows = $result['rows'] ?? [];

        $normalized = array_map(static fn(array $row): array => dichvu_normalize_row($row), $rows);
        usort($normalized, static fn(array $a, array $b): int => ($b['id'] <=> $a['id']));

        return [
            'rows' => $normalized,
            'error' => (string) ($result['error'] ?? ''),
        ];
    }
}

if (!function_exists('get_dichvu_by_id')) {
    function get_dichvu_by_id(int $id): array
    {
        if ($id <= 0) {
            return ['row' => null, 'error' => 'Ma dich vu khong hop le.'];
        }

        $result = get_dichvu_data();
        if (($result['error'] ?? '') !== '') {
            return ['row' => null, 'error' => (string) $result['error']];
        }

        foreach (($result['rows'] ?? []) as $row) {
            if ((int) ($row['id'] ?? 0) === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Khong tim thay dich vu.'];
    }
}

if (!function_exists('dichvu_build_payload_from_post')) {
    function dichvu_build_payload_from_post(array $post): array
    {
        $name = trim((string) ($post['name'] ?? ''));
        $image = trim((string) ($post['image'] ?? ''));
        $alt = trim((string) ($post['alt'] ?? ''));
        $description = trim((string) ($post['description'] ?? ''));

        // Xử lý LOẠI
        $loaiTextRaw = str_replace("\r", '', (string) ($post['loai_text'] ?? ''));
        $loaiLines = array_filter(array_map('trim', explode("\n", $loaiTextRaw)), static fn(string $item): bool => $item !== '');
        $loai = array_values($loaiLines);

        // Xử lý INCLUDES
        $includesTextRaw = str_replace("\r", '', (string) ($post['includes_text'] ?? ''));
        $includesLines = array_filter(array_map('trim', explode("\n", $includesTextRaw)), static fn(string $item): bool => $item !== '');
        $includes = [];
        foreach ($includesLines as $line) {
            if ($line !== '' && substr($line, -1) !== '.') {
                $line .= '.';
            }
            $includes[] = $line;
        }
        $includes = array_values($includes);

        // Xử lý TIME SLOTS
        $tsValues = is_array($post['ts_value'] ?? null) ? $post['ts_value'] : [];
        $tsLabels = is_array($post['ts_label'] ?? null) ? $post['ts_label'] : [];
        $timeSlots = [];
        $maxTs = max(count($tsValues), count($tsLabels));
        for ($i = 0; $i < $maxTs; $i++) {
            $v = trim((string) ($tsValues[$i] ?? ''));
            $l = trim((string) ($tsLabels[$i] ?? ''));
            if ($v !== '' || $l !== '') {
                $timeSlots[] = ['value' => $v, 'label' => $l];
            }
        }

        // Xử lý PRICING (chấp nhận JSON trực tiếp từ form ẩn để xử lý cấu trúc phức tạp)
        $pricingJsonRaw = trim((string) ($post['pricing_json'] ?? ''));
        $pricing = [];
        if ($pricingJsonRaw !== '') {
            $decoded = json_decode($pricingJsonRaw, true);
            if (is_array($decoded)) {
                $pricing = $decoded;
            }
        }

        if ($name === '') {
            return ['success' => false, 'message' => 'Ten dich vu khong duoc de trong.'];
        }
        if ($description === '') {
            return ['success' => false, 'message' => 'Mo ta dich vu khong duoc de trong.'];
        }
        if (!$loai) {
            return ['success' => false, 'message' => 'Can it nhat 1 loai hinh (nha, tro, can ho...).'];
        }
        if (!$includes) {
            return ['success' => false, 'message' => 'Can it nhat 1 muc trong danh sach cong viec bao gom.'];
        }
        if (!$pricing || !isset($pricing['type'])) {
            return ['success' => false, 'message' => 'Thong tin bang gia khong hop le hoac thieu loai (type).'];
        }

        if ($alt === '') {
            $alt = 'Dich vu ' . $name;
        }

        return [
            'success' => true,
            'message' => '',
            'data' => [
                'loai' => json_encode($loai, JSON_UNESCAPED_UNICODE),
                'name' => $name,
                'image' => $image,
                'alt' => $alt,
                'description' => $description,
                'includes' => json_encode($includes, JSON_UNESCAPED_UNICODE),
                'time_slots' => json_encode($timeSlots, JSON_UNESCAPED_UNICODE),
                'pricing' => json_encode($pricing, JSON_UNESCAPED_UNICODE),
            ],
        ];
    }
}
