<?php
// get-hoa-don.php
require_once __DIR__ . '/../session_user.php';

/**
 * Hàm kiểm tra và lấy danh sách đơn hàng dựa theo session người dùng
 */
function get_filtered_invoices() {
    $user = $_SESSION['user'] ?? null;
    if (!$user) {
        return ['error' => 'Chưa đăng nhập', 'data' => []];
    }

    $id_dichvu = (int)($user['id_dichvu'] ?? 0);
    $userPhone = preg_replace('/\D/', '', $user['sodienthoai'] ?? '');

    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => 'datlich_nguoibenh'], JSON_UNESCAPED_UNICODE);
    
    $opts = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 20,
        ]
    ];
    $context = stream_context_create($opts);
    $raw = @file_get_contents($url, false, $context);

    if (!$raw) {
        return ['error' => 'Không thể kết nối API', 'data' => []];
    }

    $json = json_decode($raw, true);
    $allData = $json['data'] ?? $json['rows'] ?? $json['list'] ?? [];
    $filtered = [];

    foreach ($allData as $item) {
        $isMatch = false;
        if ($id_dichvu === 1) {
            // Nhà cung cấp: lấy đơn hàng trạng thái null OR khớp số điện thoại NCC
            $trangthai = $item['trangthai'] ?? null;
            $phoneNCC = preg_replace('/\D/', '', $item['sodienthoaincc'] ?? '');
            if ($trangthai === null || $trangthai === '' || $phoneNCC === $userPhone) {
                $isMatch = true;
            }
        } else {
            // Khách hàng: khớp số điện thoại khách hàng
            $phoneKH = preg_replace('/\D/', '', $item['sdtkhachhang'] ?? '');
            if ($phoneKH === $userPhone) {
                $isMatch = true;
            }
        }

        if ($isMatch) {
            // Truyền trực tiếp dữ liệu theo tên cột
            $filtered[] = $item;
        }
    }

    // Sắp xếp ID giảm dần (mới nhất lên đầu)
    usort($filtered, function($a, $b) {
        return (int)($b['id'] ?? 0) - (int)($a['id'] ?? 0);
    });

    return ['error' => '', 'data' => $filtered];
}

// Thực thi và gán vào các biến dùng chung cho giao diện HTML
$resHoaDon = get_filtered_invoices();
$rows = $resHoaDon['data'] ?? [];
$loadError = $resHoaDon['error'] ?? '';
$isEmployeeApproved = true; // Cho phép hiển thị giao diện khi session hợp lệ
?>
