<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$scriptUrl = "https://script.google.com/macros/s/AKfycbxnkPNuiUNP_ayPThPDzKGKlnj72BY_yHntDUfKP0C5ZVvk0EGHRqcDiYpXgys0P8IxPQ/exec";

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Yêu cầu không hợp lệ']);
    exit;
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
    echo json_encode(['success' => false, 'message' => 'Dữ liệu gửi sheet không hợp lệ']);
    exit;
}

$sheetType = isset($payload['sheet_type']) ? trim((string) $payload['sheet_type']) : '';
if ($sheetType === '') {
    echo json_encode(['success' => false, 'message' => 'Thiếu trường sheet_type']);
    exit;
}

$jsonBody = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
if ($jsonBody === false) {
    echo json_encode(['success' => false, 'message' => 'Không thể mã hóa dữ liệu gửi sheet']);
    exit;
}

$ch = curl_init($scriptUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $jsonBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: text/plain;charset=utf-8']);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 60);

$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);

if ($response === false) {
    echo json_encode(['success' => false, 'message' => 'Lỗi kết nối Google Sheet: ' . $curlErr]);
    exit;
}

$decoded = json_decode($response, true);
if (is_array($decoded)) {
    echo json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode([
        'status' => 'success',
        'raw' => $response,
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

echo json_encode([
    'success' => false,
    'message' => 'Google Sheet trả về phản hồi không hợp lệ',
    'http_code' => $httpCode,
    'raw' => $response,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
