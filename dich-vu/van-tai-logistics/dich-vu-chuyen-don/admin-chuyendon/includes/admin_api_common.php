<?php

function moving_admin_api_normalize_rows($decoded) {
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

    return array_values(array_filter($rows, static function ($item) {
        return is_array($item);
    }));
}

function moving_admin_api_list_table($table) {
    $payload = json_encode(['table' => (string) $table], JSON_UNESCAPED_UNICODE);
    if ($payload === false) {
        return ['rows' => [], 'error' => 'Khong tao duoc payload API.'];
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
        $err = curl_error($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
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
        return [
            'rows' => [],
            'error' => (string) ($decoded['error'] ?? $decoded['message'] ?? 'Lay du lieu that bai.'),
        ];
    }

    return [
        'rows' => moving_admin_api_normalize_rows($decoded),
        'error' => '',
    ];
}

function moving_admin_shared_login_url() {
    return '../../../../../public/admin-login.html';
}

function moving_admin_clear_shared_admin_cookies() {
    setcookie('admin_e', '', time() - 3600, '/');
    setcookie('admin_p', '', time() - 3600, '/');
}

function moving_admin_find_shared_admin_account($email, $password) {
    $normalizedEmail = strtolower(trim((string) $email));
    $password = (string) $password;
    if ($normalizedEmail === '' || $password === '') {
        return null;
    }

    $apiResult = moving_admin_api_list_table('admin');
    if ((string) ($apiResult['error'] ?? '') !== '') {
        return null;
    }

    foreach (($apiResult['rows'] ?? []) as $row) {
        $rowEmail = strtolower(trim((string) ($row['email'] ?? '')));
        $rowPassword = (string) ($row['matkhau'] ?? $row['password'] ?? '');
        if ($rowEmail !== '' && $rowEmail === $normalizedEmail && hash_equals($rowPassword, $password)) {
            return $row;
        }
    }

    return null;
}
