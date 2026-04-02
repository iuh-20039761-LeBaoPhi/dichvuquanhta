<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

/** Tra JSON ket qua ra client. */
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

/** Xac dinh folder upload theo loai tai khoan. */
function upload_folders_by_type(string $accountType): ?array
{
    if ($accountType === 'khachhang') {
        return [
            'anh_dai_dien' => 'assets/khachhang/anhdaidien',
            'cccd_mat_truoc' => 'assets/khachhang/cccdmattruoc',
            'cccd_mat_sau' => 'assets/khachhang/cccdmatsau',
        ];
    }

    if ($accountType === 'nhanvien') {
        return [
            'anh_dai_dien' => 'assets/nhacungcap/anhdaidien',
            'cccd_mat_truoc' => 'assets/nhacungcap/cccdmattruoc',
            'cccd_mat_sau' => 'assets/nhacungcap/cccdmatsau',
        ];
    }

    return null;
}

/** Upload mot file anh, tra ve duong dan luu DB. */
function save_image(string $inputName, string $targetDir): array
{
    if (!isset($_FILES[$inputName]) || !is_array($_FILES[$inputName])) {
        return ['success' => false, 'message' => 'Thieu file: ' . $inputName];
    }

    $file = $_FILES[$inputName];
    if ((int)($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['success' => false, 'message' => 'Upload file loi: ' . $inputName];
    }

    $tmpPath = (string)($file['tmp_name'] ?? '');
    if ($tmpPath === '' || !is_uploaded_file($tmpPath)) {
        return ['success' => false, 'message' => 'File upload khong hop le: ' . $inputName];
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
    ];

    if (!isset($allowed[$mime])) {
        return ['success' => false, 'message' => 'Dinh dang anh khong hop le: ' . $inputName];
    }

    $extension = $allowed[$mime];
    $safeDir = str_replace(['..', '\\'], ['', '/'], $targetDir);
    $absoluteDir = __DIR__ . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $safeDir);

    if (!is_dir($absoluteDir) && !mkdir($absoluteDir, 0775, true) && !is_dir($absoluteDir)) {
        return ['success' => false, 'message' => 'Khong tao duoc thu muc upload'];
    }

    $filename = $inputName . '_' . date('YmdHis') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $absolutePath = $absoluteDir . DIRECTORY_SEPARATOR . $filename;

    if (!move_uploaded_file($tmpPath, $absolutePath)) {
        return ['success' => false, 'message' => 'Khong luu duoc file: ' . $inputName];
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

$accountType = trim((string)($_POST['account_type'] ?? ''));
$folders = upload_folders_by_type($accountType);
if ($folders === null) {
    send_json(false, 'Loai tai khoan khong hop le');
}

$avatar = save_image('anh_dai_dien', $folders['anh_dai_dien']);
if (!$avatar['success']) {
    send_json(false, (string)$avatar['message']);
}

$front = save_image('cccd_mat_truoc', $folders['cccd_mat_truoc']);
if (!$front['success']) {
    @unlink((string)($avatar['absolute_path'] ?? ''));
    send_json(false, (string)$front['message']);
}

$back = save_image('cccd_mat_sau', $folders['cccd_mat_sau']);
if (!$back['success']) {
    @unlink((string)($avatar['absolute_path'] ?? ''));
    @unlink((string)($front['absolute_path'] ?? ''));
    send_json(false, (string)$back['message']);
}

send_json(true, 'Upload anh thanh cong', [
    'anh_dai_dien' => (string)$avatar['path'],
    'cccd_mat_truoc' => (string)$front['path'],
    'cccd_mat_sau' => (string)$back['path'],
]);
