<?php
// upload.php - Nhận file từ JS, upload lên Google Drive, trả về fileId
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Tăng giới hạn bộ nhớ và thời gian thực thi để upload video mượt hơn
ini_set('memory_limit', '2048M');
ini_set('max_execution_time', '0');

$scriptUrl = "https://script.google.com/macros/s/AKfycbwmkiNswnlcic0R0YMvoDOrUdo9hl2rIdAMrHwL7lU8sNmKKGnkyJZoz6lg5CBypS2u1A/exec";

if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'message' => 'Yêu cầu không hợp lệ']);
    exit;
}

$file = $_FILES['file'];
$name = isset($_POST['name']) ? trim($_POST['name']) : $file['name'];
$mime = $file['type'];
$tmpPath = $file['tmp_name'];

if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($tmpPath)) {
    echo json_encode(['success' => false, 'message' => 'File upload lỗi: ' . $file['error']]);
    exit;
}

// Encode base64 và gửi lên Google Drive qua Apps Script
$fileContent = base64_encode(file_get_contents($tmpPath));

$data = json_encode([
    'name' => $name,
    'file' => $fileContent,
    'type' => $mime,
]);

$ch = curl_init($scriptUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 0); // Không giới hạn thời gian cho CURL

$response = curl_exec($ch);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode(['success' => false, 'message' => 'CURL lỗi: ' . $curlErr]);
    exit;
}

$res = json_decode($response, true);

if ($res && isset($res['status']) && $res['status'] === 'success' && !empty($res['fileId'])) {
    echo json_encode(['success' => true, 'fileId' => $res['fileId'], 'type' => $mime]);
} else {
    $msg = isset($res['message']) ? $res['message'] : 'Google Drive trả về lỗi';
    echo json_encode(['success' => false, 'message' => $msg, 'raw' => $res]);
}
