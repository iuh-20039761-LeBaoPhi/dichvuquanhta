<?php
declare(strict_types=1);

/**
 * Ham duy nhat dung chung: lay toan bo hoa don bang datlich_mevabe,
 * va co the loc 1 hoa don theo id khi can cho trang chi tiet.
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
