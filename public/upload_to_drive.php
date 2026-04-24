<?php
/**
 * Global Google Drive Upload Proxy
 * Receives files from any module, sends to Google Apps Script, returns Drive ID/URL
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Script URL (Inherited from the existing ecosystem config)
$scriptUrl = "https://script.google.com/macros/s/AKfycbzTT7c7pINUsAd9k3z_zP-TBaR7h0s1GXd4ylsWOhBFeijeD3z37el1pzVRfiuJb7DFag/exec";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Yêu cầu không hợp lệ']);
    exit;
}

// Check for file in 'file' field
if (!isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'message' => 'Không tìm thấy file gửi lên']);
    exit;
}

$file      = $_FILES['file'];
$name      = isset($_POST['name']) ? trim($_POST['name']) : $file['name'];
$folderKey = isset($_POST['folderKey']) ? $_POST['folderKey'] : null;
$mime      = $file['type'];
$tmpPath   = $file['tmp_name'];

if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($tmpPath)) {
    echo json_encode(['success' => false, 'message' => 'File upload lỗi: ' . $file['error']]);
    exit;
}

// Convert to Base64
$fileContent = base64_encode(file_get_contents($tmpPath));

$payloadArr = [
    'name' => $name,
    'file' => $fileContent,
    'type' => $mime,
];
// Chỉ gửi folderKey nếu có — để Google Apps Script phân loại thư mục lưu trữ
if ($folderKey !== null) {
    $payloadArr['folderKey'] = $folderKey;
}
$payload = json_encode($payloadArr);

// Forward to Google Apps Script
$ch = curl_init($scriptUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode(['success' => false, 'message' => 'Lỗi kết nối Google: ' . $curlErr]);
    exit;
}

$res = json_decode($response, true);

if ($res && isset($res['status']) && $res['status'] === 'success' && !empty($res['fileId'])) {
    // Return both fileId and a friendly direct view link
    $fileId = $res['fileId'];
    $viewLink = "https://lh3.googleusercontent.com/u/0/d/" . $fileId; // Direct link for <img> tags
    
    echo json_encode([
        'success' => true, 
        'fileId' => $fileId, 
        'url' => $viewLink,
        'type' => $mime
    ]);
} else {
    $msg = isset($res['message']) ? $res['message'] : 'Google Drive trả về lỗi không xác định';
    echo json_encode(['success' => false, 'message' => $msg, 'raw' => $res]);
}
