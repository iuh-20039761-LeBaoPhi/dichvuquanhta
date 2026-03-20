<?php
require_once __DIR__ . '/../../config/session.php';
header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['user_id'], $_SESSION['user_role'])) {
    echo json_encode([
        'logged_in' => true,
        'id'        => $_SESSION['user_id'],
        'name'      => $_SESSION['user_name']  ?? '',
        'email'     => $_SESSION['user_email'] ?? '',
        'phone'     => $_SESSION['user_phone'] ?? '',
        'role'      => $_SESSION['user_role']
    ]);
} elseif (isset($_SESSION['admin_id'])) {
    echo json_encode([
        'logged_in' => true,
        'id'        => $_SESSION['admin_id'],
        'name'      => $_SESSION['admin_username'] ?? 'Admin',
        'role'      => 'admin'
    ]);
} else {
    echo json_encode(['logged_in' => false]);
}
