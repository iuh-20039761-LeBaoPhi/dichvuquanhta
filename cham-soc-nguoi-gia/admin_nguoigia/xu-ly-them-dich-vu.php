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
    $msg = rawurlencode((string) ($payloadResult['message'] ?? 'Du lieu khong hop le.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$payloadData = (array) ($payloadResult['data'] ?? []);
$uploadResult = dichvu_upload_service_image(
    isset($_FILES['image_file']) && is_array($_FILES['image_file']) ? $_FILES['image_file'] : null,
    (string) ($payloadData['name'] ?? ''),
    true
);

if (!($uploadResult['success'] ?? false)) {
    $msg = rawurlencode((string) ($uploadResult['message'] ?? 'Tai anh that bai.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$payloadData['image'] = (string) ($uploadResult['path'] ?? '');

$result = admin_api_insert_table('dichvu_nguoigia', $payloadData);
if (!($result['success'] ?? false)) {
    $msg = rawurlencode((string) ($result['message'] ?? 'Them dich vu that bai.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$msg = rawurlencode((string) ($result['message'] ?? 'Them dich vu thanh cong.'));
header('Location: quan-ly-dich-vu.php?ok=1&msg=' . $msg);
exit;
