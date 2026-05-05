<?php
session_start();

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$requestedCode = trim((string) ($_GET['code'] ?? ''));
$requestedId = trim((string) ($_GET['id'] ?? ''));
$identifier = $requestedCode !== '' ? $requestedCode : $requestedId;

if ($identifier === '') {
    header('Location: orders_manage.php');
    exit;
}

$query = http_build_query([
    'viewer' => 'admin',
    'admin_return' => 'admin-giaohang/public/orders_manage.php',
    'madonhang' => $identifier,
]);

header('Location: ../../chi-tiet-don-hang-giaohang.html?' . $query);
exit;
?>
