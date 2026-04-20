<?php
declare(strict_types=1);

function normalize_sdt(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

function list_table_rows(string $table): array
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

    return array_values(array_filter($rows, static fn($item): bool => is_array($item)));
}

function krud_update_row(string $table, int $id, array $data): bool
{
    if ($id <= 0 || !$data) {
        return false;
    }

    $url = 'https://api.dvqt.vn/krud/';
    $payload = json_encode([
        'action' => 'update',
        'table' => $table,
        'id' => $id,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE);

    if ($payload === false) {
        return false;
    }

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

    if (!is_string($raw) || $raw === '') {
        return false;
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return false;
    }

    return empty($decoded['error']) && (!isset($decoded['success']) || $decoded['success'] !== false);
}

/**
 * Đồng bộ avatar khách hàng vào các đơn hàng
 */
function sync_customer_avatar_to_orders(string $sessionPhone, string $sessionAvatar): void
{
    $phoneNorm = normalize_sdt($sessionPhone);
    if ($phoneNorm === '') {
        return;
    }

    $avatar = trim($sessionAvatar);
    // Đổi bảng từ datlich_mevabe sang datlich_taixe
    $rows = list_table_rows('datlich_taixe');

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        if (normalize_sdt((string)($row['sdtkhachhang'] ?? '')) !== $phoneNorm) {
            continue;
        }

        $id = (int)($row['id'] ?? 0);
        if ($id <= 0) {
            continue;
        }

        if (trim((string)($row['avatar_khachhang'] ?? '')) === $avatar) {
            continue;
        }

        krud_update_row('datlich_taixe', $id, ['avatar_khachhang' => $avatar]);
    }
}

/**
 * Lấy đơn hàng theo số điện thoại của khách hàng
 * @param string $sessionPhone Số điện thoại khách hàng
 * @param int|null $invoiceId ID đơn hàng cụ thể (nếu muốn lấy 1 đơn)
 * @return array ['success' => bool, 'error' => string, 'rows' => array, 'row' => array|null]
 */
function getDonHangBySessionSdt(string $sessionPhone, ?int $invoiceId = null): array
{
    $sessionPhoneNorm = normalize_sdt($sessionPhone);
    if ($sessionPhoneNorm === '') {
        return [
            'success' => false,
            'error' => 'Không tìm thấy số điện thoại trong session.',
            'rows' => [],
            'row' => null,
        ];
    }

    // Đổi bảng từ datlich_mevabe sang datlich_taixe
    $rows = list_table_rows('datlich_taixe');
    $filtered = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        if (normalize_sdt((string)($row['sdtkhachhang'] ?? '')) === $sessionPhoneNorm) {
            $filtered[] = $row;
        }
    }

    // Sắp xếp theo ID giảm dần (đơn mới nhất lên đầu)
    usort($filtered, static function (array $a, array $b): int {
        return ((int)($b['id'] ?? 0)) <=> ((int)($a['id'] ?? 0));
    });

    $matchedRow = null;
    if ($invoiceId !== null && $invoiceId > 0) {
        foreach ($filtered as $item) {
            if ((int)($item['id'] ?? 0) === $invoiceId) {
                $matchedRow = $item;
                break;
            }
        }
    }

    return [
        'success' => true,
        'error' => '',
        'rows' => $filtered,
        'row' => $matchedRow,
    ];
}

if (!function_exists('taixe_refresh_invoice_row')) {
    function taixe_refresh_invoice_row(array $row): array
    {
        return $row;
    }
}

if (!function_exists('taixe_refresh_invoice_rows')) {
    function taixe_refresh_invoice_rows(array $rows): array
    {
        return array_map('taixe_refresh_invoice_row', $rows);
    }
}

if (!function_exists('taixe_can_cancel_invoice')) {
    function taixe_can_cancel_invoice(array $invoice): array
    {
        $status = strtolower(trim((string)($invoice['trangthai'] ?? '')));
        $hasDriver = !empty($invoice['id_taixe']) || !empty($invoice['ten_taixe']);
        
        if ($hasDriver) {
            return ['ok' => false, 'message' => 'Đơn hàng đã có tài xế nhận, không thể hủy'];
        }
        
        if (strpos($status, 'hủy') !== false || strpos($status, 'hoàn thành') !== false) {
            return ['ok' => false, 'message' => 'Đơn hàng đã hủy hoặc hoàn thành'];
        }
        
        return ['ok' => true, 'message' => ''];
    }
}

if (!function_exists('taixe_can_customer_review')) {
    function taixe_can_customer_review(array $invoice): array
    {
        $status = strtolower(trim((string)($invoice['trangthai'] ?? '')));
        
        if (strpos($status, 'hoàn thành') === false) {
            return ['ok' => false, 'message' => 'Chỉ có thể đánh giá sau khi đơn hàng hoàn thành'];
        }
        
        if (!empty($invoice['danhgia_khachhang'])) {
            return ['ok' => false, 'message' => 'Bạn đã gửi đánh giá cho đơn hàng này'];
        }
        
        return ['ok' => true, 'message' => ''];
    }
}
?>