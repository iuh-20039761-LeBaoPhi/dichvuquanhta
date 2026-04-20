<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function jsonResponse(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(405, [
        'success' => false,
        'message' => 'Phuong thuc khong duoc ho tro.',
    ]);
}

if (!isset($_FILES['files'])) {
    jsonResponse(400, [
        'success' => false,
        'message' => 'Khong co tep duoc tai len.',
    ]);
}

$allowedMime = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    'video/mp4' => 'mp4',
    'video/webm' => 'webm',
    'video/quicktime' => 'mov',
    'video/ogg' => 'ogg',
];

$maxSize = 30 * 1024 * 1024; // 30MB/file
$uploadDir = __DIR__ . '/asset/image/upload/danhgia';
$publicPrefix = 'public/asset/image/upload/danhgia/';

if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Khong the tao thu muc luu tep.',
    ]);
}

$fileField = $_FILES['files'];
$names = is_array($fileField['name'] ?? null) ? $fileField['name'] : [$fileField['name'] ?? ''];
$tmpNames = is_array($fileField['tmp_name'] ?? null) ? $fileField['tmp_name'] : [$fileField['tmp_name'] ?? ''];
$sizes = is_array($fileField['size'] ?? null) ? $fileField['size'] : [$fileField['size'] ?? 0];
$errors = is_array($fileField['error'] ?? null) ? $fileField['error'] : [$fileField['error'] ?? UPLOAD_ERR_NO_FILE];

$savedFiles = [];
$finfo = finfo_open(FILEINFO_MIME_TYPE);

if (!$finfo) {
    jsonResponse(500, [
        'success' => false,
        'message' => 'Khong khoi tao duoc bo kiem tra MIME.',
    ]);
}

foreach ($tmpNames as $index => $tmpPath) {
    $errorCode = (int) ($errors[$index] ?? UPLOAD_ERR_NO_FILE);
    if ($errorCode === UPLOAD_ERR_NO_FILE) {
        continue;
    }

    if ($errorCode !== UPLOAD_ERR_OK || !is_uploaded_file((string) $tmpPath)) {
        finfo_close($finfo);
        jsonResponse(400, [
            'success' => false,
            'message' => 'Tep tai len khong hop le.',
        ]);
    }

    $size = (int) ($sizes[$index] ?? 0);
    if ($size <= 0 || $size > $maxSize) {
        finfo_close($finfo);
        jsonResponse(400, [
            'success' => false,
            'message' => 'Kich thuoc tep vuot qua gioi han 30MB.',
        ]);
    }

    $mime = (string) finfo_file($finfo, (string) $tmpPath);
    if (!isset($allowedMime[$mime])) {
        finfo_close($finfo);
        jsonResponse(400, [
            'success' => false,
            'message' => 'Chi ho tro anh/video dinh dang pho bien.',
        ]);
    }

    $ext = $allowedMime[$mime];
    $safeName = 'review_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $targetPath = $uploadDir . DIRECTORY_SEPARATOR . $safeName;

    if (!move_uploaded_file((string) $tmpPath, $targetPath)) {
        finfo_close($finfo);
        jsonResponse(500, [
            'success' => false,
            'message' => 'Khong the luu tep tai len.',
        ]);
    }

    $savedFiles[] = $publicPrefix . $safeName;
}

finfo_close($finfo);

if (!$savedFiles) {
    jsonResponse(400, [
        'success' => false,
        'message' => 'Khong co tep hop le de luu.',
    ]);
}

jsonResponse(200, [
    'success' => true,
    'message' => 'Tai tep thanh cong.',
    'files' => $savedFiles,
]);
