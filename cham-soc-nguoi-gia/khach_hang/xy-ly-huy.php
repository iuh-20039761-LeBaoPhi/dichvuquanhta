<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadonsdt.php';

function krud_call(array $payload): array
{
    $url = 'https://api.dvqt.vn/krud/';
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        return ['success' => false, 'message' => 'Khong tao duoc payload API.'];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
    ]);

    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if (!is_string($raw) || $raw === '') {
        return ['success' => false, 'message' => $err !== '' ? $err : 'Khong nhan duoc phan hoi API.'];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['success' => false, 'message' => 'Phan hoi API khong hop le.'];
    }

    if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return ['success' => false, 'message' => (string)($decoded['error'] ?? $decoded['message'] ?? 'Cap nhat that bai.')];
    }

    return ['success' => true, 'message' => 'Huy don thanh cong.'];
}

function is_pending_status(string $status): bool
{
    $raw = strtolower(trim($status));
    return in_array($raw, ['', 'pending', 'cho_duyet', 'cho duyet', 'chờ duyệt', 'waiting'], true);
}

function huy_hoa_don(int $invoiceId, string $sessionPhone): array
{
    if ($invoiceId <= 0) {
        return ['success' => false, 'message' => 'Ma hoa don khong hop le.'];
    }

    $invoiceResult = getHoaDonBySessionSdt($sessionPhone, $invoiceId);
    $invoice = is_array($invoiceResult['row'] ?? null) ? $invoiceResult['row'] : null;
    if ($invoice === null) {
        return ['success' => false, 'message' => 'Khong tim thay hoa don hoac ban khong co quyen huy.'];
    }

    if (!is_pending_status((string)($invoice['trangthai'] ?? ''))) {
        return ['success' => false, 'message' => 'Chi co the huy hoa don dang cho duyet.'];
    }

    return krud_call([
        'action' => 'update',
        'table' => 'datlich_nguoigia',
        'id' => $invoiceId,
        'data' => [
            'trangthai' => 'huy_don',
        ],
    ]);
}

$user = session_user_require_customer('../login.html', 'khach_hang/danh-sach-hoa-don.php');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: danh-sach-hoa-don.php');
    exit;
}

$invoiceId = (int)($_POST['invoice_id'] ?? 0);
$sessionPhone = (string)($user['sodienthoai'] ?? '');
$result = huy_hoa_don($invoiceId, $sessionPhone);

$query = $result['success']
    ? '?ok=1&msg=' . rawurlencode((string)$result['message'])
    : '?ok=0&msg=' . rawurlencode((string)$result['message']);

header('Location: danh-sach-hoa-don.php' . $query);
exit;
