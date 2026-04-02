<?php
/**
 * Simple Upload API for Tho Nha
 * PATH: api/public/upload.php
 */
require_once __DIR__ . '/../../config/session-config.php';

header('Content-Type: application/json; charset=utf-8');

// ── Chỉ chấp nhận POST ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    jsonResponse(false, 'Method Not Allowed');
}

// ── Đã nhận được tệp? ───────────────────────────────────────
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(false, 'Không nhận được tệp hoặc có lỗi xảy ra khi tải lên');
}

$file   = $_FILES['file'];
$name   = $_POST['name'] ?? $file['name']; // Tên tệp đích (đã đổi theo SĐT từ JS)
$folder = $_POST['folder'] ?? 'providers';   // Thư mục lưu trữ (providers, customer, ...)

// Bảo mật: Giới hạn thư mục hợp lệ
$allowedFolders = ['providers', 'customer', 'banners', 'services', 'temp'];
if (!in_array($folder, $allowedFolders)) {
    jsonResponse(false, 'Thư mục lưu trữ không hợp lệ');
}

// Đường dẫn lưu trữ tuyệt đối
$targetDir = __DIR__ . '/../../uploads/' . $folder . '/';
if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0777, true)) {
        jsonResponse(false, 'Không thể tạo thư mục lưu trữ: ' . $folder);
    }
}

// Làm sạch tên tệp để tránh tấn công path traversal
$cleanName = preg_replace('/[^a-zA-Z0-9_\-\.]/', '', basename($name));
$targetFile = $targetDir . $cleanName;

// ── Di chuyển tệp từ bộ nhớ tạm vào thư mục đích ──────────────
if (move_uploaded_file($file['tmp_name'], $targetFile)) {
    jsonResponse(true, 'Tải lên thành công', [
        'filename' => $cleanName,
        'path'     => 'uploads/' . $folder . '/' . $cleanName
    ]);
} else {
    jsonResponse(false, 'Thất bại khi lưu tệp vào thư mục đích');
}
