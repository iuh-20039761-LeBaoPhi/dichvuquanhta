<?php
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function media_upload_json($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function media_upload_text($value) {
    return trim((string) ($value ?? ''));
}

function media_upload_slug($value, $fallback = 'media') {
    $normalized = preg_replace('/[^A-Za-z0-9_-]+/', '_', media_upload_text($value));
    $normalized = trim((string) $normalized, '_');
    return $normalized !== '' ? $normalized : $fallback;
}

function media_upload_filename($value, $fallback = 'file') {
    $base = basename((string) $value);
    $base = preg_replace('/[^A-Za-z0-9._-]/', '_', $base);
    return $base !== '' ? $base : $fallback;
}

function media_upload_public_root() {
    $scriptBase = str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '')));
    return rtrim($scriptBase, '/') . '/public/uploads/order_media';
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    media_upload_json([
        'success' => false,
        'message' => 'Phương thức không được hỗ trợ.',
    ], 405);
}

$orderCode = media_upload_text($_POST['order_code'] ?? $_POST['order_ref'] ?? '');
$mediaType = media_upload_slug($_POST['media_type'] ?? 'general', 'general');
$files = $_FILES['media_files'] ?? null;

if ($orderCode === '') {
    media_upload_json([
        'success' => false,
        'message' => 'Thiếu mã đơn hàng để lưu media.',
    ], 422);
}

if (!$files) {
    media_upload_json([
        'success' => false,
        'message' => 'Chưa có file media nào được gửi lên.',
    ], 422);
}

$allowedExts = [
    'jpg',
    'jpeg',
    'png',
    'webp',
    'gif',
    'bmp',
    'heic',
    'mp4',
    'mov',
    'webm',
    'm4v',
    'avi',
    'mkv',
];
$maxBytes = 25 * 1024 * 1024;
$orderSlug = media_upload_slug($orderCode, 'order');
$targetDir = dirname(__DIR__) . '/public/uploads/order_media/' . $orderSlug . '/' . $mediaType;

if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
    media_upload_json([
        'success' => false,
        'message' => 'Không thể tạo thư mục lưu media.',
    ], 500);
}

$names = $files['name'] ?? [];
$tmpNames = $files['tmp_name'] ?? [];
$errors = $files['error'] ?? [];
$sizes = $files['size'] ?? [];

if (!is_array($names)) {
    $names = [$names];
    $tmpNames = [$tmpNames];
    $errors = [$errors];
    $sizes = [$sizes];
}

$items = [];
$publicBase = media_upload_public_root() . '/' . rawurlencode($orderSlug) . '/' . rawurlencode($mediaType);

foreach ($names as $index => $originalName) {
    if (($errors[$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        continue;
    }

    $tmpName = $tmpNames[$index] ?? '';
    $size = (int) ($sizes[$index] ?? 0);
    if ($tmpName === '' || !is_uploaded_file($tmpName)) {
        continue;
    }

    if ($size <= 0 || $size > $maxBytes) {
        continue;
    }

    $safeName = media_upload_filename($originalName, 'media_' . ($index + 1));
    $extension = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));
    if ($extension === '' || !in_array($extension, $allowedExts, true)) {
        continue;
    }

    $baseName = pathinfo($safeName, PATHINFO_FILENAME);
    $finalName = $safeName;
    $counter = 1;
    while (file_exists($targetDir . DIRECTORY_SEPARATOR . $finalName)) {
        $finalName = $baseName . '_' . $counter . '.' . $extension;
        $counter++;
    }

    $destination = $targetDir . DIRECTORY_SEPARATOR . $finalName;
    if (!move_uploaded_file($tmpName, $destination)) {
        continue;
    }

    $items[] = [
        'id' => $mediaType . '-' . time() . '-' . $index,
        'name' => $finalName,
        'extension' => $extension,
        'url' => $publicBase . '/' . rawurlencode($finalName),
        'created_at' => date(DATE_ATOM),
    ];
}

if (!$items) {
    media_upload_json([
        'success' => false,
        'message' => 'Không có file hợp lệ nào được lưu.',
    ], 422);
}

media_upload_json([
    'success' => true,
    'message' => 'Đã tải media lên máy chủ.',
    'items' => $items,
]);
