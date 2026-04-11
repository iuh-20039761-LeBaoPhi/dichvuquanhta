<?php
declare(strict_types=1);

/**
 * Danh sách bản đồ dịch vụ theo yêu cầu
 */
function nv_get_service_map(): array {
    return [
        1  => ['name' => 'Chăm sóc mẹ và bé',   'icon' => 'fas fa-baby',          'color' => '#ec4899'],
        2  => ['name' => 'Chăm sóc người bệnh',  'icon' => 'fas fa-hospital-user', 'color' => '#ef4444'],
        3  => ['name' => 'Chăm sóc người già',   'icon' => 'fas fa-person-cane',   'color' => '#f97316'],
        4  => ['name' => 'Làm vườn',             'icon' => 'fas fa-leaf',          'color' => '#22c55e'],
        5  => ['name' => 'Dọn vệ sinh',          'icon' => 'fas fa-broom',         'color' => '#14b8a6'],
        6  => ['name' => 'Lái xe hộ',            'icon' => 'fas fa-car',           'color' => '#3b82f6'],
        7  => ['name' => 'Giao hàng nhanh',      'icon' => 'fas fa-truck-fast',    'color' => '#6366f1'],
        8  => ['name' => 'Sửa xe',               'icon' => 'fas fa-motorcycle',    'color' => '#8b5cf6'],
        9  => ['name' => 'Thợ nhà',              'icon' => 'fas fa-tools',         'color' => '#11998e'],
        10 => ['name' => 'Thuê xe',              'icon' => 'fas fa-key',           'color' => '#0ea5e9'],
        11 => ['name' => 'Giặt ủi nhanh',        'icon' => 'fas fa-tshirt',        'color' => '#f43f5e'],
    ];
}

/**
 * Lấy danh sách hàng từ API theo bảng
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
 * Lấy thông tin nhân viên từ session và giải mã danh sách dịch vụ
 */
function nv_get_employee_info(): array {
    // 1. Lấy user từ session (được session_user.php thiết lập)
    $user = $_SESSION['user'] ?? null;
    if (!$user) return ['row' => [], 'services' => [], 'error' => 'Chưa đăng nhập'];

    // 2. Tìm thông tin chi tiết trong bảng nguoidung (dùng chung cho NCC và KH)
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

    if (!$found) return ['row' => [], 'services' => [], 'error' => 'Không tìm thấy dữ liệu'];

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
