<?php
declare(strict_types=1);

if (!function_exists('dichvu_slugify_name')) {
    function dichvu_slugify_name(string $value): string
    {
        $value = trim($value);
        if ($value === '') {
            return 'dich-vu';
        }

        if (function_exists('iconv')) {
            $converted = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
            if (is_string($converted) && $converted !== '') {
                $value = $converted;
            }
        }

        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? 'dich-vu';
        $value = trim($value, '-');

        return $value !== '' ? $value : 'dich-vu';
    }
}

if (!function_exists('dichvu_upload_service_image')) {
    function dichvu_upload_service_image(?array $file, string $serviceName, bool $required): array
    {
        if (!is_array($file) || !isset($file['error'])) {
            if ($required) {
                return ['success' => false, 'message' => 'Vui long chon anh dich vu.'];
            }

            return ['success' => true, 'path' => ''];
        }

        $error = (int)$file['error'];
        if ($error === UPLOAD_ERR_NO_FILE) {
            if ($required) {
                return ['success' => false, 'message' => 'Vui long chon anh dich vu.'];
            }

            return ['success' => true, 'path' => ''];
        }

        if ($error !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'Tai anh that bai (ma loi ' . $error . ').'];
        }

        $tmpName = (string)($file['tmp_name'] ?? '');
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            return ['success' => false, 'message' => 'Tap tin tai len khong hop le.'];
        }

        $size = (int)($file['size'] ?? 0);
        $maxSize = 5 * 1024 * 1024;
        if ($size <= 0 || $size > $maxSize) {
            return ['success' => false, 'message' => 'Kich thuoc anh phai nho hon hoac bang 5MB.'];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? (string)finfo_file($finfo, $tmpName) : '';
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
            return ['success' => false, 'message' => 'Chi ho tro anh JPG, PNG, WEBP hoac GIF.'];
        }

        $baseName = dichvu_slugify_name($serviceName);
        $ext = $allowed[$mime];
        $random = bin2hex(random_bytes(3));
        $fileName = $baseName . '-' . date('YmdHis') . '-' . $random . '.' . $ext;

        $projectRoot = dirname(__DIR__);
        $assetsDir = $projectRoot . DIRECTORY_SEPARATOR . 'assets';

        if (!is_dir($assetsDir) && !mkdir($assetsDir, 0775, true) && !is_dir($assetsDir)) {
            return ['success' => false, 'message' => 'Khong the tao thu muc assets.'];
        }

        $targetPath = $assetsDir . DIRECTORY_SEPARATOR . $fileName;
        if (!move_uploaded_file($tmpName, $targetPath)) {
            return ['success' => false, 'message' => 'Khong the luu anh vao thu muc assets.'];
        }

        return [
            'success' => true,
            'path' => 'assets/' . $fileName,
        ];
    }
}
