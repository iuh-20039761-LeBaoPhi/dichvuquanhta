<?php

require_once __DIR__ . '/_helpers.php';

chuyen_don_require_method('POST');

chuyen_don_clear_auth_session();

if (session_status() === PHP_SESSION_ACTIVE) {
    session_regenerate_id(true);
}

chuyen_don_send_json([
    'status' => 'success',
    'message' => 'Đăng xuất thành công.',
]);
