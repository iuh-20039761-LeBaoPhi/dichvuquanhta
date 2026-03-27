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
$fullName = chuyen_don_normalize_text($data['full_name'] ?? '');
$contactPerson = chuyen_don_normalize_text($data['contact_person'] ?? '');
$email = chuyen_don_normalize_email($data['email'] ?? '');
$phone = chuyen_don_normalize_phone($data['phone'] ?? '');
$password = (string) ($data['password'] ?? '');
$passwordConfirm = (string) ($data['password_confirm'] ?? '');

if ($role === '') {
    chuyen_don_fail('Vai trò đăng ký không hợp lệ.');
}

if ($fullName === '' || $email === '' || $phone === '' || $password === '' || $passwordConfirm === '') {
    chuyen_don_fail('Vui lòng nhập đầy đủ thông tin bắt buộc.');
}

if ($role === 'doi-tac' && $contactPerson === '') {
    chuyen_don_fail('Vui lòng nhập người phụ trách.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    chuyen_don_fail('Email chưa đúng định dạng.');
}

if (!preg_match('/^(?:0|84)(?:3|5|7|8|9)\d{8}$/', $phone)) {
    chuyen_don_fail('Số điện thoại chưa đúng định dạng Việt Nam.');
}

if ($password !== $passwordConfirm) {
    chuyen_don_fail('Mật khẩu xác nhận chưa khớp.');
}

if (!chuyen_don_validate_password($password)) {
    chuyen_don_fail('Mật khẩu cần 8-32 ký tự, gồm chữ hoa, chữ thường và số, không có khoảng trắng.');
}

if (chuyen_don_text_length($fullName) < 2 || chuyen_don_text_length($fullName) > ($role === 'doi-tac' ? 100 : 80)) {
    chuyen_don_fail($role === 'doi-tac'
        ? 'Tên đơn vị / đội nhóm cần từ 2 đến 100 ký tự.'
        : 'Họ và tên cần từ 2 đến 80 ký tự.');
}

if ($contactPerson !== '' && (chuyen_don_text_length($contactPerson) < 2 || chuyen_don_text_length($contactPerson) > 80)) {
    chuyen_don_fail('Người phụ trách cần từ 2 đến 80 ký tự.');
}

$checkStmt = $conn->prepare('SELECT id FROM auth_users WHERE role = ? AND (email = ? OR phone = ?) LIMIT 1');
if (!$checkStmt) {
    chuyen_don_fail('Không thể kiểm tra dữ liệu tài khoản.', 500);
}

$checkStmt->bind_param('sss', $role, $email, $phone);
$checkStmt->execute();
$existing = $checkStmt->get_result()->fetch_assoc();
$checkStmt->close();

if ($existing) {
    chuyen_don_fail('Email hoặc số điện thoại đã được sử dụng cho vai trò này.', 409);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
$status = 'active';
$insertStmt = $conn->prepare(
    'INSERT INTO auth_users (role, full_name, contact_person, email, phone, password_hash, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);

if (!$insertStmt) {
    chuyen_don_fail('Không thể tạo tài khoản.', 500);
}

$contactPersonValue = $contactPerson !== '' ? $contactPerson : null;
$insertStmt->bind_param(
    'sssssss',
    $role,
    $fullName,
    $contactPersonValue,
    $email,
    $phone,
    $passwordHash,
    $status
);

if (!$insertStmt->execute()) {
    $errorCode = (int) $conn->errno;
    $insertStmt->close();
    if ($errorCode === 1062) {
        chuyen_don_fail('Email hoặc số điện thoại đã được sử dụng cho vai trò này.', 409);
    }
    chuyen_don_fail('Không thể tạo tài khoản. Vui lòng thử lại.', 500);
}

$userId = (int) $insertStmt->insert_id;
$insertStmt->close();

$user = chuyen_don_login_user([
    'id' => $userId,
    'role' => $role,
    'full_name' => $fullName,
    'contact_person' => $contactPerson,
    'email' => $email,
    'phone' => $phone,
    'status' => $status,
]);

chuyen_don_send_json([
    'status' => 'success',
    'message' => 'Tạo tài khoản thành công.',
    'user' => $user,
    'redirect_url' => chuyen_don_get_default_redirect($role),
]);
