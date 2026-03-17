<?php
require_once dirname(__DIR__) . '/session.php';
header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['user_id']) && $_SESSION['user_role'] === 'customer') {
    echo json_encode([
        'status' => 'logged_in',
        'id'     => $_SESSION['user_id'],
        'name'   => $_SESSION['user_name'],
        'email'  => $_SESSION['user_email']
    ]);
} else {
    echo json_encode(['status' => 'not_logged_in']);
}
