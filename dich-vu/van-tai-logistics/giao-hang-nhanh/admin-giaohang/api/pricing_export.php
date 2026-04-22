<?php
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

header('Content-Type: application/json; charset=UTF-8');

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Bạn không có quyền export pricing.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

require_once __DIR__ . '/../lib/pricing_config_service.php';

$raw = file_get_contents('php://input');
$decoded = json_decode((string) $raw, true);
$versionId = (int) ($decoded['versionId'] ?? 0);
$submittedPricingData = is_array($decoded['pricingData'] ?? null) ? $decoded['pricingData'] : null;

if ($versionId <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Thiếu versionId KRUD hợp lệ để export JSON cache.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$exportSource = 'krud';
if ($submittedPricingData !== null) {
    // Fast path: JS vừa lưu KRUD xong gửi snapshot hiện tại, tránh PHP gọi lại nhiều bảng KRUD chỉ để dựng JSON cache.
    $pricingData = pricing_service_strip_krud_meta(
        pricing_service_normalize_display_labels($submittedPricingData)
    );
    $exportSource = 'request_snapshot';
} else {
    $built = pricing_service_export_config_from_version($versionId);
    if (empty($built['success']) || !is_array($built['data'] ?? null)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => (string) ($built['message'] ?? 'Không dựng được dữ liệu export từ KRUD.'),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $pricingData = $built['data'];
}

$targetPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'pricing-data.json';
$encoded = json_encode(
    $pricingData,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

if ($encoded === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Không encode được pricingData để export.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$handle = @fopen($targetPath, 'cb+');
if (!$handle) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Không mở được pricing-data.json để ghi export.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$written = false;
if (flock($handle, LOCK_EX)) {
    ftruncate($handle, 0);
    rewind($handle);
    $bytes = fwrite($handle, $encoded . PHP_EOL);
    fflush($handle);
    flock($handle, LOCK_UN);
    $written = $bytes !== false;
}
fclose($handle);

if (!$written) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Không ghi được pricing-data.json.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$reloaded = file_get_contents($targetPath);
$verified = is_string($reloaded) && rtrim($reloaded, "\r\n") === $encoded;
$checksum = $verified ? sha1($reloaded) : '';

echo json_encode([
    'success' => true,
    'message' => 'Đã export lại pricing-data.json.',
    'verified' => $verified,
    'checksum_sha1' => $checksum,
    'export_source' => $exportSource,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
