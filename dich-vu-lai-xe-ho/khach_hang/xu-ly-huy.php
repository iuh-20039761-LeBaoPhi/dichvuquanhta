<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-donhangsdt.php';

function taixe_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
}

function taixe_lower(string $value): string
{
    $trimmed = trim($value);
    return function_exists('mb_strtolower') ? mb_strtolower($trimmed, 'UTF-8') : strtolower($trimmed);
}

function taixe_parse_plan_datetime(string $dateText, string $timeText): ?DateTimeImmutable
{
    $dateText = trim($dateText);
    if ($dateText === '') {
        return null;
    }

    $timeText = trim($timeText);
    if ($timeText === '') {
        $timeText = '00:00:00';
    } elseif (preg_match('/^\d{1,2}:\d{1,2}$/', $timeText) === 1) {
        $timeText .= ':00';
    }

    try {
        return new DateTimeImmutable($dateText . ' ' . $timeText, new DateTimeZone('Asia/Ho_Chi_Minh'));
    } catch (Throwable $e) {
        return null;
    }
}

function taixe_has_driver(array $invoice): bool
{
    return (int)($invoice['id_taixe'] ?? 0) > 0
        || trim((string)($invoice['ten_taixe'] ?? '')) !== '';
}

function taixe_status_is_cancelled(string $status): bool
{
    $raw = taixe_lower($status);
    return $raw !== '' && (
        strpos($raw, 'huy') !== false
        || strpos($raw, 'hủy') !== false
        || strpos($raw, 'cancel') !== false
    );
}

function taixe_status_is_overdue(string $status): bool
{
    $raw = taixe_lower($status);
    return $raw !== '' && (
        strpos($raw, 'qua han') !== false
        || strpos($raw, 'quá hạn') !== false
        || strpos($raw, 'overdue') !== false
        || strpos($raw, 'expired') !== false
    );
}

function taixe_status_is_completed(string $status): bool
{
    $raw = taixe_lower($status);
    return $raw !== '' && (
        strpos($raw, 'hoan thanh') !== false
        || strpos($raw, 'hoàn thành') !== false
        || strpos($raw, 'ket thuc') !== false
        || strpos($raw, 'kết thúc') !== false
        || strpos($raw, 'complete') !== false
    );
}

function taixe_krud_call(array $payload): array
{
    $url = 'https://api.dvqt.vn/krud/';
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        return ['success' => false, 'message' => 'Không tạo được payload API.'];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 20,
    ]);

    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if (!is_string($raw) || $raw === '') {
        return ['success' => false, 'message' => $err !== '' ? $err : 'Không nhận được phản hồi API.'];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['success' => false, 'message' => 'Phản hồi API không hợp lệ.'];
    }

    if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return ['success' => false, 'message' => (string)($decoded['error'] ?? $decoded['message'] ?? 'Cập nhật thất bại.')];
    }

    return ['success' => true, 'message' => 'Cập nhật thành công.'];
}

function taixe_update_status(int $invoiceId, string $status): array
{
    return taixe_krud_call([
        'action' => 'update',
        'table' => 'datlich_taixe',
        'id' => $invoiceId,
        'data' => [
            'trangthai' => $status,
        ],
    ]);
}

// ===== CÁC HÀM NÀY ĐÃ BỊ XÓA VÌ TRÙNG VỚI get-donhangsdt.php =====
// taixe_refresh_invoice_row() - ĐÃ XÓA
// taixe_refresh_invoice_rows() - ĐÃ XÓA
// taixe_can_cancel_invoice() - ĐÃ XÓA
// taixe_can_customer_review() - ĐÃ XÓA
// =================================================================

function taixe_normalize_upload_items(array $files): array
{
    if (!isset($files['name'])) {
        return [];
    }

    $names = $files['name'];
    $tmpNames = $files['tmp_name'] ?? [];
    $errors = $files['error'] ?? [];
    $sizes = $files['size'] ?? [];

    if (!is_array($names)) {
        return [[
            'name' => is_string($names) ? $names : '',
            'tmp_name' => is_string($tmpNames) ? $tmpNames : '',
            'error' => (int)(is_int($errors) ? $errors : UPLOAD_ERR_NO_FILE),
            'size' => (int)(is_int($sizes) ? $sizes : 0),
        ]];
    }

    $items = [];
    foreach ($names as $index => $name) {
        $items[] = [
            'name' => is_string($name) ? $name : '',
            'tmp_name' => is_string($tmpNames[$index] ?? null) ? (string)$tmpNames[$index] : '',
            'error' => (int)($errors[$index] ?? UPLOAD_ERR_NO_FILE),
            'size' => (int)($sizes[$index] ?? 0),
        ];
    }

    return $items;
}

