<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if (!function_exists('get_hoadon_data')) {
    function get_hoadon_data(): array
    {
        $result = admin_api_list_table('datlich_nguoigia');
        $rows = is_array($result['rows'] ?? null) ? $result['rows'] : [];

        usort($rows, static function (array $a, array $b): int {
            return (int) ($b['id'] ?? 0) <=> (int) ($a['id'] ?? 0);
        });

        return [
            'rows' => $rows,
            'error' => (string) ($result['error'] ?? ''),
        ];
    }
}

if (!function_exists('get_hoadon_by_id')) {
    function get_hoadon_by_id(int $id): array
    {
        if ($id <= 0) {
            return ['row' => null, 'error' => 'Ma hoa don khong hop le.'];
        }

        $result = get_hoadon_data();
        if (($result['error'] ?? '') !== '') {
            return ['row' => null, 'error' => (string) $result['error']];
        }

        foreach (($result['rows'] ?? []) as $row) {
            if ((int) ($row['id'] ?? 0) === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Khong tim thay hoa don.'];
    }
}

if (!function_exists('hoadon_status_meta')) {
    function hoadon_status_key(string $status): string
    {
        $lower = function_exists('mb_strtolower') ? mb_strtolower(trim($status), 'UTF-8') : strtolower(trim($status));

        if (in_array($lower, ['huy_don', 'huy don', 'huy', 'da_huy', 'da huy', 'da huy don', 'cancelled', 'canceled'], true)) {
            return 'cancelled';
        }
        if (in_array($lower, ['hoan_thanh', 'hoan thanh', 'completed', 'done'], true)) {
            return 'completed';
        }
        if (in_array($lower, ['da_nhan', 'da nhan', 'dang_thuc_hien', 'dang thuc hien', 'in_progress', 'in progress', 'received'], true)) {
            return 'in_progress';
        }
        if (in_array($lower, ['da_duyet', 'da duyet', 'da_xac_nhan', 'da xac nhan', 'approved', 'confirmed'], true)) {
            return 'confirmed';
        }
        if ($lower === '' || in_array($lower, ['pending', 'cho_duyet', 'cho duyet', 'cho xac nhan', 'cho_nhan_don', 'cho nhan don', 'waiting'], true)) {
            return 'pending';
        }

        return 'other';
    }
}

if (!function_exists('hoadon_status_meta')) {
    function hoadon_status_meta(string $status): array
    {
        $raw = trim($status);
        $key = hoadon_status_key($raw);

        if ($key === 'cancelled') {
            return ['key' => 'cancelled', 'text' => 'Da huy', 'badge' => 'text-bg-danger'];
        }
        if ($key === 'completed') {
            return ['key' => 'completed', 'text' => 'Hoan thanh', 'badge' => 'text-bg-success'];
        }
        if ($key === 'in_progress') {
            return ['key' => 'in_progress', 'text' => 'Dang thuc hien', 'badge' => 'text-bg-warning'];
        }
        if ($key === 'confirmed') {
            return ['key' => 'confirmed', 'text' => 'Da xac nhan', 'badge' => 'text-bg-info'];
        }
        if ($key === 'pending') {
            return ['key' => 'pending', 'text' => 'Cho xac nhan', 'badge' => 'text-bg-secondary'];
        }

        return [
            'key' => 'other',
            'text' => $raw !== '' ? $raw : 'Khac',
            'badge' => 'text-bg-dark',
        ];
    }
}
