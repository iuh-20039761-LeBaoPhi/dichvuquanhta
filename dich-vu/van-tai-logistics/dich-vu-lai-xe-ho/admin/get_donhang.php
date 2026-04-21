<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if (!function_exists('get_donhang_data')) {
    function get_donhang_data(): array
    {
        // Đổi bảng từ datlich_mevabe sang datlich_taixe
        $result = admin_api_list_table('datlich_taixe');
        $rows = is_array($result['rows'] ?? null) ? $result['rows'] : [];

        usort($rows, static function (array $a, array $b): int {
            return (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0);
        });

        return [
            'rows' => $rows,
            'error' => (string)($result['error'] ?? ''),
        ];
    }
}

if (!function_exists('get_donhang_by_id')) {
    function get_donhang_by_id(int $id): array
    {
        if ($id <= 0) {
            return ['row' => null, 'error' => 'Mã đơn hàng không hợp lệ.'];
        }

        $result = get_donhang_data();
        if (($result['error'] ?? '') !== '') {
            return ['row' => null, 'error' => (string)$result['error']];
        }

        foreach (($result['rows'] ?? []) as $row) {
            if ((int)($row['id'] ?? 0) === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Không tìm thấy đơn hàng.'];
    }
}

if (!function_exists('donhang_status_key')) {
    function donhang_status_key(string $status): string
    {
        $lower = function_exists('mb_strtolower') ? mb_strtolower(trim($status), 'UTF-8') : strtolower(trim($status));

        // Trạng thái đã hủy
        if (in_array($lower, ['huy_don', 'huy don', 'huy', 'da_huy', 'da huy', 'da huy don', 'cancelled', 'canceled'], true)) {
            return 'cancelled';
        }
        // Trạng thái hoàn thành
        if (in_array($lower, ['hoan_thanh', 'hoan thanh', 'completed', 'done'], true)) {
            return 'completed';
        }
        // Trạng thái đang thực hiện
        if (in_array($lower, ['da_nhan', 'da nhan', 'dang_thuc_hien', 'dang thuc hien', 'dang_thuc_hien', 'in_progress', 'in progress', 'received', 'dang_xu_ly', 'dang xu ly'], true)) {
            return 'in_progress';
        }
        // Trạng thái đã xác nhận
        if (in_array($lower, ['da_duyet', 'da duyet', 'da_xac_nhan', 'da xac nhan', 'approved', 'confirmed', 'xac_nhan', 'xac nhan'], true)) {
            return 'confirmed';
        }
        // Trạng thái chờ xác nhận
        if ($lower === '' || in_array($lower, ['pending', 'cho_duyet', 'cho duyet', 'cho_xac_nhan', 'cho xac nhan', 'cho_nhan_don', 'cho nhan don', 'waiting', 'chờ duyệt'], true)) {
            return 'pending';
        }

        return 'other';
    }
}

if (!function_exists('donhang_status_meta')) {
    function donhang_status_meta(string $status): array
    {
        $raw = trim($status);
        $key = donhang_status_key($raw);

        if ($key === 'cancelled') {
            return ['key' => 'cancelled', 'text' => 'Đã hủy', 'badge' => 'text-bg-danger'];
        }
        if ($key === 'completed') {
            return ['key' => 'completed', 'text' => 'Hoàn thành', 'badge' => 'text-bg-success'];
        }
        if ($key === 'in_progress') {
            return ['key' => 'in_progress', 'text' => 'Đang thực hiện', 'badge' => 'text-bg-warning'];
        }
        if ($key === 'confirmed') {
            return ['key' => 'confirmed', 'text' => 'Đã xác nhận', 'badge' => 'text-bg-info'];
        }
        if ($key === 'pending') {
            return ['key' => 'pending', 'text' => 'Chờ xác nhận', 'badge' => 'text-bg-secondary'];
        }

        return [
            'key' => 'other',
            'text' => $raw !== '' ? $raw : 'Khác',
            'badge' => 'text-bg-dark',
        ];
    }
}

/**
 * Lấy danh sách đơn hàng theo trạng thái
 */
if (!function_exists('get_donhang_by_status')) {
    function get_donhang_by_status(string $status): array
    {
        $result = get_donhang_data();
        if (($result['error'] ?? '') !== '') {
            return ['rows' => [], 'error' => $result['error']];
        }

        $statusKey = donhang_status_key($status);
        $filtered = array_filter($result['rows'], function ($row) use ($statusKey) {
            return donhang_status_key($row['trangthai'] ?? '') === $statusKey;
        });

        return [
            'rows' => array_values($filtered),
            'error' => '',
        ];
    }
}

/**
 * Lấy tổng doanh thu
 */
if (!function_exists('get_tong_doanh_thu')) {
    function get_tong_doanh_thu(): float
    {
        $result = get_donhang_data();
        if (($result['error'] ?? '') !== '') {
            return 0;
        }

        $total = 0;
        foreach ($result['rows'] as $row) {
            $status = donhang_status_key($row['trangthai'] ?? '');
            if ($status === 'completed') {
                $total += (float)($row['tong_tien'] ?? 0);
            }
        }

        return $total;
    }
}

/**
 * Lấy số lượng đơn hàng theo trạng thái
 */
if (!function_exists('get_donhang_count_by_status')) {
    function get_donhang_count_by_status(?string $status = null): int
    {
        $result = get_donhang_data();
        if (($result['error'] ?? '') !== '') {
            return 0;
        }

        if ($status === null) {
            return count($result['rows']);
        }

        $statusKey = donhang_status_key($status);
        $count = 0;
        foreach ($result['rows'] as $row) {
            if (donhang_status_key($row['trangthai'] ?? '') === $statusKey) {
                $count++;
            }
        }

        return $count;
    }
}

/**
 * Cập nhật trạng thái đơn hàng
 */
if (!function_exists('cap_nhat_trangthai_donhang')) {
    function cap_nhat_trangthai_donhang(int $id, string $status): array
    {
        if ($id <= 0) {
            return ['success' => false, 'message' => 'ID đơn hàng không hợp lệ'];
        }

        $allowed = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'];
        $statusKey = donhang_status_key($status);
        
        if (!in_array($statusKey, $allowed)) {
            return ['success' => false, 'message' => 'Trạng thái không hợp lệ'];
        }

        // Chuyển đổi statusKey thành text hiển thị
        $statusText = match ($statusKey) {
            'pending' => 'Chờ xác nhận',
            'confirmed' => 'Đã xác nhận',
            'in_progress' => 'Đang thực hiện',
            'completed' => 'Hoàn thành',
            'cancelled' => 'Đã hủy',
            default => $status,
        };

        return admin_api_update_table('datlich_taixe', $id, [
            'trangthai' => $statusText
        ]);
    }
}

/**
 * Phân công tài xế cho đơn hàng
 */
if (!function_exists('phan_cong_taixe')) {
    function phan_cong_taixe(int $donhang_id, int $taixe_id): array
    {
        if ($donhang_id <= 0 || $taixe_id <= 0) {
            return ['success' => false, 'message' => 'ID đơn hàng hoặc tài xế không hợp lệ'];
        }

        // Lấy thông tin tài xế
        $taixeResult = admin_api_list_table('taixe');
        $taixeInfo = null;
        foreach (($taixeResult['rows'] ?? []) as $tx) {
            if ((int)($tx['id'] ?? 0) === $taixe_id) {
                $taixeInfo = $tx;
                break;
            }
        }

        if (!$taixeInfo) {
            return ['success' => false, 'message' => 'Không tìm thấy tài xế'];
        }

        return admin_api_update_table('datlich_taixe', $donhang_id, [
            'id_taixe' => $taixe_id,
            'ten_taixe' => $taixeInfo['hovaten'] ?? '',
            'sdt_taixe' => $taixeInfo['sodienthoai'] ?? '',
            'kinh_nghiem_taixe' => $taixeInfo['kinh_nghiem_nam'] ?? '',
            'trangthai' => 'Đã xác nhận'
        ]);
    }
}
?>