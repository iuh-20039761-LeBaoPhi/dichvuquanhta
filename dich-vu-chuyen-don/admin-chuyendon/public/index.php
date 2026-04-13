<?php
require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_boot_session();

if (isset($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin') {
    moving_admin_redirect('users_manage.php');
}

moving_admin_redirect('login.php');
