<?php
declare(strict_types=1);

const DVQT_API_BASE = 'https://api.dvqt.vn';

function h($value): string
{
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

function starts_with(string $value, string $prefix): bool
{
    return strncmp($value, $prefix, strlen($prefix)) === 0;
}

function is_list_array(array $arr): bool
{
    if ($arr === []) {
        return true;
    }

    return array_keys($arr) === range(0, count($arr) - 1);
}

function redirect_to_login(string $returnPath = ''): void
{
    $location = '../login.html';
    if ($returnPath !== '') {
        $location .= '?redirect=' . rawurlencode($returnPath);
    }

    header('Location: ' . $location);
    exit;
}

function require_customer_session(string $returnPath = ''): array
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    $isLoggedIn = !empty($_SESSION['logged_in']);
    $hasUser = isset($_SESSION['user']) && is_array($_SESSION['user']);

    if (!$isLoggedIn || !$hasUser) {
        redirect_to_login($returnPath);
    }

    $user = $_SESSION['user'];
    $phone = trim((string)($user['sodienthoai'] ?? ($_SESSION['user_phone'] ?? '')));

    if ($phone === '') {
        redirect_to_login($returnPath);
    }

    return [$user, normalize_phone($phone)];
}

function dvqt_api_post(string $path, array $payload): array
{
    $url = rtrim(DVQT_API_BASE, '/') . '/' . ltrim($path, '/');
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);

    if ($body === false) {
        return [
            'success' => false,
            'error' => 'JSON encode failed'
        ];
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 15,
        ]);

        $raw = curl_exec($ch);
        $curlErr = curl_error($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false) {
            return [
                'success' => false,
                'error' => $curlErr !== '' ? $curlErr : 'Request failed'
            ];
        }

        if ($status < 200 || $status >= 300) {
            return [
                'success' => false,
                'error' => 'HTTP error ' . $status
            ];
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $body,
                'timeout' => 15,
            ]
        ]);

        $raw = @file_get_contents($url, false, $context);
        if ($raw === false) {
            return [
                'success' => false,
                'error' => 'Request failed'
            ];
        }
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [
            'success' => false,
            'error' => 'Invalid JSON response'
        ];
    }

    if (!empty($decoded['error'])) {
        return [
            'success' => false,
            'error' => (string)$decoded['error']
        ];
    }

    if (array_key_exists('success', $decoded) && $decoded['success'] === false) {
        return [
            'success' => false,
            'error' => (string)($decoded['message'] ?? 'API request failed')
        ];
    }

    return [
        'success' => true,
        'data' => $decoded
    ];
}

function dvqt_krud_list(array $payload): array
{
    return dvqt_api_post('/list/', $payload);
}

function normalize_krud_rows($response): array
{
    if (is_array($response) && is_list_array($response)) {
        return $response;
    }

    if (!is_array($response)) {
        return [];
    }

    if (isset($response['data']) && is_array($response['data'])) {
        return $response['data'];
    }

    if (isset($response['rows']) && is_array($response['rows'])) {
        return $response['rows'];
    }

    if (isset($response['items']) && is_array($response['items'])) {
        return $response['items'];
    }

    return [];
}

function normalize_phone($value): string
{
    return preg_replace('/\D+/', '', (string)$value) ?? '';
}

function format_money($value): string
{
    $number = (int)$value;
    return number_format($number, 0, ',', '.') . ' VNĐ';
}

function fetch_customer_invoices_by_phone(string $sessionPhone): array
{
    $sessionPhone = normalize_phone($sessionPhone);
    if ($sessionPhone === '') {
        return [[], 'Missing phone in session'];
    }

    $apiRes = dvqt_krud_list([
        'table' => 'datlich_mevabe'
    ]);

    if (empty($apiRes['success'])) {
        return [[], (string)($apiRes['error'] ?? 'Khong the tai du lieu hoa don')];
    }

    $rows = normalize_krud_rows($apiRes['data'] ?? []);

    $invoices = array_values(array_filter($rows, static function ($item) use ($sessionPhone) {
        if (!is_array($item)) {
            return false;
        }

        $rowPhone = normalize_phone(
            $item['sodienthoai']
                ?? ($item['so_dien_thoai']
                ?? ($item['dien_thoai']
                ?? ($item['phone'] ?? '')))
        );

        return $rowPhone !== '' && $rowPhone === $sessionPhone;
    }));

    usort($invoices, static function ($a, $b) {
        $aTime = strtotime((string)($a['created_date'] ?? ($a['created_at'] ?? '')));
        $bTime = strtotime((string)($b['created_date'] ?? ($b['created_at'] ?? '')));

        if ($aTime !== false && $bTime !== false && $aTime !== $bTime) {
            return $bTime <=> $aTime;
        }

        return (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0);
    });

    return [$invoices, ''];
}

