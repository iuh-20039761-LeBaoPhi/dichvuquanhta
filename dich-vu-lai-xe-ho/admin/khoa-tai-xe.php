<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_taixe.php';

admin_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-tai-xe.php');
    exit;
}

$id = (int)($_POST['id'] ?? 0);
$return = trim((string)($_POST['return'] ?? 'quan-ly-tai-xe.php'));
if ($return === '') {
    $return = 'quan-ly-tai-xe.php';
}

$result = khoa_tai_xe($id);
$query = $result['success']
    ? '?ok=1&msg=' . rawurlencode((string)($result['message'] ?? 'Khóa tài khoản tài xế thành công.'))
    : '?ok=0&msg=' . rawurlencode((string)($result['message'] ?? 'Khóa tài khoản tài xế thất bại.'));

$separator = strpos($return, '?') === false ? '' : '&';
header('Location: ' . $return . ($separator === '' ? $query : $separator . ltrim($query, '?')));
exit;
?>