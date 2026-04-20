<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';
require_once __DIR__ . '/get_donhang.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-don-hang.php');
    exit;
}

$donhang_id = (int)($_POST['donhang_id'] ?? 0);
$taixe_id = (int)($_POST['taixe_id'] ?? 0);
$return = trim((string)($_POST['return'] ?? 'quan-ly-don-hang.php'));

if ($donhang_id <= 0 || $taixe_id <= 0) {
    header('Location: ' . $return . '?ok=0&msg=' . rawurlencode('ID đơn hàng hoặc tài xế không hợp lệ'));
    exit;
}

// Gọi hàm phân công tài xế (đã định nghĩa trong get_donhang.php)
$result = phan_cong_taixe($donhang_id, $taixe_id);

$query = $result['success']
    ? '?ok=1&msg=' . rawurlencode('Phân công tài xế thành công')
    : '?ok=0&msg=' . rawurlencode($result['message'] ?? 'Phân công thất bại');

header('Location: ' . $return . $query);
exit;