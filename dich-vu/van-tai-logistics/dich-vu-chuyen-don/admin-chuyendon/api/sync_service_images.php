<?php
declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
moving_admin_require_login();

header('Content-Type: application/json; charset=utf-8');

$scriptUrl = 'https://script.google.com/macros/s/AKfycbxtMgHP8YRAaDO1U_4oqYjFEWUgSjemT2jk1q9baoW6KXz2ggfR-bfmLnuZSiZkIAMAuA/exec';
$folderKey = 12; // Chuyển sang kiểu int cho đồng bộ

$publicPath = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public';
$jsonPath = $publicPath
    . DIRECTORY_SEPARATOR . 'assets'
    . DIRECTORY_SEPARATOR . 'js'
    . DIRECTORY_SEPARATOR . 'data'
    . DIRECTORY_SEPARATOR . 'dich-vu-chuyen-don-page.json';

function sync_json_response(bool $success, array $payload = [], int $statusCode = 200): void
{
    http_response_code($statusCode);
    echo json_encode(
        array_merge(['success' => $success], $payload),
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );
    exit;
}

function is_remote_url(string $value): bool
{
    return preg_match('/^https?:\/\//i', trim($value)) === 1;
}

function build_public_path(string $publicPath, string $relativePath): string
{
    return rtrim($publicPath, DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR
        . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($relativePath, "/\\"));
}

function resolve_local_image_path(string $imagePath, string $publicPath): array
{
    $imagePath = trim($imagePath);

    if ($imagePath === '') {
        return [
            'found' => false,
            'path' => '',
            'tried' => [],
            'message' => 'Đường dẫn ảnh rỗng',
        ];
    }

    if (str_contains($imagePath, '..')) {
        return [
            'found' => false,
            'path' => '',
            'tried' => [],
            'message' => "Đường dẫn ảnh không hợp lệ: {$imagePath}",
        ];
    }

    $cleanPath = ltrim($imagePath, "/\\");
    $candidatePaths = [];

    // 1. Đường dẫn như JSON đang ghi
    $candidatePaths[] = build_public_path($publicPath, $cleanPath);

    // 2. Fix case JSON ghi images/xxx.png nhưng file nằm public/assets/images/xxx.png
    if (preg_match('/^images[\/\\\\]/i', $cleanPath)) {
        $candidatePaths[] = build_public_path($publicPath, 'assets' . DIRECTORY_SEPARATOR . $cleanPath);
    }

    // 3. Fix case JSON chỉ ghi tên file xxx.png
    if (!str_contains($cleanPath, '/') && !str_contains($cleanPath, '\\')) {
        $candidatePaths[] = build_public_path($publicPath, 'assets/images/' . $cleanPath);
        $candidatePaths[] = build_public_path($publicPath, 'images/' . $cleanPath);
    }

    $candidatePaths = array_values(array_unique($candidatePaths));

    foreach ($candidatePaths as $path) {
        if (is_file($path)) {
            return [
                'found' => true,
                'path' => $path,
                'tried' => $candidatePaths,
                'message' => 'Tìm thấy file',
            ];
        }
    }

    return [
        'found' => false,
        'path' => $candidatePaths[0] ?? '',
        'tried' => $candidatePaths,
        'message' => 'File không tồn tại ở các path đã thử',
    ];
}

function upload_local_file_to_drive(string $localPath, string $scriptUrl, string|int $folderKey): array
{
    if (!is_file($localPath)) {
        return [
            'success' => false,
            'message' => 'File không tồn tại',
            'local_path' => $localPath,
        ];
    }

    if (!is_readable($localPath)) {
        return [
            'success' => false,
            'message' => 'File không đọc được',
            'local_path' => $localPath,
        ];
    }

    $fileContent = file_get_contents($localPath);
    if ($fileContent === false) {
        return [
            'success' => false,
            'message' => 'Không thể đọc nội dung file',
            'local_path' => $localPath,
        ];
    }

    $mimeType = mime_content_type($localPath) ?: 'application/octet-stream';

    $payload = [
        'name' => basename($localPath),
        'type' => $mimeType,
        'file' => base64_encode($fileContent),
        'folderKey' => (int) $folderKey,
    ];

    error_log('SYNC_IMAGES: Uploading file = ' . basename($localPath));
    error_log('SYNC_IMAGES: localPath = ' . $localPath);
    error_log('SYNC_IMAGES: mimeType = ' . $mimeType);
    error_log('SYNC_IMAGES: fileSize = ' . (string) filesize($localPath));

    $ch = curl_init($scriptUrl);
    if ($ch === false) {
        return [
            'success' => false,
            'message' => 'Không thể khởi tạo cURL',
            'local_path' => $localPath,
        ];
    }

    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_CONNECTTIMEOUT => 15,
        CURLOPT_TIMEOUT => 120,
    ]);

    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        return [
            'success' => false,
            'message' => 'Lỗi cURL: ' . $curlError,
            'local_path' => $localPath,
            'http_code' => $httpCode,
        ];
    }

    $result = json_decode((string) $response, true);

    if (!is_array($result)) {
        return [
            'success' => false,
            'message' => 'Apps Script trả về không phải JSON hợp lệ',
            'local_path' => $localPath,
            'http_code' => $httpCode,
            'raw_response' => mb_substr((string) $response, 0, 500),
        ];
    }

    // Apps Script chuẩn trả về {status: "success", fileId: "..."}
    if (($result['status'] ?? '') !== 'success' || empty($result['fileId'])) {
        return [
            'success' => false,
            'message' => $result['message'] ?? 'Apps Script upload thất bại',
            'local_path' => $localPath,
            'http_code' => $httpCode,
            'apps_script_response' => $result,
        ];
    }

    $fileId = (string) $result['fileId'];
    $viewUrl = "https://lh3.googleusercontent.com/u/0/d/" . $fileId;

    return [
        'success' => true,
        'url' => $viewUrl,
        'fileId' => $fileId,
        'local_path' => $localPath,
        'http_code' => $httpCode,
    ];
}

