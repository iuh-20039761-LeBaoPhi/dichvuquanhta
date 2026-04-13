<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    admin_api_json([
        'success' => false,
        'message' => 'Method không được hỗ trợ.',
    ], 405);
}

const GHN_KRUD_API_BASE = 'https://api.dvqt.vn';
const GHN_ORDERS_TABLE = 'giaohangnhanh_dat_lich';
const GHN_USERS_TABLE = 'nguoidung';
const GHN_PAGE_LIMIT = 200;
const GHN_MAX_PAGES = 10;

function ghn_stats_remote_post_json($url, array $payload)
{
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Không thể mã hoá payload gửi tới KRUD API.');
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => $json,
            CURLOPT_TIMEOUT => 15,
            // XAMPP local thường thiếu CA bundle nên cần fallback để gọi được KRUD API qua HTTPS.
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => 0,
        ]);

        $responseBody = curl_exec($ch);
        $error = curl_error($ch);
        $statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($responseBody === false) {
            throw new RuntimeException('Không thể kết nối KRUD API: ' . ($error ?: 'Lỗi không xác định.'));
        }

        if ($statusCode < 200 || $statusCode >= 300) {
            throw new RuntimeException('KRUD API trả về HTTP ' . $statusCode . '.');
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $json,
                'timeout' => 15,
                'ignore_errors' => true,
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        $responseBody = @file_get_contents($url, false, $context);
        if ($responseBody === false) {
            throw new RuntimeException('Không thể kết nối KRUD API.');
        }

        $statusCode = 0;
        if (!empty($http_response_header) && preg_match('/\s(\d{3})\s/', (string) $http_response_header[0], $matches)) {
            $statusCode = (int) $matches[1];
        }

        if ($statusCode < 200 || $statusCode >= 300) {
            throw new RuntimeException('KRUD API trả về HTTP ' . $statusCode . '.');
        }
    }

    $decoded = json_decode($responseBody, true);
    if (!is_array($decoded)) {
        throw new RuntimeException('KRUD API trả về dữ liệu không hợp lệ.');
    }

    if (!empty($decoded['error'])) {
        throw new RuntimeException((string) $decoded['error']);
    }

    return $decoded;
}

function ghn_stats_extract_rows($payload, $depth = 0)
{
    if ($depth > 4 || $payload === null) {
        return [];
    }

    if (is_array($payload)) {
        $isList = array_keys($payload) === range(0, count($payload) - 1);
        if ($isList) {
            return $payload;
        }
    }

    if (!is_array($payload)) {
        return [];
    }

    foreach (['data', 'items', 'rows', 'list', 'result', 'payload'] as $key) {
        if (!array_key_exists($key, $payload)) {
            continue;
        }

        $value = $payload[$key];
        if (is_array($value) && array_keys($value) === range(0, count($value) - 1)) {
            return $value;
        }

        $nested = ghn_stats_extract_rows($value, $depth + 1);
        if (!empty($nested)) {
            return $nested;
        }
    }

    return [];
}

function ghn_stats_list_all_rows($table)
{
    $rows = [];

    for ($page = 1; $page <= GHN_MAX_PAGES; $page++) {
        $response = ghn_stats_remote_post_json(GHN_KRUD_API_BASE . '/list/', [
            'table' => $table,
            'page' => $page,
            'limit' => GHN_PAGE_LIMIT,
            'sort' => ['id' => 'desc'],
        ]);

        $batch = ghn_stats_extract_rows($response);
        if (empty($batch)) {
            break;
        }

        $rows = array_merge($rows, $batch);
        if (count($batch) < GHN_PAGE_LIMIT) {
            break;
        }
    }

    return $rows;
}

function ghn_stats_normalize_text($value)
{
    return trim(preg_replace('/\s+/u', ' ', (string) ($value ?? '')));
}

function ghn_stats_to_number($value, $fallback = 0)
{
    return is_numeric($value) ? (float) $value : $fallback;
}

function ghn_stats_split_service_ids($value)
{
    $parts = array_map('ghn_stats_normalize_text', explode(',', (string) $value));
    return array_values(array_filter($parts, static function ($item) {
        return $item !== '';
    }));
}

function ghn_stats_is_customer_account(array $row)
{
    $serviceIds = ghn_stats_split_service_ids($row['id_dichvu'] ?? '');
    return count($serviceIds) === 0 || (count($serviceIds) === 1 && $serviceIds[0] === '0');
}

function ghn_stats_normalize_status($rawStatus)
{
    $normalized = mb_strtolower(ghn_stats_normalize_text($rawStatus), 'UTF-8');

    if (in_array($normalized, ['completed', 'hoan_tat', 'hoàn tất', 'success', 'delivered'], true)) {
        return 'completed';
    }

    if (in_array($normalized, ['shipping', 'dang_giao', 'đang giao', 'in_transit'], true)) {
        return 'shipping';
    }

    if (in_array($normalized, ['cancelled', 'canceled', 'da_huy', 'đã hủy'], true)) {
        return 'cancelled';
    }

    return 'pending';
}

