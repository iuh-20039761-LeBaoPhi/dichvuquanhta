<?php
declare(strict_types=1);

function nv_list_table_rows(string $table): array
{
    $payload = json_encode(['table' => $table], JSON_UNESCAPED_UNICODE);
    if ($payload === false) {
        return [];
    }

    $url = 'https://api.dvqt.vn/list/';

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

    $rows = $decoded['data'] ?? $decoded['rows'] ?? $decoded['items'] ?? $decoded;

    if (!is_array($rows)) {
        return [];
    }

    return array_values(array_filter($rows, static fn($row): bool => is_array($row)));
}

function getNhanVienBySessionId($sessionEmployeeId): array
{
    $employeeId = (int)$sessionEmployeeId;
    if ($employeeId <= 0) {
        return ['success' => false, 'error' => 'Khong tim thay id nhan vien trong session.', 'row' => []];
    }

    $rows = nv_list_table_rows('nhacungcap_mevabe');
    foreach ($rows as $row) {
        if ((int)($row['id'] ?? 0) === $employeeId) {
            return ['success' => true, 'error' => '', 'row' => $row];
        }
    }

    return ['success' => false, 'error' => 'Khong tim thay du lieu nhan vien trong bang nhacungcap_mevabe.', 'row' => []];
}
