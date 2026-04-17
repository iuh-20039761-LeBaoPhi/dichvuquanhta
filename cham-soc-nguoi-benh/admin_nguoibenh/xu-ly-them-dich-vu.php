<?php
declare(strict_types=1);

require_once __DIR__ . '/slidebar.php';
require_once __DIR__ . '/get_dichvu.php';

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
$hasFile = isset($_FILES['image_file']) && is_array($_FILES['image_file']) && $_FILES['image_file']['error'] === UPLOAD_ERR_OK;

if (!$hasFile) {
    if (isset($_FILES['image_file']['error']) && $_FILES['image_file']['error'] !== UPLOAD_ERR_NO_FILE) {
        $msg = rawurlencode('Loi upload file: ' . $_FILES['image_file']['error']);
    } else {
        $msg = rawurlencode('Vui long chon anh dich vu.');
    }
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
$path = explode('?', $_SERVER['REQUEST_URI'], 2)[0];
$baseUrl = rtrim(str_replace('\\', '/', dirname($path)), '/');
$uploadUrl = $protocol . "://" . $_SERVER['HTTP_HOST'] . $baseUrl . "/upload.php";

$cfile = new CURLFile($_FILES['image_file']['tmp_name'], $_FILES['image_file']['type'], $_FILES['image_file']['name']);
$postData = [
    'file' => $cfile,
    'name' => (string) ($payloadData['name'] ?? '')
];

$ch = curl_init($uploadUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
$response = curl_exec($ch);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    $msg = rawurlencode('Loi goi upload.php: ' . $curlErr);
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$res = json_decode((string) $response, true);
if (!($res['success'] ?? false)) {
    $msg = rawurlencode((string) ($res['message'] ?? 'Tai anh that bai.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$payloadData['image'] = (string) ($res['fileId'] ?? '');

$result = admin_api_insert_table('dichvu_nguoibenh', $payloadData);
if (!($result['success'] ?? false)) {
    $msg = rawurlencode((string) ($result['message'] ?? 'Them dich vu that bai.'));
    header('Location: them-dich-vu.php?ok=0&msg=' . $msg);
    exit;
}

$msg = rawurlencode((string) ($result['message'] ?? 'Them dich vu thanh cong.'));
header('Location: quan-ly-dich-vu.php?ok=1&msg=' . $msg);
exit;
