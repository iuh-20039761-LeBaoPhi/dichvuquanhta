<?php

if (!function_exists('chuyen_don_load_env')) {
    function chuyen_don_load_env(string $projectRoot): void
    {
        static $loaded = false;
        if ($loaded) {
            return;
        }

        $envFile = rtrim($projectRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . '.env';
        if (!is_file($envFile)) {
            $loaded = true;
            return;
        }

        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (!is_array($lines)) {
            $loaded = true;
            return;
        }

        foreach ($lines as $line) {
            $line = trim((string) $line);
            if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            if ($key === '') {
                continue;
            }

            $_ENV[$key] = $value;
        }

        $loaded = true;
    }
}

if (!function_exists('chuyen_don_get_db_config')) {
    function chuyen_don_get_db_config(): array
    {
        static $config = null;
        if (is_array($config)) {
            return $config;
        }

        $projectRoot = dirname(__DIR__);
        chuyen_don_load_env($projectRoot);

        $config = [
            'host' => $_ENV['DB_HOST'] ?? 'localhost',
            'user' => $_ENV['DB_USER'] ?? 'root',
            'pass' => $_ENV['DB_PASS'] ?? '',
            'name' => $_ENV['DB_NAME'] ?? 'dich_vu_chuyen_don',
            'port' => (int) ($_ENV['DB_PORT'] ?? 3306),
        ];

        return $config;
    }
}

if (!function_exists('chuyen_don_get_connection')) {
    function chuyen_don_get_connection(): mysqli
    {
        static $conn = null;
        if ($conn instanceof mysqli) {
            return $conn;
        }

        $config = chuyen_don_get_db_config();
        mysqli_report(MYSQLI_REPORT_OFF);

        $conn = @new mysqli(
            $config['host'],
            $config['user'],
            $config['pass'],
            '',
            $config['port']
        );

        if ($conn->connect_error) {
            throw new RuntimeException('Không thể kết nối MySQL: ' . $conn->connect_error);
        }

        $dbNameEscaped = str_replace('`', '``', (string) $config['name']);
        if (!$conn->query("CREATE DATABASE IF NOT EXISTS `{$dbNameEscaped}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
            throw new RuntimeException('Không thể khởi tạo database: ' . $conn->error);
        }

        if (!$conn->select_db($config['name'])) {
            throw new RuntimeException('Không thể chọn database: ' . $conn->error);
        }

        if (!$conn->set_charset('utf8mb4')) {
            throw new RuntimeException('Không thể thiết lập charset utf8mb4.');
        }

        return $conn;
    }
}
