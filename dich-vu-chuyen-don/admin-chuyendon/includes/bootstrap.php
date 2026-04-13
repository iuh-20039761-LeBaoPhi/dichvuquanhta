<?php

require_once __DIR__ . '/../config/local_store.php';

function moving_admin_boot_session() {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function moving_admin_defaults() {
    return [
        'users' => [
            [
                'id' => 'USR-001',
                'name' => 'Nguyen Hoang Minh',
                'phone' => '0903123456',
                'email' => 'minh.admin@globalcare.vn',
                'region' => 'TP. HCM',
                'role' => 'admin',
                'status' => 'active',
                'note' => 'Quan ly van hanh tong va kiem soat bang gia.',
                'created_at' => '2026-04-01 08:00:00',
            ],
            [
                'id' => 'USR-002',
                'name' => 'Tran Bao Chau',
                'phone' => '0911222333',
                'email' => 'chau.kh@gmail.com',
                'region' => 'Quan 7',
                'role' => 'customer',
                'status' => 'active',
                'note' => 'Khach hang chuyen nha dinh ky.',
                'created_at' => '2026-04-03 10:20:00',
            ],
            [
                'id' => 'USR-003',
                'name' => 'Le Quoc Dat',
                'phone' => '0935444555',
                'email' => 'dat.provider@vanchuyen.vn',
                'region' => 'Thu Duc',
                'role' => 'provider',
                'status' => 'active',
                'note' => 'Doi xe tai 1.9 tan phu trach khu Dong.',
                'created_at' => '2026-04-04 09:45:00',
            ],
            [
                'id' => 'USR-004',
                'name' => 'Pham Thu Ha',
                'phone' => '0988999777',
                'email' => 'ha.office@abc.vn',
                'region' => 'Binh Thanh',
                'role' => 'customer',
                'status' => 'pending',
                'note' => 'Dang cho xac nhan hop dong chuyen van phong.',
                'created_at' => '2026-04-06 13:15:00',
            ],
        ],
        'orders' => [
            [
                'id' => 'ORD-001',
                'code' => 'CD-240401',
                'customer' => 'Tran Bao Chau',
                'service' => 'chuyen-nha',
                'provider' => 'Doi xe Thu Duc',
                'execute_date' => '2026-04-12',
                'route' => 'Quan 7 -> Thu Duc',
                'total' => 3200000,
                'status' => 'processing',
                'survey' => 'no',
                'note' => 'Can 1 xe 1.4 tan va 4 nhan su boc xep.',
                'created_at' => '2026-04-08 09:30:00',
            ],
            [
                'id' => 'ORD-002',
                'code' => 'CD-240402',
                'customer' => 'Pham Thu Ha',
                'service' => 'van-phong',
                'provider' => 'Moving Biz Team',
                'execute_date' => '2026-04-15',
                'route' => 'Binh Thanh -> District 1',
                'total' => 9800000,
                'status' => 'survey',
                'survey' => 'yes',
                'note' => 'Van phong 28 nhan su, can thao lap noi that co ban.',
                'created_at' => '2026-04-09 11:10:00',
            ],
            [
                'id' => 'ORD-003',
                'code' => 'CD-240403',
                'customer' => 'Vo Gia Han',
                'service' => 'kho-bai',
                'provider' => 'Kho Van Logistics',
                'execute_date' => '2026-04-20',
                'route' => 'Hoc Mon -> Binh Tan',
                'total' => 12500000,
                'status' => 'new',
                'survey' => 'yes',
                'note' => 'Kho 75m2, co ke sat va may dong goi.',
                'created_at' => '2026-04-10 07:40:00',
            ],
            [
                'id' => 'ORD-004',
                'code' => 'CD-240397',
                'customer' => 'Dinh Duc Huy',
                'service' => 'chuyen-nha',
                'provider' => 'Doi xe Quan 2',
                'execute_date' => '2026-04-05',
                'route' => 'Thu Duc -> Go Vap',
                'total' => 4600000,
                'status' => 'completed',
                'survey' => 'no',
                'note' => 'Da hoan tat, khach danh gia 5 sao.',
                'created_at' => '2026-04-04 15:00:00',
            ],
        ],
        'pricing' => [
            [
                'id' => 'PRI-001',
                'name' => 'Chuyen nha studio',
                'category' => 'co-ban',
                'unit' => 'chuyen',
                'base_price' => 1800000,
                'surcharge' => 250000,
                'status' => 'active',
                'description' => 'Phu hop can ho studio, 1 phong ngu, do dac gon.',
            ],
            [
                'id' => 'PRI-002',
                'name' => 'Chuyen nha gia dinh 2-3 phong',
                'category' => 'co-ban',
                'unit' => 'chuyen',
                'base_price' => 3200000,
                'surcharge' => 450000,
                'status' => 'active',
                'description' => 'Bao gom xe tai, boc xep va dong goi co ban.',
            ],
            [
                'id' => 'PRI-003',
                'name' => 'Chuyen van phong duoi 30 nhan su',
                'category' => 'van-phong',
                'unit' => 'du an',
                'base_price' => 7500000,
                'surcharge' => 1200000,
                'status' => 'active',
                'description' => 'Bao gom thao lap ban ghe, phan khu va tem nhan thung.',
            ],
            [
                'id' => 'PRI-004',
                'name' => 'Phu phi tang lau khong thang may',
                'category' => 'phu-phi',
                'unit' => 'tang',
                'base_price' => 120000,
                'surcharge' => 0,
                'status' => 'active',
                'description' => 'Ap dung tu tang 2 tro len cho tung khoi luong thuc te.',
            ],
        ],
    ];
}

function moving_admin_seed_if_missing($key) {
    $defaults = moving_admin_defaults();
    $fallback = $defaults[$key] ?? [];
    $filename = $key . '.json';
    $path = moving_admin_store_path($filename);

    if (!is_file($path)) {
        moving_admin_store_write($filename, $fallback);
        return $fallback;
    }

    $data = moving_admin_store_read($filename, $fallback);
    if (!is_array($data)) {
        moving_admin_store_write($filename, $fallback);
        return $fallback;
    }

    return $data;
}

function moving_admin_read_collection($key) {
    return moving_admin_seed_if_missing($key);
}

function moving_admin_write_collection($key, array $rows) {
    return moving_admin_store_write($key . '.json', array_values($rows));
}

function moving_admin_admin_accounts() {
    return [
        [
            'id' => 900201,
            'username' => 'admin01',
            'fullname' => 'Quan tri vien Chuyen Don',
            'email' => 'admin01@chuyendon.local',
            'phone' => '0901234569',
            'password_hash' => password_hash('Admin@123', PASSWORD_DEFAULT),
            'is_locked' => 0,
        ],
    ];
}

function moving_admin_require_login() {
    moving_admin_boot_session();
    if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
        header('Location: login.php');
        exit;
    }
}

