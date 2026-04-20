<?php
session_start();

// 1. Lấy cookie
$phone = $_COOKIE['dvqt_u'] ?? '';
$password = $_COOKIE['dvqt_p'] ?? '';

// 2. Nếu thiếu thông tin, trả về lỗi
if (!$phone || !$password) {
	echo json_encode(['success' => false, 'message' => 'Chưa đăng nhập']);
	exit;
}

// 3. Gọi API lấy danh sách người dùng (POST)
$url = 'https://api.dvqt.vn/list/';
$payload = json_encode([
    'table' => 'nguoidung',
    'limit' => 100000
], JSON_UNESCAPED_UNICODE);

$opts = [
	'http' => [
		'method' => 'POST',
		'header' => "Content-Type: application/json\r\n",
		'content' => $payload,
		'timeout' => 20,
	]
];
$context = stream_context_create($opts);
$raw = @file_get_contents($url, false, $context);

if (!$raw) {
	echo json_encode(['success' => false, 'message' => 'Không kết nối được API']);
	exit;
}

$json = json_decode($raw, true);
$users = $json['data'] ?? $json['rows'] ?? $json['list'] ?? [];

// 4. Tìm user khớp số điện thoại và mật khẩu
$found = null;
foreach ($users as $user) {
	$dbPhone = preg_replace('/\\D/', '', $user['sodienthoai'] ?? $user['phone'] ?? '');
	$inputPhone = preg_replace('/\\D/', '', $phone);
	$dbPass = $user['matkhau'] ?? $user['password'] ?? '';
	if ($dbPhone === $inputPhone && $dbPass === $password) {
		$found = $user;
		break;
	}
}

if (!$found) {
	echo json_encode(['success' => false, 'message' => 'Sai tài khoản hoặc mật khẩu']);
	exit;
}

// 5. Lưu vào session các trường cần thiết
$_SESSION['user'] = [
	'id' => $found['id'] ?? '',
	'hovaten' => $found['hovaten'] ?? '',
	'sodienthoai' => $found['sodienthoai'] ?? '',
	'email' => $found['email'] ?? '',
	'diachi' => $found['diachi'] ?? '',
	'matkhau' => $found['matkhau'] ?? '',
	'avatartenfile' => $found['link_avatar'] ?? '',
	'id_dichvu' => $found['id_dichvu'] ?? '',
	'trangthai' => $found['trangthai'] ?? 'active'
];
$_SESSION['logged_in'] = true;
$_SESSION['last_activity'] = time();
