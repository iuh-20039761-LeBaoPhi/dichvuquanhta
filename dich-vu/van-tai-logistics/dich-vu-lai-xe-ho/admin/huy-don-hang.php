<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

$id = (int)($_GET['id'] ?? 0);

if ($id > 0) {
    $result = admin_api_update_table('datlich_taixe', $id, [
        'trangthai' => 'Đã hủy',
        'ngayhuy' => date('Y-m-d H:i:s')
    ]);
    $msg = ($result['success'] ?? false) ? 'Đã hủy đơn hàng!' : ($result['message'] ?? 'Lỗi');
    header('Location: quan-ly-don-hang.php?ok=' . ($result['success'] ? '1' : '0') . '&msg=' . rawurlencode($msg));
    exit;
}

header('Location: quan-ly-don-hang.php');
exit;