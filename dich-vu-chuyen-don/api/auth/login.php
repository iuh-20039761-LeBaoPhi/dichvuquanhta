<?php

require_once __DIR__ . '/_helpers.php';

chuyen_don_require_method('POST');

try {
    $conn = chuyen_don_get_connection();
    chuyen_don_ensure_auth_schema($conn);
} catch (Throwable $error) {
    chuyen_don_fail($error->getMessage(), 500);
}

$data = chuyen_don_get_json_input();

$role = chuyen_don_resolve_role($data['role'] ?? '');
$email = chuyen_don_normalize_email($data['email'] ?? '');
$password = (string) ($data['password'] ?? '');

if ($role === '') {
    chuyen_don_fail('Vai trò đăng nhập không hợp lệ.');
}

if ($email === '' || $password === '') {
    chuyen_don_fail('Vui lòng nhập email và mật khẩu.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    chuyen_don_fail('Email chưa đúng định dạng.');
}

$stmt = $conn->prepare(
    'SELECT id, role, full_name, contact_person, email, phone, password_hash, status
     FROM auth_users
     WHERE role = ? AND email = ?
     LIMIT 1'
);

if (!$stmt) {
    chuyen_don_fail('Không thể xử lý đăng nhập.', 500);
}

$stmt->bind_param('ss', $role, $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$user || !password_verify($password, (string) $user['password_hash'])) {
    chuyen_don_fail('Email hoặc mật khẩu không chính xác.', 401);
}

if ((string) ($user['status'] ?? '') !== 'active') {
    chuyen_don_fail('Tài khoản hiện không thể đăng nhập.', 403);
}

$updateStmt = $conn->prepare('UPDATE auth_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?');
if ($updateStmt) {
    $userId = (int) $user['id'];
    $updateStmt->bind_param('i', $userId);
    $updateStmt->execute();
    $updateStmt->close();
}

$sessionUser = chuyen_don_login_user($user);

chuyen_don_send_json([
    'status' => 'success',
    'message' => 'Đăng nhập thành công.',
    'user' => $sessionUser,
    'redirect_url' => chuyen_don_get_default_redirect($role),
]);
