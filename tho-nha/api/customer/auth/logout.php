<?php
require_once __DIR__ . '/../../../config/session.php';
header('Content-Type: application/json; charset=utf-8');

unset($_SESSION['user_id'], $_SESSION['user_name'], $_SESSION['user_email'], $_SESSION['user_role']);
echo json_encode(['status' => 'success']);
