<?php
declare(strict_types=1);

function lower_text(string $value): string
{
    $trimmed = trim($value);
    return function_exists('mb_strtolower') ? mb_strtolower($trimmed, 'UTF-8') : strtolower($trimmed);
}

function normalize_phone_digits(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

function invoice_has_supplier_assignment(array $invoice): bool
{
    foreach (['tenncc', 'sdtncc', 'emailncc', 'diachincc', 'ngaynhan'] as $key) {
        if (trim((string)($invoice[$key] ?? '')) !== '') {
            return true;
        }
    }

    return false;
}

function invoice_assigned_to_employee(array $invoice, array $employee = []): bool
{
    $supplierPhone = normalize_phone_digits((string)($invoice['sdtncc'] ?? ''));

    $employeePhone = normalize_phone_digits((string)($employee['sodienthoai'] ?? ''));
    if ($supplierPhone !== '' && $employeePhone !== '' && $supplierPhone === $employeePhone) {
        return true;
    }

    $supplierName = lower_text((string)($invoice['tenncc'] ?? ''));
    $employeeName = lower_text((string)($employee['ten'] ?? ''));
    return $supplierName !== '' && $employeeName !== '' && $supplierName === $employeeName;
}

/**
 * Ham duy nhat dung chung: lay toan bo hoa don bang datlich_mevabe,
 * tra ve du lieu cot truc tiep tu API va co the loc 1 hoa don theo id.
 */
function getHoaDonData(?int $invoiceId = null): array
{
    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => 'datlich_mevabe'], JSON_UNESCAPED_UNICODE);

    if ($payload === false) {
        return [
            'success' => false,
            'error' => 'Khong tao duoc payload API.',
            'rows' => [],
            'row' => null,
        ];
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
        $curlErr = curl_error($ch);
        $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!is_string($raw) || $raw === '') {
            return [
                'success' => false,
                'error' => $curlErr !== '' ? ('Loi curl: ' . $curlErr) : 'Khong nhan duoc du lieu API.',
                'rows' => [],
                'row' => null,
            ];
        }

        if ($httpCode >= 400) {
            return [
                'success' => false,
                'error' => 'API tra ve HTTP ' . $httpCode . '.',
                'rows' => [],
                'row' => null,
            ];
        }
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 20,
            ]
        ]);

        $raw = @file_get_contents($url, false, $context);
        if (!is_string($raw) || $raw === '') {
            return [
                'success' => false,
                'error' => 'Khong ket noi duoc API list.',
                'rows' => [],
                'row' => null,
            ];
        }
    }

    $decoded = json_decode($raw, true);

    if (!is_array($decoded)) {
        return [
            'success' => false,
            'error' => 'Du lieu API khong hop le.',
            'rows' => [],
            'row' => null,
        ];
    }

    if (!empty($decoded['error'])) {
        return [
            'success' => false,
            'error' => (string)$decoded['error'],
            'rows' => [],
            'row' => null,
        ];
    }

    if (isset($decoded['success']) && $decoded['success'] === false) {
        return [
            'success' => false,
            'error' => (string)($decoded['message'] ?? 'API tra ve that bai.'),
            'rows' => [],
            'row' => null,
        ];
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
        $rows = [];
    }

    $rows = array_values(array_filter($rows, static fn($item): bool => is_array($item)));

    usort($rows, static function (array $a, array $b): int {
        $idA = (int)($a['id'] ?? 0);
        $idB = (int)($b['id'] ?? 0);
        return $idB <=> $idA;
    });

    $row = null;
    if ($invoiceId !== null && $invoiceId > 0) {
        foreach ($rows as $item) {
            $id = (int)($item['id'] ?? 0);
            if ($id === $invoiceId) {
                $row = $item;
                break;
            }
        }
    }

    return [
        'success' => true,
        'error' => '',
        'rows' => $rows,
        'row' => $row,
    ];
}

/** Kiem tra trang thai tai khoan nhan vien da duyet hay chua. */
function employee_account_is_approved(string $status): bool
{
    $raw = strtolower(trim($status));
    return in_array($raw, ['active', 'approved', 'da_duyet', 'da duyet', 'đã duyệt'], true);
}

/** Kiem tra hoa don da o trang thai huy hay chua. */
function invoice_is_cancelled(array $invoice): bool
{
    $raw = strtolower(trim((string)($invoice['trangthai'] ?? '')));
    return in_array($raw, ['huy_don', 'huy don', 'huy', 'da_huy', 'da huy', 'đã hủy', 'cancelled', 'canceled'], true);
}

/** Hoa don hop le voi nhan vien: chua ai nhan hoac do chinh nhan vien da nhan. */
function invoice_in_employee_scope(array $invoice, int $employeeId, array $employee = []): bool
{
    if ($employeeId <= 0) {
        return false;
    }

    if (invoice_is_cancelled($invoice)) {
        return false;
    }

    if (!invoice_has_supplier_assignment($invoice)) {
        return true;
    }

    return invoice_assigned_to_employee($invoice, $employee);
}

/** Loc danh sach hoa don theo pham vi duoc xem cua nhan vien. */
function filter_invoices_for_employee(array $rows, int $employeeId, array $employee = []): array
{
    return array_values(array_filter($rows, static function ($item) use ($employeeId, $employee): bool {
        return is_array($item) && invoice_in_employee_scope($item, $employeeId, $employee);
    }));
}
