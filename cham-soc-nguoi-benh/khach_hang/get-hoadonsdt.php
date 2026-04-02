<?php
declare(strict_types=1);

/** Chuan hoa so dien thoai de so sanh. */
function normalize_sdt(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

/** Goi API list KRUD theo ten bang. */
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
            ]
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

/**
 * Ham dung chung: lay tat ca hoa don datlich_nguoibenh theo so dien thoai session.
 * Tra ve rows va row theo id (neu co).
 */
function getHoaDonBySessionSdt(string $sessionPhone, ?int $invoiceId = null): array
{
    $sessionPhoneNorm = normalize_sdt($sessionPhone);
    if ($sessionPhoneNorm === '') {
        return [
            'success' => false,
            'error' => 'Khong tim thay so dien thoai trong session.',
            'rows' => [],
            'row' => null,
        ];
    }

    $rows = list_table_rows('datlich_nguoibenh');
    $filtered = [];

    foreach ($rows as $row) {
        $phone = (string)($row['sodienthoai'] ?? '');
        if (normalize_sdt($phone) === $sessionPhoneNorm) {
            $filtered[] = $row;
        }
    }

    usort($filtered, static function (array $a, array $b): int {
        $idA = (int)($a['id'] ?? 0);
        $idB = (int)($b['id'] ?? 0);
        return $idB <=> $idA;
    });

    $row = null;
    if ($invoiceId !== null && $invoiceId > 0) {
        foreach ($filtered as $item) {
            if ((int)($item['id'] ?? 0) === $invoiceId) {
                $row = $item;
                break;
            }
        }
    }

    return [
        'success' => true,
        'error' => '',
        'rows' => $filtered,
        'row' => $row,
    ];
}

/** Lay thong tin nhan vien theo id_nhacungcap tu bang nhacungcap_nguoibenh. */
function getNhanVienById(int $nhanVienId): ?array
{
    if ($nhanVienId <= 0) {
        return null;
    }

    $rows = list_table_rows('nhacungcap_nguoibenh');
    foreach ($rows as $row) {
        if ((int)($row['id'] ?? 0) === $nhanVienId) {
            return $row;
        }
    }

    return null;
}