function ghn_stats_get_service_meta($rawValue)
{
    $normalized = mb_strtolower(ghn_stats_normalize_text($rawValue), 'UTF-8');
    $map = [
        'standard' => ['key' => 'standard', 'label' => 'Tiêu chuẩn'],
        'giao_tieu_chuan' => ['key' => 'standard', 'label' => 'Tiêu chuẩn'],
        'gói tiêu chuẩn' => ['key' => 'standard', 'label' => 'Tiêu chuẩn'],
        'goi tieu chuan' => ['key' => 'standard', 'label' => 'Tiêu chuẩn'],
        'tieuchuan' => ['key' => 'standard', 'label' => 'Tiêu chuẩn'],
        'fast' => ['key' => 'fast', 'label' => 'Nhanh'],
        'giao_nhanh' => ['key' => 'fast', 'label' => 'Nhanh'],
        'gói nhanh' => ['key' => 'fast', 'label' => 'Nhanh'],
        'goi nhanh' => ['key' => 'fast', 'label' => 'Nhanh'],
        'nhanh' => ['key' => 'fast', 'label' => 'Nhanh'],
        'express' => ['key' => 'express', 'label' => 'Hỏa tốc'],
        'giao_hoa_toc' => ['key' => 'express', 'label' => 'Hỏa tốc'],
        'gói hỏa tốc' => ['key' => 'express', 'label' => 'Hỏa tốc'],
        'goi hoa toc' => ['key' => 'express', 'label' => 'Hỏa tốc'],
        'hoatoc' => ['key' => 'express', 'label' => 'Hỏa tốc'],
        'instant' => ['key' => 'instant', 'label' => 'Ngay lập tức'],
        'giao_ngay_lap_tuc' => ['key' => 'instant', 'label' => 'Ngay lập tức'],
        'giao hàng ngay lập tức' => ['key' => 'instant', 'label' => 'Ngay lập tức'],
        'giao ngay lập tức' => ['key' => 'instant', 'label' => 'Ngay lập tức'],
        'giao hang ngay lap tuc' => ['key' => 'instant', 'label' => 'Ngay lập tức'],
        'giao ngay lap tuc' => ['key' => 'instant', 'label' => 'Ngay lập tức'],
        'laptuc' => ['key' => 'instant', 'label' => 'Ngay lập tức'],
    ];

    return $map[$normalized] ?? [
        'key' => $normalized !== '' ? $normalized : 'khac',
        'label' => ghn_stats_normalize_text($rawValue) ?: 'Khác',
    ];
}

function ghn_stats_get_package_meta($rawValue)
{
    $normalized = mb_strtolower(ghn_stats_normalize_text($rawValue), 'UTF-8');
    $map = [
        'thuong' => ['key' => 'thuong', 'label' => 'Hàng thông thường'],
        'gia-tri-cao' => ['key' => 'gia-tri-cao', 'label' => 'Giá trị cao'],
        'de-vo' => ['key' => 'de-vo', 'label' => 'Dễ vỡ'],
        'mui-hoi' => ['key' => 'mui-hoi', 'label' => 'Có mùi hôi'],
        'chat-long' => ['key' => 'chat-long', 'label' => 'Chất lỏng'],
        'pin-lithium' => ['key' => 'pin-lithium', 'label' => 'Pin lithium'],
        'dong-lanh' => ['key' => 'dong-lanh', 'label' => 'Đông lạnh'],
        'cong-kenh' => ['key' => 'cong-kenh', 'label' => 'Cồng kềnh'],
    ];

    return $map[$normalized] ?? [
        'key' => $normalized !== '' ? $normalized : 'khac',
        'label' => ghn_stats_normalize_text($rawValue) ?: 'Khác',
    ];
}

function ghn_stats_parse_json_array($value)
{
    if (is_array($value)) {
        return $value;
    }

    if (!is_string($value) || trim($value) === '') {
        return [];
    }

    $decoded = json_decode($value, true);
    return is_array($decoded) ? $decoded : [];
}

function ghn_stats_parse_date($value)
{
    $raw = ghn_stats_normalize_text($value);
    if ($raw === '') {
        return null;
    }

    try {
        return new DateTimeImmutable($raw);
    } catch (Exception $exception) {
        return null;
    }
}

function ghn_stats_format_date_key(DateTimeImmutable $date)
{
    return $date->format('Y-m-d');
}

