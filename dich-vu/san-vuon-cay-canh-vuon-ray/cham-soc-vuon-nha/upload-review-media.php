<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function send_json(bool $success, string $message, array $data = []): void
{
    http_response_code($success ? 200 : 400);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function get_review_folder(string $role): ?string
{
    if ($role === 'khachhang') {
        return 'assets/danhgia_kh';
    }

    if ($role === 'nhacungcap' || $role === 'nhanvien' || $role === 'staff') {
        return 'assets/danhgia_ncc';
    }

    return null;
}

function normalize_files_array(array $files): array
{
    $normalized = [];
    $names = $files['name'] ?? [];
    $types = $files['type'] ?? [];
    $tmpNames = $files['tmp_name'] ?? [];
    $errors = $files['error'] ?? [];
    $sizes = $files['size'] ?? [];

    if (!is_array($names)) {
        return [];
    }

    foreach ($names as $i => $name) {
        $normalized[] = [
            'name' => is_string($name) ? $name : '',
            'type' => is_string($types[$i] ?? null) ? (string)$types[$i] : '',
            'tmp_name' => is_string($tmpNames[$i] ?? null) ? (string)$tmpNames[$i] : '',
            'error' => (int)($errors[$i] ?? UPLOAD_ERR_NO_FILE),
            'size' => (int)($sizes[$i] ?? 0),
        ];
    }

    return $normalized;
}

function save_media_file(array $file, string $targetDir): array
{
    $error = (int)($file['error'] ?? UPLOAD_ERR_NO_FILE);
    if ($error !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => 'Upload file loi'];
    }

    $tmpPath = (string)($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        return ['success' => false, 'message' => 'File upload khong hop le'];
    }

    $size = (int)($file['size'] ?? 0);
    if ($size <= 0 || $size > 25 * 1024 * 1024) {
        return ['success' => false, 'message' => 'Moi file toi da 25MB'];
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = $finfo ? (string)finfo_file($finfo, $tmpPath) : '';
    if ($finfo) {
        finfo_close($finfo);
    }

    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
        'video/mp4' => 'mp4',
        'video/webm' => 'webm',
        'video/ogg' => 'ogg',
        'video/quicktime' => 'mov',
    ];

    if (!isset($allowed[$mime])) {
        return ['success' => false, 'message' => 'Dinh dang file khong hop le'];
    }

    $safeDir = str_replace(['..', '\\'], ['', '/'], $targetDir);
    $absoluteDir = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $safeDir);

    if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0775, true) && !is_dir($absoluteDir)) {
        return ['success' => false, 'message' => 'Khong tao duoc thu muc upload'];
    }

    $extension = $allowed[$mime];
    $filename = 'review_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $absolutePath = $absoluteDir . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($tmpPath, $absolutePath)) {
        return ['success' => false, 'message' => 'Khong luu duoc file'];
    }

    return [
        'success' => true,
        'path' => $safeDir . '/' . $filename,
        'absolute_path' => $absolutePath,
    ];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(false, 'Chi ho tro POST');
}

$reviewRole = trim((string)($_POST['review_role'] ?? ''));
$targetFolder = get_review_folder($reviewRole);
if ($targetFolder === null) {
    send_json(false, 'Vai tro upload khong hop le');
}

if (!isset($_FILES['media_files']) || !is_array($_FILES['media_files'])) {
    send_json(false, 'Khong co file media');
}

$files = normalize_files_array($_FILES['media_files']);
if (!$files) {
    send_json(false, 'Khong co file media');
}

$paths = [];
$absPaths = [];

foreach ($files as $file) {
    $saved = save_media_file($file, $targetFolder);
    if (!($saved['success'] ?? false)) {
        foreach ($absPaths as $absPath) {
            @unlink($absPath);
        }
        send_json(false, (string)($saved['message'] ?? 'Upload that bai'));
    }
    $paths[] = (string)$saved['path'];
    $absPaths[] = (string)$saved['absolute_path'];
}

send_json(true, 'Upload media thanh cong', ['paths' => $paths]);
