<?php
session_start();

$phone = $_COOKIE['dvqt_u'] ?? '';
$password = $_COOKIE['dvqt_p'] ?? '';

if (!$phone || !$password) {
    echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
    exit;
}

// Gọi API lấy user
$url = 'https://api.dvqt.vn/list/';
$payload = json_encode(['table' => 'nguoidung']);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_POSTFIELDS => $payload,
]);

$raw = curl_exec($ch);
curl_close($ch);

$data = json_decode($raw, true);
$users = $data['data'] ?? $data['rows'] ?? [];

$found = null;
foreach ($users as $user) {
    if (($user['sodienthoai'] ?? '') === $phone && ($user['matkhau'] ?? '') === $password) {
        $found = $user;
        break;
    }
}

if (!$found) {
    echo json_encode(['success' => false, 'message' => 'Sai tài khoản']);
    exit;
}

// LƯU SESSION
$_SESSION['user'] = $found;
$_SESSION['logged_in'] = true;

echo json_encode(['success' => true]);