<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if (!function_exists('get_hoadon_data')) {
    function get_hoadon_data(): array
    {
        $result = admin_api_list_table('datlich_mevabe');
        $rows = $result['rows'] ?? [];

        usort($rows, static function (array $a, array $b): int {
            return (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0);
        });

        return [
            'rows' => $rows,
            'error' => (string)($result['error'] ?? ''),
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
            return ['row' => null, 'error' => (string)$result['error']];
        }

        foreach (($result['rows'] ?? []) as $row) {
            if ((int)($row['id'] ?? 0) === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Khong tim thay hoa don.'];
    }
}

if (!function_exists('hoadon_status_key')) {
    function hoadon_status_key(string $status): string
    {
        $raw = strtolower(trim($status));

        if (in_array($raw, ['huy_don', 'huy don', 'huy', 'da_huy', 'da huy', 'đã hủy', 'cancelled', 'canceled'], true)) {
            return 'cancelled';
        }
        if (in_array($raw, ['hoan_thanh', 'hoan thanh', 'completed', 'done'], true)) {
            return 'completed';
        }
        if (in_array($raw, ['da_nhan', 'da nhan', 'đã nhận', 'received', 'dang_thuc_hien', 'dang thuc hien', 'in_progress', 'in progress'], true)) {
            return 'in_progress';
        }
        if (in_array($raw, ['da_duyet', 'da duyet', 'đã duyệt', 'approved', 'da_xac_nhan', 'da xac nhan', 'confirmed'], true)) {
            return 'confirmed';
        }
        if (in_array($raw, ['', 'pending', 'cho_duyet', 'cho duyet', 'chờ duyệt', 'waiting'], true)) {
            return 'pending';
        }

        return 'other';
    }
}

if (!function_exists('hoadon_status_meta')) {
    function hoadon_status_meta(string $status): array
    {
        $key = hoadon_status_key($status);
        if ($key === 'cancelled') {
            return ['key' => $key, 'text' => 'Da huy', 'badge' => 'text-bg-danger'];
        }
        if ($key === 'completed') {
            return ['key' => $key, 'text' => 'Hoan thanh', 'badge' => 'text-bg-success'];
        }
        if ($key === 'in_progress') {
            return ['key' => $key, 'text' => 'Dang thuc hien', 'badge' => 'text-bg-warning'];
        }
        if ($key === 'confirmed') {
            return ['key' => $key, 'text' => 'Da xac nhan', 'badge' => 'text-bg-info'];
        }
        if ($key === 'pending') {
            return ['key' => $key, 'text' => 'Cho xac nhan', 'badge' => 'text-bg-secondary'];
        }

        return ['key' => $key, 'text' => 'Khac', 'badge' => 'text-bg-dark'];
    }
}
