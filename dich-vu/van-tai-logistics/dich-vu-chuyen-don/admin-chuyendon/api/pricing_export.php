<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

require_once __DIR__ . '/../lib/pricing_config_service.php';

header('Content-Type: application/json; charset=UTF-8');

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'message' => 'Bạn không có quyền export bảng giá.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$raw = file_get_contents('php://input');
$decoded = json_decode((string) $raw, true);
$vehicleRows = $decoded['vehicleRows'] ?? null;
$itemRows = $decoded['itemRows'] ?? null;

if (!is_array($vehicleRows) || !is_array($itemRows)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Thiếu vehicleRows hoặc itemRows hợp lệ để export.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$targetPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'js' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'bang-gia-minh-bach.json';
$templateData = moving_pricing_service_read_template($targetPath);
$pricingData = moving_pricing_service_build_json_from_rows($templateData, $vehicleRows, $itemRows);

$encoded = json_encode(
    $pricingData,
    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

if ($encoded === false) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Không encode được bang-gia-minh-bach.json.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$handle = @fopen($targetPath, 'cb+');
if (!$handle) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Không mở được bang-gia-minh-bach.json để ghi export.',
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
        'message' => 'Không ghi được bang-gia-minh-bach.json.',
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$reloaded = file_get_contents($targetPath);
$verified = is_string($reloaded) && rtrim($reloaded, "\r\n") === $encoded;
$checksum = $verified ? sha1($reloaded) : '';

echo json_encode([
    'success' => true,
    'message' => 'Đã export lại bang-gia-minh-bach.json.',
    'verified' => $verified,
    'checksum_sha1' => $checksum,
    'updated_at' => date('c'),
    'updated_by' => $_SESSION['user_id'] ?? 'admin',
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
