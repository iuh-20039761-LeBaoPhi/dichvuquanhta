<?php
declare(strict_types=1);

/**
 * Danh sách bản đồ dịch vụ theo yêu cầu (cho tài xế)
 * Lọc chỉ hiển thị dịch vụ lái xe hộ và các dịch vụ liên quan
 */
function nv_get_service_map(): array {
    return [
        1  => ['name' => 'Lái xe theo giờ',      'icon' => 'fas fa-clock',        'color' => '#3b82f6'],
        2  => ['name' => 'Lái xe theo ngày',     'icon' => 'fas fa-calendar-day',  'color' => '#10b981'],
        3  => ['name' => 'Lái xe đường dài',     'icon' => 'fas fa-road',          'color' => '#f59e0b'],
        4  => ['name' => 'Tài xế riêng',         'icon' => 'fas fa-user-tie',      'color' => '#8b5cf6'],
        5  => ['name' => 'Đưa đón sân bay',      'icon' => 'fas fa-plane',         'color' => '#06b6d4'],
        6  => ['name' => 'Lái xe đêm & sự kiện', 'icon' => 'fas fa-moon',          'color' => '#6366f1'],
        7  => ['name' => 'Xe tải vận chuyển',    'icon' => 'fas fa-truck',         'color' => '#ef4444'],
        8  => ['name' => 'Xe sang trọng',        'icon' => 'fas fa-gem',           'color' => '#ec4899'],
    ];
}

/**
 * Lấy danh sách hàng từ API theo bảng
 * @param string $table Tên bảng cần lấy dữ liệu
 * @return array
 */
function nv_list_table_rows(string $table): array {
    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => $table]);
    
    $opts = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 10
        ]
    ];
    
    $raw = @file_get_contents($url, false, stream_context_create($opts));
    if (!$raw) return [];
    
    $decoded = json_decode($raw, true);
    return $decoded['data'] ?? $decoded['rows'] ?? [];
}

/**
 * Lấy thông tin tài xế từ session và giải mã danh sách dịch vụ
 * @return array ['row' => array, 'services' => array, 'error' => string]
 */
function nv_get_employee_info(): array {
    // 1. Lấy user từ session (được session_user.php thiết lập)
    $user = $_SESSION['user'] ?? null;
    if (!$user) return ['row' => [], 'services' => [], 'error' => 'Chưa đăng nhập'];

    // 2. Tìm thông tin chi tiết trong bảng nguoidung (dùng chung cho tài xế và khách hàng)
    $phone = preg_replace('/\D/', '', (string)($user['sodienthoai'] ?? ''));
    $allUsers = nv_list_table_rows('nguoidung');
    
    $found = null;
    foreach ($allUsers as $u) {
        $uPhone = preg_replace('/\D/', '', (string)($u['sodienthoai'] ?? ''));
        if ($uPhone === $phone) {
            $found = $u;
            break;
        }
    }

    if (!$found) return ['row' => [], 'services' => [], 'error' => 'Không tìm thấy dữ liệu tài xế'];

    // 3. Xử lý danh sách dịch vụ từ id_dichvu (ví dụ: "1,2,5")
    $map = nv_get_service_map();
    $serviceIds = explode(',', (string)($found['id_dichvu'] ?? ''));
    $services = [];
    foreach ($serviceIds as $id) {
        $id = (int)trim($id);
        if (isset($map[$id])) {
            $services[] = $map[$id];
        }
    }

    return ['row' => $found, 'services' => $services, 'error' => ''];
}

/**
 * Lấy thông tin tài xế theo ID
 * @param int $id ID tài xế
 * @return array|null
 */
function nv_get_driver_by_id(int $id): ?array {
    if ($id <= 0) return null;
    
    $allUsers = nv_list_table_rows('nguoidung');
    foreach ($allUsers as $u) {
        if ((int)($u['id'] ?? 0) === $id) {
            return $u;
        }
    }
    return null;
}

/**
 * Lấy danh sách tất cả tài xế (nhà cung cấp)
 * @return array
 */
function nv_get_all_drivers(): array {
    $allUsers = nv_list_table_rows('nguoidung');
    $drivers = [];
    
    foreach ($allUsers as $u) {
        // Kiểm tra nếu user có id_dichvu chứa dịch vụ lái xe (id=6 trong map cũ)
        $serviceIds = explode(',', (string)($u['id_dichvu'] ?? ''));
        if (in_array('6', $serviceIds) || in_array('1', $serviceIds) || in_array('2', $serviceIds)) {
            $drivers[] = $u;
        }
    }
    
    return $drivers;
}

/**
 * Kiểm tra xem tài xế có đang hoạt động không
 * @param array $driver Thông tin tài xế
 * @return bool
 */
function nv_is_driver_active(array $driver): bool {
    $status = strtolower(trim((string)($driver['trangthai'] ?? 'active')));
    return $status === 'active' || $status === 'đang hoạt động';
}

/**
 * Lấy số lượng đơn hàng đã hoàn thành của tài xế
 * @param int $driverId ID tài xế
 * @return int
 */
function nv_get_completed_orders_count(int $driverId): int {
    if ($driverId <= 0) return 0;
    
    $orders = nv_list_table_rows('datlich_taixe');
    $count = 0;
    
    foreach ($orders as $order) {
        if ((int)($order['id_taixe'] ?? 0) === $driverId) {
            $status = strtolower(trim((string)($order['trangthai'] ?? '')));
            if ($status === 'hoàn thành' || $status === 'completed') {
                $count++;
            }
        }
    }
    
    return $count;
}

/**
 * Lấy đánh giá trung bình của tài xế
 * @param int $driverId ID tài xế
 * @return float
 */
function nv_get_driver_rating(int $driverId): float {
    if ($driverId <= 0) return 0;
    
    $orders = nv_list_table_rows('datlich_taixe');
    $total = 0;
    $count = 0;
    
    foreach ($orders as $order) {
        if ((int)($order['id_taixe'] ?? 0) === $driverId) {
            $rating = (float)($order['danhgia_taixe_diem'] ?? 0);
            if ($rating > 0) {
                $total += $rating;
                $count++;
            }
        }
    }
    
    return $count > 0 ? round($total / $count, 1) : 0;
}

// Thực thi và gán vào các biến dùng chung cho giao diện HTML
$employeeInfo = nv_get_employee_info();
$employeeRow = $employeeInfo['row'] ?? [];
$employeeServices = $employeeInfo['services'] ?? [];
$employeeError = $employeeInfo['error'] ?? '';
$isEmployeeApproved = ($employeeError === '' && !empty($employeeRow));
?>