function ghn_stats_build_timeline_index()
{
    $result = [];
    $today = new DateTimeImmutable('today');

    for ($i = 6; $i >= 0; $i--) {
        $current = $today->modify('-' . $i . ' days');
        $result[ghn_stats_format_date_key($current)] = [
            'label' => $current->format('d/m'),
            'orders' => 0,
            'revenue' => 0,
        ];
    }

    return $result;
}

function ghn_stats_get_order_items(array $row)
{
    return ghn_stats_parse_json_array($row['mat_hang_json'] ?? $row['mat_hang'] ?? $row['items'] ?? []);
}

function ghn_stats_normalize_order(array $row)
{
    $items = ghn_stats_get_order_items($row);
    $primaryItem = [];
    foreach ($items as $item) {
        if (is_array($item) && ghn_stats_normalize_text($item['loai_hang'] ?? '') !== '') {
            $primaryItem = $item;
            break;
        }
    }
    if (empty($primaryItem) && !empty($items[0]) && is_array($items[0])) {
        $primaryItem = $items[0];
    }

    $serviceMeta = ghn_stats_get_service_meta($row['ten_dich_vu'] ?? $row['dich_vu'] ?? $row['loai_dich_vu'] ?? $row['service_type'] ?? '');
    $packageMeta = ghn_stats_get_package_meta($primaryItem['loai_hang'] ?? $row['loai_goi_hang'] ?? $row['loai_hang'] ?? '');

    return [
        'id' => ghn_stats_normalize_text($row['id'] ?? ''),
        'created_at' => $row['created_at'] ?? $row['created_date'] ?? $row['updated_at'] ?? '',
        'total_fee' => ghn_stats_to_number($row['tong_cuoc'] ?? $row['shipping_fee'] ?? $row['total_fee'] ?? 0),
        'status' => ghn_stats_normalize_status($row['trang_thai'] ?? $row['status'] ?? ''),
        'service_key' => $serviceMeta['key'],
        'service_label' => $serviceMeta['label'],
        'package_key' => $packageMeta['key'],
        'package_label' => $packageMeta['label'],
        'customer_id' => ghn_stats_normalize_text($row['customer_id'] ?? ''),
        'customer_username' => ghn_stats_normalize_text($row['customer_username'] ?? ''),
        'sender_name' => ghn_stats_normalize_text($row['ho_ten_nguoi_gui'] ?? $row['nguoi_gui_ho_ten'] ?? ''),
        'sender_phone' => ghn_stats_normalize_text($row['so_dien_thoai_nguoi_gui'] ?? $row['nguoi_gui_so_dien_thoai'] ?? ''),
    ];
}

function ghn_stats_normalize_customer(array $row)
{
    return [
        'id' => ghn_stats_normalize_text($row['id'] ?? ''),
        'username' => ghn_stats_normalize_text($row['username'] ?? $row['ten_dang_nhap'] ?? $row['sodienthoai'] ?? $row['so_dien_thoai'] ?? ''),
        'fullname' => ghn_stats_normalize_text($row['hovaten'] ?? $row['fullname'] ?? $row['ho_ten'] ?? ''),
        'phone' => ghn_stats_normalize_text($row['sodienthoai'] ?? $row['phone'] ?? $row['so_dien_thoai'] ?? ''),
    ];
}

function ghn_stats_phone_digits($value)
{
    return preg_replace('/\D+/', '', (string) $value);
}

function ghn_stats_build_customer_lookup(array $customers)
{
    $lookup = [
        'by_id' => [],
        'by_username' => [],
        'by_phone' => [],
    ];

    foreach ($customers as $customer) {
        if (!is_array($customer)) {
            continue;
        }

        if (($customer['id'] ?? '') !== '') {
            $lookup['by_id'][$customer['id']] = $customer;
        }

        if (($customer['username'] ?? '') !== '') {
            $lookup['by_username'][mb_strtolower($customer['username'], 'UTF-8')] = $customer;
        }

        $phone = ghn_stats_phone_digits($customer['phone'] ?? '');
        if ($phone !== '') {
            $lookup['by_phone'][$phone] = $customer;
        }
    }

    return $lookup;
}

function ghn_stats_increment_group(array &$bucket, $key, $label)
{
    if (!isset($bucket[$key])) {
        $bucket[$key] = [
            'key' => $key,
            'label' => $label,
            'total' => 0,
        ];
    }

    $bucket[$key]['total'] += 1;
}

