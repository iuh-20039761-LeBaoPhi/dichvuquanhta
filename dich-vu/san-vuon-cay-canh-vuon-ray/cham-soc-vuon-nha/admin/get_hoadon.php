<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

/**
 * Hàm hỗ trợ tự động khởi tạo bảng nếu chưa tồn tại trong Database
 * Lưu ý: Hệ thống này dùng API HTTP (api.dvqt.vn), không dùng kết nối DB trực tiếp.
 * Hàm này được giữ lại để tương thích nhưng không thực hiện gì.
 */
function ensure_garden_tables_exist(): void
{
    // Không thực hiện gì - bảng được quản lý bởi API backend
}

// Chạy khởi tạo ngay khi load file
ensure_garden_tables_exist();

if (!function_exists('get_hoadon_data')) {
    /**
     * Lấy danh sách đơn đặt lịch chăm sóc vườn
     */
    function get_hoadon_data(): array
    {
        // Đọc từ bảng datlich_chamsocvuon (bảng dat-lich.html ghi vào)
        $result = admin_api_list_table('datlich_chamsocvuon');

        // Nếu bảng chưa tồn tại (chưa có đơn nào được đặt lần đầu) → trả về rỗng, không báo lỗi
        $error = (string) ($result['error'] ?? '');
        if (stripos($error, "doesn't exist") !== false || stripos($error, 'not found') !== false) {
            return ['rows' => [], 'error' => ''];
        }

        $rows = is_array($result['rows'] ?? null) ? $result['rows'] : [];

        // Sắp xếp đơn mới nhất lên đầu
        usort($rows, static function (array $a, array $b): int {
            return (int) ($b['id'] ?? 0) <=> (int) ($a['id'] ?? 0);
        });

        return [
            'rows' => $rows,
            'error' => $error,
        ];
    }
}

if (!function_exists('get_hoadon_by_id')) {
    /**
     * Lấy chi tiết một đơn chăm sóc vườn theo ID
     */
    function get_hoadon_by_id(int $id): array
    {
        if ($id <= 0) {
            return ['row' => null, 'error' => 'Mã hóa đơn không hợp lệ.'];
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

        return ['row' => null, 'error' => 'Không tìm thấy đơn hàng vườn.'];
    }
}

if (!function_exists('hoadon_status_key')) {
    /**
     * Chuẩn hóa từ khóa trạng thái cho dịch vụ làm vườn
     */
    function hoadon_status_key(string $status): string
    {
        $lower = function_exists('mb_strtolower') ? mb_strtolower(trim($status), 'UTF-8') : strtolower(trim($status));

        if (in_array($lower, ['huy_don', 'huy', 'da huy', 'cancelled'], true)) {
            return 'cancelled';
        }
        if (in_array($lower, ['hoan_thanh', 'da cham soc', 'completed', 'done'], true)) {
            return 'completed';
        }
        if (in_array($lower, ['dang_thuc_hien', 'dang_cham_soc', 'in_progress', 'working'], true)) {
            return 'in_progress';
        }
        if (in_array($lower, ['da_duyet', 'da_xac_nhan', 'confirmed', 'approved'], true)) {
            return 'confirmed';
        }
        if ($lower === '' || in_array($lower, ['pending', 'cho_duyet', 'cho_khao_sat', 'waiting'], true)) {
            return 'pending';
        }

        return 'other';
    }
}

if (!function_exists('hoadon_status_meta')) {
    /**
     * Trả về định dạng hiển thị (Badge UI) cho trạng thái đơn vườn
     */
    function hoadon_status_meta(string $status): array
    {
        $raw = trim($status);
        $key = hoadon_status_key($raw);

        switch ($key) {
            case 'cancelled':
                return ['key' => 'cancelled', 'text' => 'Đã hủy', 'badge' => 'text-bg-danger'];
            case 'completed':
                return ['key' => 'completed', 'text' => 'Đã hoàn tất', 'badge' => 'text-bg-success'];
            case 'in_progress':
                return ['key' => 'in_progress', 'text' => 'Đang thực hiện', 'badge' => 'text-bg-warning'];
            case 'confirmed':
                return ['key' => 'confirmed', 'text' => 'Đã xác nhận', 'badge' => 'text-bg-info'];
            case 'pending':
                return ['key' => 'pending', 'text' => 'Chờ khảo sát', 'badge' => 'text-bg-secondary'];
            default:
                return [
                    'key' => 'other',
                    'text' => $raw !== '' ? $raw : 'Khác',
                    'badge' => 'text-bg-dark',
                ];
        }
    }
}

if (!function_exists('get_work_history_by_datlich_id')) {
    /**
     * Lấy nhật ký chăm sóc vườn (Lịch sử làm việc)
     */
    function get_work_history_by_datlich_id(int $id_datlich): array
    {
        if ($id_datlich <= 0) {
            return ['rows' => [], 'error' => 'Mã đặt lịch không hợp lệ.'];
        }

        $result = admin_api_list_table('lich_su_cham_soc_vuon');
        $rows = is_array($result['rows'] ?? null) ? $result['rows'] : [];

        $filtered = [];
        foreach ($rows as $row) {
            if ((int)($row['id_dv'] ?? 0) === $id_datlich) {
                $filtered[] = $row;
            }
        }

        usort($filtered, static function (array $a, array $b): int {
            return (int)($a['id'] ?? 0) <=> (int)($b['id'] ?? 0);
        });

        return [
            'rows' => $filtered,
            'error' => (string)($result['error'] ?? ''),
        ];
    }
}