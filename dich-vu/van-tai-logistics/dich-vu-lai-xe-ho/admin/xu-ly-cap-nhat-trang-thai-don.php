<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-don-hang.php');
    exit;
}

$donhang_id = (int)($_POST['donhang_id'] ?? 0);
$trangthai = trim((string)($_POST['trangthai'] ?? ''));
$return = trim((string)($_POST['return'] ?? 'quan-ly-don-hang.php'));

if ($donhang_id <= 0 || $trangthai === '') {
    header('Location: ' . $return . '?ok=0&msg=Thiếu thông tin');
    exit;
}

$result = admin_api_update_table('datlich_taixe', $donhang_id, ['trangthai' => $trangthai]);

$query = ($result['success'] ?? false) 
    ? '?ok=1&msg=Cập nhật thành công' 
    : '?ok=0&msg=' . rawurlencode($result['message'] ?? 'Lỗi');

header('Location: ' . $return . $query);
exit;