function ghn_stats_build_payload(array $orderRows, array $customerRows)
{
    $orders = array_map('ghn_stats_normalize_order', $orderRows);
    $customers = array_map('ghn_stats_normalize_customer', $customerRows);
    $timelineIndex = ghn_stats_build_timeline_index();
    $serviceMap = [];
    $packageMap = [];
    $customerLookup = ghn_stats_build_customer_lookup($customers);
    $topUsersMap = [];
    $revenue = 0;
    $completedCount = 0;

    foreach ($orders as $order) {
        if (($order['status'] ?? '') === 'completed') {
            $revenue += $order['total_fee'];
            $completedCount += 1;
        }

        $orderDate = ghn_stats_parse_date($order['created_at'] ?? '');
        if ($orderDate instanceof DateTimeImmutable) {
            $dateKey = ghn_stats_format_date_key($orderDate);
            if (isset($timelineIndex[$dateKey])) {
                $timelineIndex[$dateKey]['orders'] += 1;
                if (($order['status'] ?? '') === 'completed') {
                    $timelineIndex[$dateKey]['revenue'] += $order['total_fee'];
                }
            }
        }

        ghn_stats_increment_group($serviceMap, $order['service_key'], $order['service_label']);
        ghn_stats_increment_group($packageMap, $order['package_key'], $order['package_label']);

        $phoneKey = ghn_stats_phone_digits($order['sender_phone'] ?? '');
        $customer = null;
        if (($order['customer_id'] ?? '') !== '' && isset($customerLookup['by_id'][$order['customer_id']])) {
            $customer = $customerLookup['by_id'][$order['customer_id']];
        } elseif (($order['customer_username'] ?? '') !== '') {
            $usernameKey = mb_strtolower($order['customer_username'], 'UTF-8');
            $customer = $customerLookup['by_username'][$usernameKey] ?? null;
        } elseif ($phoneKey !== '') {
            $customer = $customerLookup['by_phone'][$phoneKey] ?? null;
        }

        $userKey = $order['customer_id']
            ?: (($order['customer_username'] ?? '') !== '' ? mb_strtolower($order['customer_username'], 'UTF-8') : '')
            ?: $phoneKey
            ?: (($order['sender_name'] ?? '') !== '' ? mb_strtolower($order['sender_name'], 'UTF-8') : '')
            ?: ('guest-' . ($order['id'] ?? uniqid('', true)));

        if (!isset($topUsersMap[$userKey])) {
            $topUsersMap[$userKey] = [
                'id' => $customer['id'] ?? $order['customer_id'] ?? $userKey,
                'fullname' => $customer['fullname'] ?? $order['sender_name'] ?? 'Khách hàng',
                'username' => $customer['username'] ?? $order['customer_username'] ?? 'khach-le',
                'total_orders' => 0,
                'total_spent' => 0,
            ];
        }

        $topUsersMap[$userKey]['total_orders'] += 1;
        if (($order['status'] ?? '') === 'completed') {
            $topUsersMap[$userKey]['total_spent'] += $order['total_fee'];
        }
    }

    $timelineValues = array_values($timelineIndex);
    $serviceBreakdown = array_values($serviceMap);
    $packageBreakdown = array_values($packageMap);
    $topUsers = array_values($topUsersMap);

    usort($serviceBreakdown, static function ($a, $b) {
        return ($b['total'] ?? 0) <=> ($a['total'] ?? 0);
    });
    usort($packageBreakdown, static function ($a, $b) {
        return ($b['total'] ?? 0) <=> ($a['total'] ?? 0);
    });
    usort($topUsers, static function ($a, $b) {
        $ordersCompare = ($b['total_orders'] ?? 0) <=> ($a['total_orders'] ?? 0);
        if ($ordersCompare !== 0) {
            return $ordersCompare;
        }

        return ($b['total_spent'] ?? 0) <=> ($a['total_spent'] ?? 0);
    });

    return [
        'kpi' => [
            'revenue' => round($revenue),
            'total_orders' => count($orders),
            'total_users' => count($customers),
            'completed_rate' => count($orders) > 0 ? round(($completedCount / count($orders)) * 100, 1) : 0,
        ],
        'timeline' => [
            'labels' => array_map(static function ($item) {
                return $item['label'];
            }, $timelineValues),
            'orders' => array_map(static function ($item) {
                return $item['orders'];
            }, $timelineValues),
            'revenue' => array_map(static function ($item) {
                return round($item['revenue']);
            }, $timelineValues),
        ],
        'service_breakdown' => $serviceBreakdown,
        'package_breakdown' => $packageBreakdown,
        'top_users' => array_slice($topUsers, 0, 5),
    ];
}

try {
    $orderRows = ghn_stats_list_all_rows(GHN_ORDERS_TABLE);
    $allUsers = ghn_stats_list_all_rows(GHN_USERS_TABLE);
    $customerRows = array_values(array_filter($allUsers, 'ghn_stats_is_customer_account'));
    $stats = ghn_stats_build_payload($orderRows, $customerRows);

    admin_api_json([
        'success' => true,
        'source' => 'krud-api',
        'data' => $stats,
    ]);
} catch (Throwable $exception) {
    admin_api_json([
        'success' => false,
        'message' => $exception->getMessage() ?: 'Không thể tải thống kê từ KRUD API.',
    ], 502);
}
