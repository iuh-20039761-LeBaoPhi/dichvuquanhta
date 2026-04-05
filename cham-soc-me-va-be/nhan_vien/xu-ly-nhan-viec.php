<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadon.php';

/** Ham goi KRUD API chung. */
function krudCall(array $payload): array
{
    $url = 'https://api.dvqt.vn/krud/';
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        return ['success' => false, 'message' => 'Khong tao duoc payload.'];
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

    return ['success' => true, 'message' => 'Nhan viec thanh cong.'];
}

/** Ham nhan viec: cap nhat id_nhacungcap va trang thai hoa don. */
function nhanViecHoaDon(int $invoiceId, int $nhanVienId, array $sessionUser = []): array
{
    if ($invoiceId <= 0 || $nhanVienId <= 0) {
        return ['success' => false, 'message' => 'Du lieu nhan viec khong hop le.'];
    }

    $invoiceResult = getHoaDonData($invoiceId);
    $invoice = is_array($invoiceResult['row'] ?? null) ? $invoiceResult['row'] : null;

    if (!is_array($invoice)) {
        return ['success' => false, 'message' => 'Khong tim thay hoa don can nhan viec.'];
    }

    if (!invoice_in_employee_scope($invoice, $nhanVienId, $sessionUser)) {
        return ['success' => false, 'message' => 'Hoa don nay da duoc nhan boi nhan vien khac.'];
    }

    if (invoice_has_supplier_assignment($invoice) && invoice_assigned_to_employee($invoice, $sessionUser)) {
        return ['success' => true, 'message' => 'Hoa don nay ban da nhan truoc do.'];
    }

    $statusKey = 'trangthai';
    foreach (['trangthai', 'trang_thai', 'status'] as $candidate) {
        if (array_key_exists($candidate, $invoice)) {
            $statusKey = $candidate;
            break;
        }
    }

    return krudCall([
        'action' => 'update',
        'table' => 'datlich_mevabe',
        'id' => $invoiceId,
        'data' => [
            'id_nhacungcap' => $nhanVienId,
            $statusKey => 'đã nhận',
        ],
    ]);
}

$user = session_user_require_employee('../login.html', 'nhan_vien/danh-sach-hoa-don.php');

if (!employee_account_is_approved((string)($user['trangthai'] ?? ''))) {
    header('Location: danh-sach-hoa-don.php?ok=0&msg=' . rawurlencode('Tai khoan cua ban dang cho duyet'));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: danh-sach-hoa-don.php');
    exit;
}

$invoiceId = (int)($_POST['invoice_id'] ?? 0);
$employeeId = (int)($user['id'] ?? 0);
$result = nhanViecHoaDon($invoiceId, $employeeId, $user);

$query = $result['success']
    ? '?ok=1&msg=' . rawurlencode($result['message'])
    : '?ok=0&msg=' . rawurlencode($result['message']);

header('Location: danh-sach-hoa-don.php' . $query);
exit;
