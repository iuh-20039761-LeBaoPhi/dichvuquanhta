<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';
require_once __DIR__ . '/xu-ly-upload-anh-dich-vu.php';

admin_require_login();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: them-dich-vu.php');
    exit;
}

$payloadResult = dichvu_build_payload_from_post($_POST);
if (!($payloadResult['success'] ?? false)) {
    $msg = rawurlencode((string)($payloadResult['message'] ?? 'Dữ liệu không hợp lệ.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$payloadData = (array)($payloadResult['data'] ?? []);

// Xử lý upload ảnh (bắt buộc khi thêm mới)
$uploadResult = dichvu_upload_service_image(
    isset($_FILES['image_file']) && is_array($_FILES['image_file']) ? $_FILES['image_file'] : null,
    (string)($payloadData['name'] ?? ''),
    true  // required = true (bắt buộc phải có ảnh khi thêm mới)
);

if (!($uploadResult['success'] ?? false)) {
    $msg = rawurlencode((string)($uploadResult['message'] ?? 'Tải ảnh thất bại.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

// Gán đường dẫn ảnh vào dữ liệu
$payloadData['image'] = (string)($uploadResult['path'] ?? '');

// Thêm vào bảng dịch vụ tài xế
$result = admin_api_insert_table('dichvu_taixe', $payloadData);
if (!($result['success'] ?? false)) {
    $msg = rawurlencode((string)($result['message'] ?? 'Thêm dịch vụ thất bại.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$msg = rawurlencode((string)($result['message'] ?? 'Thêm dịch vụ thành công.'));
header('Location: quan-ly-dich-vu.php?ok=1&msg=' . $msg);
exit;
?>