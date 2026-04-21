<?php
declare(strict_types=1);

/**
 * Gọi API list để lấy danh sách bản ghi theo bảng.
 * Trả về mảng row đã được chuẩn hóa.
 */
function kh_list_table_rows(string $table): array
{
    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => $table], JSON_UNESCAPED_UNICODE);
    if ($payload === false) {
        return [];
    }

    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 20,
            ],
        ]);
        $raw = @file_get_contents($url, false, $context);
    }

    if (!is_string($raw) || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || !empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return [];
    }

    $rows = $decoded;
    if (isset($decoded['data']) && is_array($decoded['data'])) {
        $rows = $decoded['data'];
    } elseif (isset($decoded['rows']) && is_array($decoded['rows'])) {
        $rows = $decoded['rows'];
    } elseif (isset($decoded['items']) && is_array($decoded['items'])) {
        $rows = $decoded['items'];
    }

    if (!is_array($rows)) {
        return [];
    }

    return array_values(array_filter($rows, static fn($row): bool => is_array($row)));
}

/**
 * Hàm dùng chung: lấy thông tin khách hàng từ session id.
 * Trả về bộ kết quả gồm success, error, row và data đã chuẩn hóa để render.
 * 
 * @param int|string $sessionCustomerId ID khách hàng từ session
 * @return array ['success' => bool, 'error' => string, 'row' => array|null, 'data' => array]
 */
function getKhachHangBySessionId($sessionCustomerId): array
{
    $emptyData = [
        'id' => 0,
        'full_name' => '',
        'email' => '',
        'phone' => '',
        'password' => '',
        'address' => '',
        'birth_date' => '',
        'created_date' => '',
        'avatar_path' => '',
        'cccd_front_path' => '',
        'cccd_back_path' => '',
        'avatar_url' => '../assets/logo_main.png',
        'cccd_front_url' => '../assets/logo_main.png',
        'cccd_back_url' => '../assets/logo_main.png',
        'status_raw' => 'active',
        'status_text' => 'Đang hoạt động',
        'status_class' => '',
        'full_name_text' => 'Khách hàng',
        'email_text' => '-',
        'phone_text' => '-',
        'address_text' => '-',
        'birth_date_text' => '-',
        'created_date_text' => '-',
    ];

    $customerId = (int)$sessionCustomerId;
    if ($customerId <= 0) {
        return [
            'success' => false,
            'error' => 'Không tìm thấy id khách hàng trong session.',
            'row' => null,
            'data' => $emptyData,
        ];
    }

    $rows = kh_list_table_rows('khachhang');
    $customer = null;
    foreach ($rows as $row) {
        if ((int)($row['id'] ?? 0) === $customerId) {
            $customer = $row;
            break;
        }
    }

    if (!is_array($customer) || $customer === []) {
        return [
            'success' => false,
            'error' => 'Không tìm thấy dữ liệu khách hàng trong bảng khachhang.',
            'row' => null,
            'data' => $emptyData,
        ];
    }

    $pick = static function (array $row, array $keys, string $fallback = ''): string {
        foreach ($keys as $key) {
            $value = trim((string)($row[$key] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }
        return $fallback;
    };

    $assetUrl = static function (string $path): string {
        $value = trim(str_replace('\\', '/', $path));
        if ($value === '') {
            return '../assets/logo_main.png';
        }

        if (preg_match('/^(https?:)?\/\//i', $value) || strpos($value, 'data:image/') === 0) {
            return $value;
        }

        if (strpos($value, '../') === 0 || strpos($value, './') === 0) {
            return $value;
        }

        return '../' . ltrim($value, '/');
    };

    $statusRaw = strtolower(trim((string)($customer['trangthai'] ?? 'active')));

    $statusMap = [
        'active' => ['text' => 'Đang hoạt động', 'class' => ''],
        'pending' => ['text' => 'Đang chờ duyệt', 'class' => ' pending'],
        'inactive' => ['text' => 'Không hoạt động', 'class' => ' inactive'],
        'blocked' => ['text' => 'Đã khóa', 'class' => ' blocked'],
    ];
    
    $statusInfo = $statusMap[$statusRaw] ?? $statusMap['active'];

    $data = [
        'id' => (int)($customer['id'] ?? $customerId),
        'full_name' => $pick($customer, ['hovaten', 'ten']),
        'email' => $pick($customer, ['email']),
        'phone' => $pick($customer, ['sodienthoai', 'so_dien_thoai']),
        'password' => $pick($customer, ['matkhau', 'mat_khau']),
        'address' => $pick($customer, ['diachi', 'dia_chi']),
        'birth_date' => $pick($customer, ['ngaysinh', 'ngay_sinh']),
        'created_date' => $pick($customer, ['created_date', 'created_at']),
        'avatar_path' => $pick($customer, ['anh_dai_dien']),
        'cccd_front_path' => $pick($customer, ['cccd_mat_truoc']),
        'cccd_back_path' => $pick($customer, ['cccd_mat_sau']),
        'status_raw' => $statusRaw,
        'status_text' => $statusInfo['text'],
        'status_class' => $statusInfo['class'],
    ];

    $data['avatar_url'] = $assetUrl($data['avatar_path']);
    $data['cccd_front_url'] = $assetUrl($data['cccd_front_path']);
    $data['cccd_back_url'] = $assetUrl($data['cccd_back_path']);
    $data['full_name_text'] = $data['full_name'] !== '' ? $data['full_name'] : 'Khách hàng';
    $data['email_text'] = $data['email'] !== '' ? $data['email'] : '-';
    $data['phone_text'] = $data['phone'] !== '' ? $data['phone'] : '-';
    $data['address_text'] = $data['address'] !== '' ? $data['address'] : '-';
    $data['birth_date_text'] = $data['birth_date'] !== '' ? $data['birth_date'] : '-';
    $data['created_date_text'] = $data['created_date'] !== '' ? $data['created_date'] : '-';

    return [
        'success' => true,
        'error' => '',
        'row' => $customer,
        'data' => $data,
    ];
}
?>