<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/admin_api_common.php';

admin_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-dich-vu.php');
    exit;
}

$id = (int)($_POST['id'] ?? 0);
$q = trim((string)($_POST['q'] ?? ''));

$redirectWithMessage = static function (bool $ok, string $message) use ($q): void {
    $params = [
        'ok' => $ok ? '1' : '0',
        'msg' => $message,
    ];

    if ($q !== '') {
        $params['q'] = $q;
    }

    header('Location: quan-ly-dich-vu.php?' . http_build_query($params));
    exit;
};

if ($id <= 0) {
    $redirectWithMessage(false, 'ID dịch vụ không hợp lệ.');
}

// Xóa dịch vụ khỏi bảng dichvu_taixe (dịch vụ tài xế)
$result = admin_api_delete_table('dichvu_taixe', $id);
if (!($result['success'] ?? false)) {
    $redirectWithMessage(false, (string)($result['message'] ?? 'Xóa dịch vụ thất bại.'));
}

$redirectWithMessage(true, (string)($result['message'] ?? 'Xóa dịch vụ thành công.'));
?>