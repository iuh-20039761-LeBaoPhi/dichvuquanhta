<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$scriptUrl = "https://script.google.com/macros/s/AKfycbxtMgHP8YRAaDO1U_4oqYjFEWUgSjemT2jk1q9baoW6KXz2ggfR-bfmLnuZSiZkIAMAuA/exec";

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST' || !isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'message' => 'Yêu cầu không hợp lệ'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$file = $_FILES['file'];
$name = isset($_POST['name']) ? trim((string) $_POST['name']) : trim((string) ($file['name'] ?? ''));
$mime = trim((string) ($file['type'] ?? 'application/octet-stream'));
$tmpPath = (string) ($file['tmp_name'] ?? '');

if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($tmpPath)) {
    echo json_encode([
        'success' => false,
        'message' => 'File upload lỗi: ' . (string) ($file['error'] ?? 'unknown'),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$folderKey = 27;
$fileContent = base64_encode((string) file_get_contents($tmpPath));
$payload = json_encode([
    'name' => $name !== '' ? $name : 'media',
    'file' => $fileContent,
    'type' => $mime !== '' ? $mime : 'application/octet-stream',
    'folderKey' => $folderKey,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if ($payload === false) {
    echo json_encode(['success' => false, 'message' => 'Không thể mã hóa dữ liệu tải lên'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$ch = curl_init($scriptUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode(['success' => false, 'message' => 'CURL lỗi: ' . $curlErr], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$decoded = json_decode($response, true);
if (is_array($decoded) && isset($decoded['status']) && $decoded['status'] === 'success' && !empty($decoded['fileId'])) {
    echo json_encode([
        'success' => true,
        'fileId' => (string) $decoded['fileId'],
        'name' => $name !== '' ? $name : (string) ($file['name'] ?? 'media'),
        'type' => $mime !== '' ? $mime : 'application/octet-stream',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($httpCode >= 200 && $httpCode < 300 && is_array($decoded) && !empty($decoded['fileId'])) {
    echo json_encode([
        'success' => true,
        'fileId' => (string) $decoded['fileId'],
        'name' => $name !== '' ? $name : (string) ($file['name'] ?? 'media'),
        'type' => $mime !== '' ? $mime : 'application/octet-stream',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$message = is_array($decoded) && !empty($decoded['message'])
    ? (string) $decoded['message']
    : 'Google Drive trả về lỗi';

echo json_encode([
    'success' => false,
    'message' => $message,
    'http_code' => $httpCode,
    'raw' => $decoded,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