function moving_admin_escape($value) {
    return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
}

function moving_admin_set_flash($type, $message) {
    moving_admin_boot_session();
    $_SESSION['moving_admin_flash'] = [
        'type' => (string) $type,
        'message' => (string) $message,
    ];
}

function moving_admin_get_flash() {
    moving_admin_boot_session();
    $flash = $_SESSION['moving_admin_flash'] ?? null;
    unset($_SESSION['moving_admin_flash']);
    return is_array($flash) ? $flash : null;
}

function moving_admin_find_by_id(array $rows, $id) {
    foreach ($rows as $index => $row) {
        if ((string) ($row['id'] ?? '') === (string) $id) {
            return [$index, $row];
        }
    }
    return [null, null];
}

function moving_admin_next_id($prefix, array $rows) {
    $max = 0;
    foreach ($rows as $row) {
        $id = (string) ($row['id'] ?? '');
        if (preg_match('/^' . preg_quote($prefix, '/') . '-(\d+)$/', $id, $matches)) {
            $max = max($max, (int) $matches[1]);
        }
    }
    return sprintf('%s-%03d', $prefix, $max + 1);
}

function moving_admin_money($value) {
    return number_format((float) $value, 0, ',', '.') . ' đ';
}

function moving_admin_user_role_label($value) {
    $map = ['admin' => 'Admin', 'provider' => 'Nhà cung cấp', 'customer' => 'Khách hàng'];
    return $map[$value] ?? 'Khác';
}

function moving_admin_user_status_label($value) {
    $map = ['active' => 'Đang hoạt động', 'pending' => 'Chờ duyệt', 'locked' => 'Tạm khóa'];
    return $map[$value] ?? 'Không rõ';
}

function moving_admin_order_status_label($value) {
    $map = [
        'new' => 'Mới tiếp nhận',
        'survey' => 'Chờ khảo sát',
        'processing' => 'Đang triển khai',
        'completed' => 'Hoàn tất',
        'cancelled' => 'Đã hủy',
    ];
    return $map[$value] ?? 'Không rõ';
}

function moving_admin_service_label($value) {
    $map = ['chuyen-nha' => 'Chuyển nhà', 'van-phong' => 'Chuyển văn phòng', 'kho-bai' => 'Chuyển kho bãi'];
    return $map[$value] ?? 'Khác';
}

function moving_admin_pricing_category_label($value) {
    $map = ['co-ban' => 'Cơ bản', 'van-phong' => 'Văn phòng', 'kho-bai' => 'Kho bãi', 'phu-phi' => 'Phụ phí'];
    return $map[$value] ?? 'Khác';
}

function moving_admin_pricing_status_label($value) {
    $map = ['active' => 'Đang áp dụng', 'inactive' => 'Tạm ẩn'];
    return $map[$value] ?? 'Không rõ';
}

function moving_admin_badge_class($type, $value) {
    if ($type === 'user-role') {
        return $value === 'admin' ? 'badge-info' : ($value === 'provider' ? 'badge-secondary' : 'badge-accent');
    }
    if ($type === 'user-status') {
        return $value === 'active' ? 'badge-success' : ($value === 'pending' ? 'badge-warning' : 'badge-danger');
    }
    if ($type === 'order-status') {
        if ($value === 'completed') {
            return 'badge-success';
        }
        if ($value === 'new' || $value === 'survey' || $value === 'processing') {
            return 'badge-warning';
        }
        return 'badge-danger';
    }
    if ($type === 'pricing-status') {
        return $value === 'active' ? 'badge-success' : 'badge-danger';
    }
    return 'badge-secondary';
}

function moving_admin_redirect($path) {
    header('Location: ' . $path);
    exit;
}
