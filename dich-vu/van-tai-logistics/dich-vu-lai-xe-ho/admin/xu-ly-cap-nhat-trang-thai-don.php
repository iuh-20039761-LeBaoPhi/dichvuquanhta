<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';
require_once __DIR__ . '/get_donhang.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-don-hang.php');
    exit;
}

$donhang_id = (int)($_POST['donhang_id'] ?? 0);
$trangthai = trim((string)($_POST['trangthai'] ?? ''));
$return = trim((string)($_POST['return'] ?? 'quan-ly-don-hang.php'));

if ($donhang_id <= 0 || $trangthai === '') {
    header('Location: ' . $return . '?ok=0&msg=' . rawurlencode('Thiếu thông tin'));
    exit;
}

$result = cap_nhat_trangthai_donhang($donhang_id, $trangthai);

$query = $result['success']
    ? '?ok=1&msg=' . rawurlencode('Cập nhật trạng thái thành công')
    : '?ok=0&msg=' . rawurlencode($result['message'] ?? 'Cập nhật thất bại');

header('Location: ' . $return . $query);
exit;