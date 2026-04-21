<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
	session_start();
}

unset($_SESSION['admin_logged_in'], $_SESSION['admin_user']);

session_regenerate_id(true);

header('Location: login.php');
exit;