function taixe_upload_review_media(array $files): array
{
    $items = taixe_normalize_upload_items($files);
    if (!$items) {
        return ['success' => true, 'paths' => []];
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

    $targetRelativeDir = 'assets/danhgia_kh';
    $targetAbsoluteDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'danhgia_kh';

    if (!is_dir($targetAbsoluteDir) && !mkdir($targetAbsoluteDir, 0775, true) && !is_dir($targetAbsoluteDir)) {
        return ['success' => false, 'message' => 'Không tạo được thư mục lưu media.'];
    }

    $savedRelativePaths = [];
    $savedAbsolutePaths = [];

    foreach ($items as $item) {
        $error = (int)($item['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        if ($error !== UPLOAD_ERR_OK) {
            foreach ($savedAbsolutePaths as $absolutePath) {
                @unlink($absolutePath);
            }
            return ['success' => false, 'message' => 'Upload media thất bại.'];
        }

        $tmpName = (string)($item['tmp_name'] ?? '');
        $size = (int)($item['size'] ?? 0);
        if ($tmpName === '' || !is_uploaded_file($tmpName) || $size <= 0 || $size > 25 * 1024 * 1024) {
            foreach ($savedAbsolutePaths as $absolutePath) {
                @unlink($absolutePath);
            }
            return ['success' => false, 'message' => 'File media không hợp lệ (tối đa 25MB/file).'];
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = $finfo ? (string)finfo_file($finfo, $tmpName) : '';
        if ($finfo) {
            finfo_close($finfo);
        }

        if (!isset($allowed[$mime])) {
            foreach ($savedAbsolutePaths as $absolutePath) {
                @unlink($absolutePath);
            }
            return ['success' => false, 'message' => 'Media chỉ hỗ trợ ảnh/video thông dụng.'];
        }

        $extension = $allowed[$mime];
        try {
            $token = bin2hex(random_bytes(4));
        } catch (Throwable $e) {
            $token = substr(md5(uniqid((string)mt_rand(), true)), 0, 8);
        }

        $filename = 'review_' . taixe_now()->format('YmdHis') . '_' . $token . '.' . $extension;
        $absolutePath = $targetAbsoluteDir . DIRECTORY_SEPARATOR . $filename;

        if (!move_uploaded_file($tmpName, $absolutePath)) {
            foreach ($savedAbsolutePaths as $saved) {
                @unlink($saved);
            }
            return ['success' => false, 'message' => 'Không lưu được media đánh giá.'];
        }

        $savedAbsolutePaths[] = $absolutePath;
        $savedRelativePaths[] = $targetRelativeDir . '/' . $filename;
    }

    return ['success' => true, 'paths' => $savedRelativePaths];
}

function taixe_cancel_invoice(int $invoiceId, string $sessionPhone): array
{
    if ($invoiceId <= 0) {
        return ['success' => false, 'message' => 'Mã đơn hàng không hợp lệ.'];
    }

    $invoiceResult = getDonHangBySessionSdt($sessionPhone, $invoiceId);
    $invoice = is_array($invoiceResult['row'] ?? null) ? $invoiceResult['row'] : null;
    if ($invoice === null) {
        return ['success' => false, 'message' => 'Không tìm thấy đơn hàng hoặc bạn không có quyền hủy.'];
    }

    // Gọi hàm từ get-donhangsdt.php (đã được require ở trên)
    $invoice = taixe_refresh_invoice_row($invoice);
    $canCancel = taixe_can_cancel_invoice($invoice);
    if (($canCancel['ok'] ?? false) !== true) {
        return ['success' => false, 'message' => (string)($canCancel['message'] ?? 'Không thể hủy đơn.')];
    }

    $cancelAt = taixe_now()->format('Y-m-d H:i:s');

    $updated = taixe_krud_call([
        'action' => 'update',
        'table' => 'datlich_taixe',
        'id' => $invoiceId,
        'data' => [
            'trangthai' => 'đã hủy',
            'ngayhuy' => $cancelAt,
        ],
    ]);

    if (($updated['success'] ?? false) !== true) {
        return ['success' => false, 'message' => (string)($updated['message'] ?? 'Hủy đơn thất bại.')];
    }

    return ['success' => true, 'message' => 'Hủy đơn thành công.'];
}

function taixe_save_customer_review(int $invoiceId, string $sessionPhone, string $reviewText, array $reviewFiles): array
{
    if ($invoiceId <= 0) {
        return ['success' => false, 'message' => 'Mã đơn hàng không hợp lệ.'];
    }

    $invoiceResult = getDonHangBySessionSdt($sessionPhone, $invoiceId);
    $invoice = is_array($invoiceResult['row'] ?? null) ? $invoiceResult['row'] : null;
    if ($invoice === null) {
        return ['success' => false, 'message' => 'Không tìm thấy đơn hàng hoặc bạn không có quyền đánh giá.'];
    }

    // Gọi hàm từ get-donhangsdt.php (đã được require ở trên)
    $invoice = taixe_refresh_invoice_row($invoice);
    $canReview = taixe_can_customer_review($invoice);
    if (($canReview['ok'] ?? false) !== true) {
        return ['success' => false, 'message' => (string)($canReview['message'] ?? 'Không đủ điều kiện đánh giá.')];
    }

    $reviewText = trim($reviewText);
    $uploadResult = taixe_upload_review_media($reviewFiles);
    if (($uploadResult['success'] ?? false) !== true) {
        return ['success' => false, 'message' => (string)($uploadResult['message'] ?? 'Upload media thất bại.')];
    }

    $mediaPaths = is_array($uploadResult['paths'] ?? null) ? $uploadResult['paths'] : [];
    if ($reviewText === '' && !$mediaPaths) {
        return ['success' => false, 'message' => 'Vui lòng nhập nội dung hoặc tải lên ít nhất 1 media.'];
    }

    $mediaJson = $mediaPaths ? (string)json_encode($mediaPaths, JSON_UNESCAPED_UNICODE) : '';

    $saved = taixe_krud_call([
        'action' => 'update',
        'table' => 'datlich_taixe',
        'id' => $invoiceId,
        'data' => [
            'danhgia_khachhang' => $reviewText,
            'media_danhgia_khachhang' => $mediaJson,
            'thoigian_danhgia_khachhang' => taixe_now()->format('Y-m-d H:i:s'),
        ],
    ]);

    if (($saved['success'] ?? false) !== true) {
        return ['success' => false, 'message' => (string)($saved['message'] ?? 'Lưu đánh giá thất bại.')];
    }

    return ['success' => true, 'message' => 'Lưu đánh giá thành công.'];
}

function taixe_sanitize_return_to(string $returnTo, string $fallback): string
{
    $returnTo = trim($returnTo);
    if (
        $returnTo === ''
        || preg_match('/^(https?:)?\/\//i', $returnTo)
        || strpos($returnTo, '..') !== false
    ) {
        return $fallback;
    }

    return $returnTo;
}

function taixe_redirect_result(string $returnTo, array $result): void
{
    $query = (($result['success'] ?? false) === true)
        ? '?ok=1&msg=' . rawurlencode((string)($result['message'] ?? 'Thành công'))
        : '?ok=0&msg=' . rawurlencode((string)($result['message'] ?? 'Thất bại'));

    $separator = strpos($returnTo, '?') === false ? '?' : '&';
    header('Location: ' . $returnTo . $separator . ltrim($query, '?'));
    exit;
}

function taixe_handle_post_request(): void
{
    $user = session_user_require_customer('../login.html', '../danh-sach-don-hang.php');
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Location: ../danh-sach-don-hang.php');
        exit;
    }

    $invoiceId = (int)($_POST['invoice_id'] ?? 0);
    $sessionPhone = (string)($user['sodienthoai'] ?? '');
    $action = trim((string)($_POST['action'] ?? 'cancel'));

    if ($action === 'save_review') {
        $result = taixe_save_customer_review(
            $invoiceId,
            $sessionPhone,
            (string)($_POST['review_text'] ?? ''),
            is_array($_FILES['review_media'] ?? null) ? $_FILES['review_media'] : []
        );

        $defaultReturn = $invoiceId > 0 ? ('../chi-tiet-don-hang.php?id=' . $invoiceId) : '../danh-sach-don-hang.php';
        $returnTo = taixe_sanitize_return_to((string)($_POST['return_to'] ?? ''), $defaultReturn);
        taixe_redirect_result($returnTo, $result);
        return;
    }

    // Mặc định: hủy đơn
    $result = taixe_cancel_invoice($invoiceId, $sessionPhone);
    $returnTo = taixe_sanitize_return_to((string)($_POST['return_to'] ?? ''), '../danh-sach-don-hang.php');
    taixe_redirect_result($returnTo, $result);
}

function taixe_is_direct_request(): bool
{
    $script = realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? ''));
    return is_string($script) && $script !== '' && $script === __FILE__;
}

if (taixe_is_direct_request()) {
    taixe_handle_post_request();
}
?>