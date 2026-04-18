<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$scriptUrl = "https://script.google.com/macros/s/AKfycbxThLPP2mI062gddeEyAAy3XYzUMJ-CIzMP3dMFWQ7v31t5H10ZESvx_i-ZKzWO5A_pog/exec";

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'message' => 'Yêu cầu không hợp lệ']);
    exit;
}

$file = $_FILES['file'];
$name = isset($_POST['name']) ? trim((string) $_POST['name']) : $file['name'];
$mime = $file['type'];
$tmpPath = $file['tmp_name'];

if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($tmpPath)) {
    echo json_encode(['success' => false, 'message' => 'File upload lỗi: ' . $file['error']]);
    exit;
}

$fileContent = base64_encode(file_get_contents($tmpPath));
$payload = json_encode([
    'name' => $name,
    'file' => $fileContent,
    'type' => $mime,
]);

$ch = curl_init($scriptUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode(['success' => false, 'message' => 'CURL lỗi: ' . $curlErr]);
    exit;
}

$res = json_decode($response, true);

if ($res && isset($res['status']) && $res['status'] === 'success' && !empty($res['fileId'])) {
    echo json_encode([
        'success' => true,
        'fileId' => $res['fileId'],
        'type' => $mime,
    ]);
    exit;
}

$msg = isset($res['message']) ? $res['message'] : 'Google Drive trả về lỗi';
echo json_encode(['success' => false, 'message' => $msg, 'raw' => $res]);
