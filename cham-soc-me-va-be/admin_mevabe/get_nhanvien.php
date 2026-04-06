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
