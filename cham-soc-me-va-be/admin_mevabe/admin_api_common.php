<?php
declare(strict_types=1);

if (!function_exists('admin_api_normalize_rows')) {
    function admin_api_normalize_rows($decoded): array
    {
        if (!is_array($decoded)) {
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
}

if (!function_exists('admin_api_list_table')) {
    function admin_api_list_table(string $table): array
    {
        $url = 'https://api.dvqt.vn/list/';
        $payload = json_encode(['table' => $table], JSON_UNESCAPED_UNICODE);

        if ($payload === false) {
            return ['rows' => [], 'error' => 'Khong tao duoc payload API.'];
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
            $err = curl_error($ch);
            $httpCode = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if (!is_string($raw) || $raw === '') {
                return ['rows' => [], 'error' => $err !== '' ? $err : 'Khong nhan duoc du lieu API.'];
            }

            if ($httpCode >= 400) {
                return ['rows' => [], 'error' => 'API tra ve HTTP ' . $httpCode . '.'];
            }
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
            if (!is_string($raw) || $raw === '') {
                return ['rows' => [], 'error' => 'Khong ket noi duoc API list.'];
            }
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['rows' => [], 'error' => 'Du lieu API khong hop le.'];
        }

        if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
            return ['rows' => [], 'error' => (string)($decoded['error'] ?? $decoded['message'] ?? 'Lay du lieu that bai.')];
        }

        return [
            'rows' => admin_api_normalize_rows($decoded),
            'error' => '',
        ];
    }
}

if (!function_exists('admin_api_update_table')) {
    function admin_api_update_table(string $table, int $id, array $data): array
    {
        if ($id <= 0) {
            return ['success' => false, 'message' => 'ID khong hop le.'];
        }

        $url = 'https://api.dvqt.vn/krud/';
        $payload = json_encode([
            'action' => 'update',
            'table' => $table,
            'id' => $id,
            'data' => $data,
        ], JSON_UNESCAPED_UNICODE);

        if ($payload === false) {
            return ['success' => false, 'message' => 'Khong tao duoc payload API.'];
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

        return ['success' => true, 'message' => 'Cap nhat thanh cong.'];
    }
}
