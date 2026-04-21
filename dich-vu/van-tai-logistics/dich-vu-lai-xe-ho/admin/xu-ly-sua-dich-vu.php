<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';
require_once __DIR__ . '/xu-ly-upload-anh-dich-vu.php';

admin_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: quan-ly-dich-vu.php');
    exit;
}

$id = (int)($_POST['id'] ?? 0);
if ($id <= 0) {
    header('Location: quan-ly-dich-vu.php?ok=0&msg=' . rawurlencode('ID dịch vụ không hợp lệ.'));
    exit;
}

$payloadResult = dichvu_build_payload_from_post($_POST);
if (!($payloadResult['success'] ?? false)) {
    $msg = rawurlencode((string)($payloadResult['message'] ?? 'Dữ liệu không hợp lệ.'));
    header('Location: sua-dich-vu.php?id=' . urlencode((string)$id) . '&ok=0&msg=' . $msg);
    exit;
}

$payloadData = (array)($payloadResult['data'] ?? []);
$currentImage = trim((string)($_POST['current_image'] ?? ''));

// Xử lý upload ảnh mới (nếu có)
$uploadResult = dichvu_upload_service_image(
    isset($_FILES['image_file']) && is_array($_FILES['image_file']) ? $_FILES['image_file'] : null,
    (string)($payloadData['name'] ?? ''),
    false
);

if (!($uploadResult['success'] ?? false)) {
    $msg = rawurlencode((string)($uploadResult['message'] ?? 'Tải ảnh thất bại.'));
    header('Location: sua-dich-vu.php?id=' . urlencode((string)$id) . '&ok=0&msg=' . $msg);
    exit;
}

// Cập nhật đường dẫn ảnh (dùng ảnh mới hoặc giữ ảnh cũ)
$newImage = trim((string)($uploadResult['path'] ?? ''));
$payloadData['image'] = $newImage !== '' ? $newImage : $currentImage;

// Cập nhật vào bảng dịch vụ tài xế
$result = admin_api_update_table('dichvu_taixe', $id, $payloadData);
if (!($result['success'] ?? false)) {
    $msg = rawurlencode((string)($result['message'] ?? 'Cập nhật dịch vụ thất bại.'));
    header('Location: sua-dich-vu.php?id=' . urlencode((string)$id) . '&ok=0&msg=' . $msg);
    exit;
}

$msg = rawurlencode((string)($result['message'] ?? 'Cập nhật dịch vụ thành công.'));
header('Location: chi-tiet-dich-vu.php?id=' . urlencode((string)$id) . '&ok=1&msg=' . $msg);
exit;
?>