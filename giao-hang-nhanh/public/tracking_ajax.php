<?php
header('Content-Type: application/json; charset=UTF-8');

function json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function normalize_service_type($value): string
{
    $normalized = strtolower(trim((string) $value));
    $map = [
        'giao_ngay_lap_tuc' => 'instant',
        'giao_hoa_toc' => 'express',
        'giao_nhanh' => 'fast',
        'giao_tieu_chuan' => 'standard',
        'so_luong_lon' => 'bulk',
        'quoc_te_tiet_kiem' => 'intl_economy',
        'quoc_te_hoa_toc' => 'intl_express',
    ];
    return $map[$normalized] ?? $normalized;
}

try {
    require_once __DIR__ . '/../config/db.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['status' => 'error', 'message' => 'Phương thức không hợp lệ.'], 405);
    }

    $code = strtoupper(trim($_POST['code'] ?? ''));
    $search_type = strtolower(trim($_POST['search_type'] ?? 'standard'));

    if ($code === '') {
        json_response(['status' => 'error', 'message' => 'Vui lòng nhập mã đơn hàng.']);
    }

    $stmt = $conn->prepare(
        "SELECT id, ma_don_hang AS order_code, loai_goi_hang AS package_type, loai_dich_vu AS service_type, so_tien_cod AS cod_amount, trang_thai AS status, tao_luc AS created_at
         FROM don_hang
         WHERE ma_don_hang = ?"
    );
    if (!$stmt) {
        json_response(['status' => 'error', 'message' => 'Không thể chuẩn bị truy vấn đơn hàng.']);
    }

    $stmt->bind_param('s', $code);
    $stmt->execute();
    $result = $stmt->get_result();

    if (!$result || $result->num_rows === 0) {
        $stmt->close();
        json_response(['status' => 'error', 'message' => 'Không tìm thấy đơn hàng này.']);
    }

    $order = $result->fetch_assoc();
    $stmt->close();

    $serviceType = normalize_service_type($order['service_type'] ?? '');
    if ($search_type === 'bulk' && $serviceType !== 'bulk') {
        json_response(['status' => 'error', 'message' => 'Đây không phải đơn số lượng lớn. Vui lòng tra cứu ở mục Tiêu chuẩn.']);
    }
    if ($search_type === 'cod' && (float) ($order['cod_amount'] ?? 0) <= 0) {
        json_response(['status' => 'error', 'message' => 'Đơn hàng này không có dịch vụ COD.']);
    }
    if ($search_type === 'standard' && $serviceType === 'bulk') {
        json_response(['status' => 'error', 'message' => 'Đây là đơn số lượng lớn. Vui lòng tra cứu ở mục Số lượng lớn.']);
    }

    $status_map = [
        'pending' => ['text' => 'Chờ xử lý', 'icon' => '⏳', 'color' => '#ffc107'],
        'shipping' => ['text' => 'Đang giao', 'icon' => '🚚', 'color' => '#17a2b8'],
        'completed' => ['text' => 'Hoàn tất', 'icon' => '✅', 'color' => '#28a745'],
        'cancelled' => ['text' => 'Đã hủy', 'icon' => '❌', 'color' => '#dc3545'],
    ];

    $pkg_map = [
        'document' => 'Tài liệu',
        'food' => 'Đồ ăn',
        'clothes' => 'Quần áo',
        'electronic' => 'Điện tử',
        'other' => 'Khác',
    ];

    $st_key = strtolower((string) ($order['status'] ?? 'pending'));
    $st_info = $status_map[$st_key] ?? $status_map['pending'];

    $timeline = [
        [
            'text' => 'Đơn hàng đã được tạo',
            'time' => date('H:i d/m/Y', strtotime((string) $order['created_at'])),
            'icon' => '📝',
        ],
    ];

    // Lấy log trạng thái, nếu lỗi thì bỏ qua để vẫn trả được kết quả tra cứu.
    $log_stmt = $conn->prepare(
        "SELECT trang_thai_moi AS new_status, tao_luc AS created_at
         FROM nhat_ky_don_hang
         WHERE don_hang_id = ?
         ORDER BY tao_luc ASC"
    );
    if ($log_stmt) {
        $orderId = (int) $order['id'];
        $log_stmt->bind_param('i', $orderId);
        $log_stmt->execute();
        $log_res = $log_stmt->get_result();

        if ($log_res) {
            while ($log = $log_res->fetch_assoc()) {
                $s_key = strtolower((string) ($log['new_status'] ?? ''));
                $s_info = $status_map[$s_key] ?? ['text' => $s_key, 'icon' => '●'];

                $timeline[] = [
                    'text' => 'Trạng thái: ' . $s_info['text'],
                    'time' => date('H:i d/m/Y', strtotime((string) $log['created_at'])),
                    'icon' => $s_info['icon'],
                ];
            }
        }
        $log_stmt->close();
    }

    $conn->close();

    json_response([
        'status' => 'success',
        'data' => [
            'order_code' => $order['order_code'],
            'type' => $pkg_map[$order['package_type']] ?? $order['package_type'],
            'status_text' => $st_info['text'],
            'status_raw' => $order['status'],
            'icon' => $st_info['icon'],
            'color' => $st_info['color'],
            'created_at' => date('d/m/Y H:i', strtotime((string) $order['created_at'])),
            'timeline' => $timeline,
        ],
    ]);
} catch (Throwable $e) {
    json_response([
        'status' => 'error',
        'message' => 'Lỗi hệ thống khi tra cứu đơn hàng. Vui lòng thử lại.',
        'debug' => $e->getMessage(),
    ], 500);
}
