<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_nhanvien.php';

admin_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-nhan-vien.php');
    exit;
}

$id = (int)($_POST['id'] ?? 0);
$return = trim((string)($_POST['return'] ?? 'quan-ly-nhan-vien.php'));
if ($return === '') {
    $return = 'quan-ly-nhan-vien.php';
}

$result = duyet_nhan_vien($id);
$query = $result['success']
    ? '?ok=1&msg=' . rawurlencode((string)($result['message'] ?? 'Duyet thanh cong.'))
    : '?ok=0&msg=' . rawurlencode((string)($result['message'] ?? 'Duyet that bai.'));

$separator = strpos($return, '?') === false ? '' : '&';
header('Location: ' . $return . ($separator === '' ? $query : $separator . ltrim($query, '?')));
exit;
