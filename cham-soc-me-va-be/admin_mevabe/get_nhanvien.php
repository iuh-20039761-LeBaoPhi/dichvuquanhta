<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if (!function_exists('get_nhanvien_data')) {
    function get_nhanvien_data(): array
    {
        $result = admin_api_list_table('nhacungcap_mevabe');
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

if (!function_exists('get_nhanvien_by_id')) {
    function get_nhanvien_by_id(int $id): array
    {
        if ($id <= 0) {
            return ['row' => null, 'error' => 'Ma nhan vien khong hop le.'];
        }

        $result = get_nhanvien_data();
        if (($result['error'] ?? '') !== '') {
            return ['row' => null, 'error' => (string)$result['error']];
        }

        foreach (($result['rows'] ?? []) as $row) {
            if ((int)($row['id'] ?? 0) === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Khong tim thay nhan vien.'];
    }
}

if (!function_exists('nhanvien_status_key')) {
    function nhanvien_status_key(string $status): string
    {
        $raw = strtolower(trim($status));

        if (in_array($raw, ['', 'pending', 'cho_duyet', 'cho duyet', 'chờ duyệt', 'waiting'], true)) {
            return 'pending';
        }
        if (in_array($raw, ['active', 'approved', 'da_duyet', 'da duyet', 'đã duyệt'], true)) {
            return 'active';
        }
        if (in_array($raw, ['blocked', 'khoa', 'bi_khoa', 'bi khoa'], true)) {
            return 'blocked';
        }
        if (in_array($raw, ['rejected', 'tu_choi', 'tu choi'], true)) {
            return 'rejected';
        }

        return 'other';
    }
}

if (!function_exists('nhanvien_status_meta')) {
    function nhanvien_status_meta(string $status): array
    {
        $key = nhanvien_status_key($status);
        if ($key === 'pending') {
            return ['key' => $key, 'text' => 'Cho duyet', 'badge' => 'text-bg-warning'];
        }
        if ($key === 'active') {
            return ['key' => $key, 'text' => 'Da duyet', 'badge' => 'text-bg-success'];
        }
        if ($key === 'blocked') {
            return ['key' => $key, 'text' => 'Bi khoa', 'badge' => 'text-bg-secondary'];
        }
        if ($key === 'rejected') {
            return ['key' => $key, 'text' => 'Tu choi', 'badge' => 'text-bg-danger'];
        }

        return ['key' => $key, 'text' => 'Khac', 'badge' => 'text-bg-dark'];
    }
}

if (!function_exists('duyet_nhan_vien')) {
    function duyet_nhan_vien(int $id): array
    {
        return admin_api_update_table('nhacungcap_mevabe', $id, ['trangthai' => 'active']);
    }
}

if (!function_exists('khoa_nhan_vien')) {
    function khoa_nhan_vien(int $id): array
    {
        return admin_api_update_table('nhacungcap_mevabe', $id, ['trangthai' => 'blocked']);
    }
}