function invoice_status_meta($status): array
{
    $key = strtolower(trim((string)$status));

    $map = [
        'cho_duyet' => ['class' => 'text-bg-warning', 'text' => 'Cho xu ly'],
        'pending' => ['class' => 'text-bg-warning', 'text' => 'Cho xu ly'],
        'da_nhan' => ['class' => 'text-bg-info', 'text' => 'Da nhan'],
        'da_duyet' => ['class' => 'text-bg-info', 'text' => 'Da nhan'],
        'accepted' => ['class' => 'text-bg-info', 'text' => 'Da nhan'],
        'dang_lam' => ['class' => 'text-bg-primary', 'text' => 'Dang lam'],
        'dang_thuc_hien' => ['class' => 'text-bg-primary', 'text' => 'Dang lam'],
        'in_progress' => ['class' => 'text-bg-primary', 'text' => 'Dang lam'],
        'hoan_thanh' => ['class' => 'text-bg-success', 'text' => 'Hoan thanh'],
        'completed' => ['class' => 'text-bg-success', 'text' => 'Hoan thanh'],
        'da_huy' => ['class' => 'text-bg-danger', 'text' => 'Da huy'],
        'cancelled' => ['class' => 'text-bg-danger', 'text' => 'Da huy'],
    ];

    return $map[$key] ?? ['class' => 'text-bg-secondary', 'text' => ($status !== null && $status !== '' ? (string)$status : 'N/A')];
}

function invoice_work_items(array $invoice): array
{
    $raw = trim((string)($invoice['cong_viec'] ?? ($invoice['noi_dung_cong_viec'] ?? '')));
    if ($raw === '') {
        return [];
    }

    $parts = preg_split('/\r\n|\r|\n|,|;/', $raw) ?: [];

    return array_values(array_filter(array_map(static function ($item) {
        return trim((string)$item);
    }, $parts), static function ($item) {
        return $item !== '';
    }));
}

function invoice_employee_data(array $invoice): array
{
    return [
        'ten' => (string)($invoice['nhan_vien_ten'] ?? ($invoice['ten_nhan_vien'] ?? ($invoice['employee_name'] ?? 'Chua phan cong'))),
        'so_dien_thoai' => (string)($invoice['nhan_vien_sdt'] ?? ($invoice['so_dien_thoai_nhan_vien'] ?? ($invoice['employee_phone'] ?? 'N/A'))),
        'email' => (string)($invoice['nhan_vien_email'] ?? ($invoice['email_nhan_vien'] ?? ($invoice['employee_email'] ?? 'N/A'))),
        'danh_gia' => (string)($invoice['nhan_vien_danh_gia'] ?? ($invoice['danh_gia_nhan_vien'] ?? ($invoice['employee_rating'] ?? '4.50'))),
        'kinh_nghiem' => (string)($invoice['nhan_vien_kinh_nghiem'] ?? ($invoice['kinh_nghiem_nhan_vien'] ?? ($invoice['employee_experience'] ?? '3 nam kinh nghiem'))),
        'avatar' => (string)($invoice['nhan_vien_avatar'] ?? ($invoice['anh_nhan_vien'] ?? ($invoice['employee_avatar'] ?? '../assets/logomvb.png'))),
    ];
}

function invoice_media_items(array $invoice): array
{
    $fields = [
        $invoice['hinh_anh'] ?? null,
        $invoice['hinhanh'] ?? null,
        $invoice['anh'] ?? null,
        $invoice['images'] ?? null,
        $invoice['image_urls'] ?? null,
        $invoice['video_urls'] ?? null,
        $invoice['media_urls'] ?? null,
        $invoice['duong_dan_file'] ?? null,
    ];

    $items = [];

    foreach ($fields as $field) {
        if ($field === null || $field === '') {
            continue;
        }

        if (is_array($field)) {
            foreach ($field as $item) {
                $item = trim((string)$item);
                if ($item !== '') {
                    $items[] = $item;
                }
            }
            continue;
        }

        $parts = preg_split('/\r\n|\r|\n|,|;/', (string)$field) ?: [];
        foreach ($parts as $part) {
            $part = trim((string)$part);
            if ($part !== '') {
                $items[] = $part;
            }
        }
    }

    $seen = [];
    $unique = [];
    foreach ($items as $item) {
        $key = strtolower($item);
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        $unique[] = $item;
    }

    return $unique;
}

function invoice_asset_url(string $path): string
{
    $path = trim($path);
    if ($path === '') {
        return '';
    }

    if (preg_match('/^https?:\/\//i', $path)) {
        return $path;
    }

    if (starts_with($path, '../') || starts_with($path, './') || starts_with($path, '/')) {
        return $path;
    }

    return '../' . ltrim($path, '/');
}
