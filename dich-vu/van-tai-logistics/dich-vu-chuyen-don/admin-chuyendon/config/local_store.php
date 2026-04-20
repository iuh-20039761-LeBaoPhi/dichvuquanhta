<?php

function moving_admin_store_dir() {
    $dir = __DIR__ . '/../data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    return $dir;
}

function moving_admin_store_path($name) {
    $safeName = preg_replace('/[^a-z0-9._-]+/i', '-', (string) $name);
    return moving_admin_store_dir() . '/' . trim($safeName ?: 'store', '-');
}

function moving_admin_store_read($name, $fallback = []) {
    $path = moving_admin_store_path($name);
    if (!is_file($path)) {
        return $fallback;
    }

    $raw = @file_get_contents($path);
    if ($raw === false || trim($raw) === '') {
        return $fallback;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function moving_admin_store_write($name, $data) {
    $path = moving_admin_store_path($name);
    $encoded = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    if ($encoded === false) {
        return false;
    }

    return @file_put_contents($path, $encoded, LOCK_EX) !== false;
}
