<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Phương thức không được hỗ trợ.']);
    exit;
}

if (!isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'message' => 'Không có tệp nào được tải lên.']);
    exit;
}

$file = $_FILES['file'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// Chỉ cho phép .jpg và tối đa 5MB
if ($ext !== 'jpg' && $ext !== 'jpeg') {
    echo json_encode(['success' => false, 'message' => 'Chỉ hỗ trợ tệp định dạng .jpg']);
    exit;
}

if ($file['size'] > 5 * 1024 * 1024) {
    echo json_encode(['success' => false, 'message' => 'Kích thước tệp quá lớn (tối đa 5MB)']);
    exit;
}

$uploadDir = __DIR__ . '/asset/image/';

// Đảm bảo thư mục tồn tại
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0775, true);
}

// Giữ nguyên tên gốc của file
$filename = basename($file['name']);
$targetPath = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    echo json_encode([
        'success' => true,
        'message' => 'Tải tệp thành công.',
        'filename' => $filename
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Không thể di chuyển tệp tải lên.']);
}