try {
    if (!is_file($jsonPath)) {
        throw new RuntimeException('Không tìm thấy file JSON nội dung dịch vụ.');
    }

    if (!is_readable($jsonPath)) {
        throw new RuntimeException('File JSON không đọc được.');
    }

    $jsonRaw = file_get_contents($jsonPath);
    if ($jsonRaw === false || trim($jsonRaw) === '') {
        throw new RuntimeException('File JSON rỗng hoặc không thể đọc.');
    }

    $data = json_decode($jsonRaw, true);
    if (!is_array($data)) {
        throw new RuntimeException('Dữ liệu JSON không hợp lệ: ' . json_last_error_msg());
    }

    if (!isset($data['services']) || !is_array($data['services'])) {
        sync_json_response(true, [
            'synced_count' => 0,
            'message' => 'Không có services để đồng bộ.',
            'items' => [],
        ]);
    }

    $syncedCount = 0;
    $items = [];
    $hasChanged = false;

    foreach ($data['services'] as $index => &$svc) {
        if (!is_array($svc)) {
            $items[] = [
                'index' => $index,
                'success' => false,
                'message' => 'Service không hợp lệ',
            ];
            continue;
        }

        $currentImg = trim((string) ($svc['image'] ?? ''));

        if ($currentImg === '') {
            $items[] = [
                'index' => $index,
                'success' => true,
                'skipped' => true,
                'reason' => 'Không có ảnh',
            ];
            continue;
        }

        if (is_remote_url($currentImg)) {
            $items[] = [
                'index' => $index,
                'success' => true,
                'skipped' => true,
                'reason' => 'Ảnh đã là URL online',
                'image' => $currentImg,
            ];
            continue;
        }

        $resolved = resolve_local_image_path($currentImg, $publicPath);

        if (($resolved['found'] ?? false) !== true) {
            $items[] = [
                'index' => $index,
                'success' => false,
                'image' => $currentImg,
                'message' => $resolved['message'] ?? 'Không tìm thấy file ảnh',
                'tried_paths' => $resolved['tried'] ?? [],
            ];
            continue;
        }

        $fullLocalPath = (string) $resolved['path'];

        $uploadResult = upload_local_file_to_drive($fullLocalPath, $scriptUrl, $folderKey);

        if (($uploadResult['success'] ?? false) === true) {
            $svc['image'] = $uploadResult['url'];
            $syncedCount++;
            $hasChanged = true;

            $items[] = [
                'index' => $index,
                'success' => true,
                'old_image' => $currentImg,
                'local_path' => $fullLocalPath,
                'new_image' => $uploadResult['url'],
            ];
        } else {
            $items[] = [
                'index' => $index,
                'success' => false,
                'image' => $currentImg,
                'local_path' => $fullLocalPath,
                'message' => $uploadResult['message'] ?? 'Upload thất bại',
                'detail' => $uploadResult,
            ];
        }
    }
    unset($svc);

    if ($hasChanged) {
        $data['updated_at'] = date('c');

        $newJson = json_encode(
            $data,
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        if ($newJson === false) {
            throw new RuntimeException('Không thể encode JSON mới: ' . json_last_error_msg());
        }

        $writeResult = file_put_contents($jsonPath, $newJson, LOCK_EX);
        if ($writeResult === false) {
            throw new RuntimeException('Không thể ghi lại file JSON.');
        }
    }

    sync_json_response(true, [
        'debug' => [
            'public_path' => $publicPath,
            'json_path' => $jsonPath,
            'json_exists' => is_file($jsonPath),
            'services_count' => count($data['services'] ?? []),
        ],
        'synced_count' => $syncedCount,
        'updated_json' => $hasChanged,
        'items' => $items,
    ]);
} catch (Throwable $e) {
    error_log(
        'SYNC_IMAGES ERROR: '
        . $e->getMessage()
        . ' | line ' . $e->getLine()
        . ' | file ' . $e->getFile()
    );

    sync_json_response(false, [
        'message' => $e->getMessage(),
    ], 500);
}
