<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

$id = (int)($_GET['id'] ?? 0);
$status = trim((string)($_GET['status'] ?? ''));

if ($id > 0 && $status !== '') {
    $result = admin_api_update_table('datlich_taixe', $id, ['trangthai' => $status]);
    $msg = ($result['success'] ?? false) ? 'Cập nhật thành công!' : ($result['message'] ?? 'Lỗi');
    header('Location: quan-ly-don-hang.php?ok=' . ($result['success'] ? '1' : '0') . '&msg=' . rawurlencode($msg));
    exit;
}

header('Location: quan-ly-don-hang.php');
exit;