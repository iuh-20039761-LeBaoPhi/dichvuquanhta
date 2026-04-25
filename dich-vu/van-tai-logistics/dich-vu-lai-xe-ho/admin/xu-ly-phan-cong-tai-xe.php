<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-don-hang.php');
    exit;
}

$donhang_id = (int)($_POST['donhang_id'] ?? 0);
$taixe_id = (int)($_POST['taixe_id'] ?? 0);
$return = trim((string)($_POST['return'] ?? 'quan-ly-don-hang.php'));

if ($donhang_id <= 0 || $taixe_id <= 0) {
    header('Location: ' . $return . '?ok=0&msg=Thiếu thông tin');
    exit;
}

// Lấy thông tin tài xế
$userResult = admin_api_list_table('nguoidung');
$users = $userResult['rows'] ?? [];
$taixeInfo = null;
foreach ($users as $u) {
    if ((int)($u['id'] ?? 0) === $taixe_id) {
        $taixeInfo = $u;
        break;
    }
}

if (!$taixeInfo) {
    header('Location: ' . $return . '?ok=0&msg=Không tìm thấy tài xế');
    exit;
}

$result = admin_api_update_table('datlich_taixe', $donhang_id, [
    'id_taixe' => $taixe_id,
    'ten_taixe' => $taixeInfo['hovaten'] ?? '',
    'sdt_taixe' => $taixeInfo['sodienthoai'] ?? '',
    'email_taixe' => $taixeInfo['email'] ?? '',
    'kinh_nghiem_taixe' => $taixeInfo['kinh_nghiem_nam'] ?? '',
    'trangthai' => 'Đã nhận',
    'ngaynhan' => date('Y-m-d H:i:s')
]);

$query = ($result['success'] ?? false) 
    ? '?ok=1&msg=Phân công thành công' 
    : '?ok=0&msg=' . rawurlencode($result['message'] ?? 'Lỗi');

header('Location: ' . $return . $query);
exit;