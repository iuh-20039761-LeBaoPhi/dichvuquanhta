<?php
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['user_id']) && $_SESSION['user_role'] === 'provider') {
    echo json_encode([
        'status'  => 'logged_in',
        'id'      => $_SESSION['user_id'],
        'name'    => $_SESSION['user_name'],
        'email'   => $_SESSION['user_email'],
        'company' => $_SESSION['user_company']
    ]);
} else {
    echo json_encode(['status' => 'not_logged_in']);
}
