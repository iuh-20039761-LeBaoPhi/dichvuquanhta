<?php

require_once __DIR__ . '/_helpers.php';

$user = chuyen_don_current_user();

chuyen_don_send_json([
    'status' => 'success',
    'authenticated' => is_array($user),
    'user' => $user,
]);
