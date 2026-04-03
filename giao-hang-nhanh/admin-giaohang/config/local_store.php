<?php

function admin_local_store_dir() {
    $dir = __DIR__ . '/../data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    return $dir;
}

function admin_local_store_path($name) {
    $safeName = preg_replace('/[^a-z0-9._-]+/i', '-', (string) $name);
    return admin_local_store_dir() . '/' . trim($safeName ?: 'store', '-');
}

function admin_local_store_read($name, $fallback = []) {
    $path = admin_local_store_path($name);
    if (!is_file($path)) {
        return $fallback;
    }

    $raw = @file_get_contents($path);
    if ($raw === false || $raw === '') {
        return $fallback;
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $fallback;
}

function admin_local_store_write($name, $data) {
    $path = admin_local_store_path($name);
    $encoded = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    if ($encoded === false) {
        return false;
    }

    return @file_put_contents($path, $encoded, LOCK_EX) !== false;
}
