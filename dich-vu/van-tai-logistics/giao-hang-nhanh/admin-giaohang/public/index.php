<?php
session_start();
if (isset($_SESSION['user_id']) && ($_SESSION['role'] ?? '') === 'admin') {
    header('Location: admin_stats.php');
    exit;
}

header('Location: login.php');
exit;
