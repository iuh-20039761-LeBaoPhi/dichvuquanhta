<?php
declare(strict_types=1);

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadonsdt.php';

function mevabe_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
}

function mevabe_lower(string $value): string
{
    $trimmed = trim($value);
    return function_exists('mb_strtolower') ? mb_strtolower($trimmed, 'UTF-8') : strtolower($trimmed);
}

function mevabe_parse_plan_datetime(string $dateText, string $timeText): ?DateTimeImmutable
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

function mevabe_has_staff(array $invoice): bool
{
    return (int)($invoice['id_nhacungcap'] ?? 0) > 0
        || trim((string)($invoice['tenncc'] ?? '')) !== ''
        || trim((string)($invoice['hotenncc'] ?? '')) !== ''
        || trim((string)($invoice['nhacungcapnhan'] ?? '')) !== ''
        || trim((string)($invoice['sdtncc'] ?? '')) !== ''
        || trim((string)($invoice['sodienthoaincc'] ?? '')) !== '';
}

    function mevabe_status_is_cancelled(string $status): bool
    {
        $raw = mevabe_lower($status);
        return $raw !== '' && (
            strpos($raw, 'huy') !== false
            || strpos($raw, 'hủy') !== false
            || strpos($raw, 'cancel') !== false
        );
    }

    function mevabe_status_is_overdue(string $status): bool
    {
        $raw = mevabe_lower($status);
        return $raw !== '' && (
            strpos($raw, 'qua han') !== false
            || strpos($raw, 'quá hạn') !== false
            || strpos($raw, 'overdue') !== false
            || strpos($raw, 'expired') !== false
        );
    }

    function mevabe_status_is_completed(string $status): bool
    {
        $raw = mevabe_lower($status);
        return $raw !== '' && (
            strpos($raw, 'hoan thanh') !== false
            || strpos($raw, 'hoàn thành') !== false
            || strpos($raw, 'ket thuc') !== false
            || strpos($raw, 'kết thúc') !== false
            || strpos($raw, 'complete') !== false
        );
    }

    function mevabe_krud_call(array $payload): array
    {
        $url = 'https://api.dvqt.vn/krud/';
        $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
        if ($body === false) {
            return ['success' => false, 'message' => 'Khong tao duoc payload API.'];
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
            return ['success' => false, 'message' => $err !== '' ? $err : 'Khong nhan duoc phan hoi API.'];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return ['success' => false, 'message' => 'Phan hoi API khong hop le.'];
        }

        if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
            return ['success' => false, 'message' => (string)($decoded['error'] ?? $decoded['message'] ?? 'Cap nhat that bai.')];
        }

        return ['success' => true, 'message' => 'Cap nhat thanh cong.'];
    }

    function mevabe_update_status(int $invoiceId, string $status): array
    {
        return mevabe_krud_call([
            'action' => 'update',
            'table' => 'datlich_mevabe',
            'id' => $invoiceId,
            'data' => [
                'trangthai' => $status,
            ],
        ]);
    }

    function mevabe_refresh_invoice_row(array $invoice): array
    {
        $invoiceId = (int)($invoice['id'] ?? 0);
        if ($invoiceId <= 0) {
            return $invoice;
        }

        $status = trim((string)($invoice['trangthai'] ?? ''));
        if (mevabe_status_is_cancelled($status)) {
            return $invoice;
        }

        $hasStaff = mevabe_has_staff($invoice);
        $now = mevabe_now();

        $startPlan = mevabe_parse_plan_datetime(
            (string)($invoice['ngay_bat_dau_kehoach'] ?? ''),
            (string)($invoice['gio_bat_dau_kehoach'] ?? '')
        );

        $endPlan = mevabe_parse_plan_datetime(
            (string)($invoice['ngay_ket_thuc_kehoach'] ?? ''),
            (string)($invoice['gio_ket_thuc_kehoach'] ?? '')
        );

        if (!$hasStaff && $startPlan instanceof DateTimeImmutable && $now > $startPlan && !mevabe_status_is_overdue($status) && !mevabe_status_is_completed($status)) {
            $updated = mevabe_update_status($invoiceId, 'quá hạn');
            if (($updated['success'] ?? false) === true) {
                $invoice['trangthai'] = 'quá hạn';
            }
            return $invoice;
        }

        if ($hasStaff && $endPlan instanceof DateTimeImmutable && $now > $endPlan && !mevabe_status_is_completed($status) && !mevabe_status_is_overdue($status)) {
            $updated = mevabe_update_status($invoiceId, 'hoàn thành');
            if (($updated['success'] ?? false) === true) {
                $invoice['trangthai'] = 'hoàn thành';
            }
        }

        return $invoice;
    }

    function mevabe_refresh_invoice_rows(array $rows): array
    {
        $result = [];
        foreach ($rows as $item) {
            if (!is_array($item)) {
                continue;
            }
            $result[] = mevabe_refresh_invoice_row($item);
        }
        return $result;
    }

    function mevabe_can_cancel_invoice(array $invoice): array
    {
        $status = trim((string)($invoice['trangthai'] ?? ''));
        if (mevabe_status_is_cancelled($status)) {
            return ['ok' => false, 'message' => 'Don da o trang thai da huy.'];
        }

        if (mevabe_status_is_overdue($status)) {
            return ['ok' => false, 'message' => 'Don da o trang thai qua han, khong the huy.'];
        }

        if (mevabe_status_is_completed($status)) {
            return ['ok' => false, 'message' => 'Don da hoan thanh, khong the huy.'];
        }

        if (trim((string)($invoice['thoigian_batdau_thucte'] ?? '')) !== '') {
            return ['ok' => false, 'message' => 'Don da bat dau thuc te, khong the huy.'];
        }

        if (trim((string)($invoice['thoigian_ketthuc_thucte'] ?? '')) !== '') {
            return ['ok' => false, 'message' => 'Don da ket thuc thuc te, khong the huy.'];
        }

        $hasStaff = mevabe_has_staff($invoice);
        $startPlan = mevabe_parse_plan_datetime(
            (string)($invoice['ngay_bat_dau_kehoach'] ?? ''),
            (string)($invoice['gio_bat_dau_kehoach'] ?? '')
        );

        if ($startPlan instanceof DateTimeImmutable && mevabe_now() >= $startPlan) {
            if (!$hasStaff) {
                return ['ok' => false, 'message' => 'Don da qua gio bat dau, he thong da chuyen qua han.'];
            }
            return ['ok' => false, 'message' => 'Don da qua gio bat dau ke hoach, khong the huy.'];
        }

        if ($hasStaff) {
            return ['ok' => false, 'message' => 'Don da co nhan vien nhan viec, khong the huy.'];
        }

        return ['ok' => true, 'message' => ''];
    }

    function mevabe_can_customer_review(array $invoice): array
    {
        $status = trim((string)($invoice['trangthai'] ?? ''));
        if (!mevabe_status_is_completed($status)) {
            return ['ok' => false, 'message' => 'Chi duoc danh gia khi don o trang thai hoan thanh.'];
        }

        if (mevabe_status_is_cancelled($status) || mevabe_status_is_overdue($status)) {
            return ['ok' => false, 'message' => 'Don dang o trang thai bi khoa danh gia.'];
        }

        if (!mevabe_has_staff($invoice)) {
            return ['ok' => false, 'message' => 'Don khong co nhan vien nhan, khong the danh gia.'];
        }

        return ['ok' => true, 'message' => ''];
    }

    function mevabe_normalize_upload_items(array $files): array
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

    function mevabe_upload_review_media(array $files): array
    {
        $items = mevabe_normalize_upload_items($files);
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
            return ['success' => false, 'message' => 'Khong tao duoc thu muc luu media.'];
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
                return ['success' => false, 'message' => 'Upload media that bai.'];
            }

            $tmpName = (string)($item['tmp_name'] ?? '');
            $size = (int)($item['size'] ?? 0);
            if ($tmpName === '' || !is_uploaded_file($tmpName) || $size <= 0 || $size > 25 * 1024 * 1024) {
                foreach ($savedAbsolutePaths as $absolutePath) {
                    @unlink($absolutePath);
                }
                return ['success' => false, 'message' => 'File media khong hop le (toi da 25MB/file).'];
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
                return ['success' => false, 'message' => 'Media chi ho tro anh/video thong dung.'];
            }

            $extension = $allowed[$mime];
            try {
                $token = bin2hex(random_bytes(4));
            } catch (Throwable $e) {
                $token = substr(md5(uniqid((string)mt_rand(), true)), 0, 8);
            }

            $filename = 'review_' . mevabe_now()->format('YmdHis') . '_' . $token . '.' . $extension;
            $absolutePath = $targetAbsoluteDir . DIRECTORY_SEPARATOR . $filename;

            if (!move_uploaded_file($tmpName, $absolutePath)) {
                foreach ($savedAbsolutePaths as $saved) {
                    @unlink($saved);
                }
                return ['success' => false, 'message' => 'Khong luu duoc media danh gia.'];
            }

            $savedAbsolutePaths[] = $absolutePath;
            $savedRelativePaths[] = $targetRelativeDir . '/' . $filename;
        }

        return ['success' => true, 'paths' => $savedRelativePaths];
    }

    function mevabe_cancel_invoice(int $invoiceId, string $sessionPhone): array
    {
        if ($invoiceId <= 0) {
            return ['success' => false, 'message' => 'Ma hoa don khong hop le.'];
        }

        $invoiceResult = getHoaDonBySessionSdt($sessionPhone, $invoiceId);
        $invoice = is_array($invoiceResult['row'] ?? null) ? $invoiceResult['row'] : null;
        if ($invoice === null) {
            return ['success' => false, 'message' => 'Khong tim thay hoa don hoac ban khong co quyen huy.'];
        }

        $invoice = mevabe_refresh_invoice_row($invoice);
        $canCancel = mevabe_can_cancel_invoice($invoice);
        if (($canCancel['ok'] ?? false) !== true) {
            return ['success' => false, 'message' => (string)($canCancel['message'] ?? 'Khong the huy don.')];
        }

        $cancelAt = mevabe_now()->format('Y-m-d H:i:s');

        $updated = mevabe_krud_call([
            'action' => 'update',
            'table' => 'datlich_mevabe',
            'id' => $invoiceId,
            'data' => [
                'trangthai' => 'đã hủy',
                'ngayhuy' => $cancelAt,
            ],
        ]);

        if (($updated['success'] ?? false) !== true) {
            return ['success' => false, 'message' => (string)($updated['message'] ?? 'Huy don that bai.')];
        }

        return ['success' => true, 'message' => 'Huy don thanh cong.'];
    }

    function mevabe_save_customer_review(int $invoiceId, string $sessionPhone, string $reviewText, array $reviewFiles): array
    {
        if ($invoiceId <= 0) {
            return ['success' => false, 'message' => 'Ma hoa don khong hop le.'];
        }

        $invoiceResult = getHoaDonBySessionSdt($sessionPhone, $invoiceId);
        $invoice = is_array($invoiceResult['row'] ?? null) ? $invoiceResult['row'] : null;
        if ($invoice === null) {
            return ['success' => false, 'message' => 'Khong tim thay hoa don hoac ban khong co quyen danh gia.'];
        }

        $invoice = mevabe_refresh_invoice_row($invoice);
        $canReview = mevabe_can_customer_review($invoice);
        if (($canReview['ok'] ?? false) !== true) {
            return ['success' => false, 'message' => (string)($canReview['message'] ?? 'Khong du dieu kien danh gia.')];
        }

        $reviewText = trim($reviewText);
        $uploadResult = mevabe_upload_review_media($reviewFiles);
        if (($uploadResult['success'] ?? false) !== true) {
            return ['success' => false, 'message' => (string)($uploadResult['message'] ?? 'Upload media that bai.')];
        }

        $mediaPaths = is_array($uploadResult['paths'] ?? null) ? $uploadResult['paths'] : [];
        if ($reviewText === '' && !$mediaPaths) {
            return ['success' => false, 'message' => 'Vui long nhap noi dung hoac tai len it nhat 1 media.'];
        }

        $mediaJson = $mediaPaths ? (string)json_encode($mediaPaths, JSON_UNESCAPED_UNICODE) : '';

        $saved = mevabe_krud_call([
            'action' => 'update',
            'table' => 'datlich_mevabe',
            'id' => $invoiceId,
            'data' => [
                'danhgia_khachhang' => $reviewText,
                'media_danhgia_khachhang' => $mediaJson,
                'thoigian_danhgia_khachhang' => mevabe_now()->format('Y-m-d H:i:s'),
            ],
        ]);

        if (($saved['success'] ?? false) !== true) {
            return ['success' => false, 'message' => (string)($saved['message'] ?? 'Luu danh gia that bai.')];
        }

        return ['success' => true, 'message' => 'Luu danh gia thanh cong.'];
    }

    function mevabe_sanitize_return_to(string $returnTo, string $fallback): string
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

    function mevabe_redirect_result(string $returnTo, array $result): void
    {
        $query = (($result['success'] ?? false) === true)
            ? '?ok=1&msg=' . rawurlencode((string)($result['message'] ?? 'Thanh cong'))
            : '?ok=0&msg=' . rawurlencode((string)($result['message'] ?? 'That bai'));

        $separator = strpos($returnTo, '?') === false ? '?' : '&';
        header('Location: ' . $returnTo . $separator . ltrim($query, '?'));
        exit;
    }

    function mevabe_handle_post_request(): void
    {
        $user = session_user_require_customer('../login.html', 'khach_hang/danh-sach-hoa-don.php');
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            header('Location: danh-sach-hoa-don.php');
            exit;
        }

        $invoiceId = (int)($_POST['invoice_id'] ?? 0);
        $sessionPhone = (string)($user['sodienthoai'] ?? '');
        $action = trim((string)($_POST['action'] ?? 'cancel'));

        if ($action === 'save_review') {
            $result = mevabe_save_customer_review(
                $invoiceId,
                $sessionPhone,
                (string)($_POST['review_text'] ?? ''),
                is_array($_FILES['review_media'] ?? null) ? $_FILES['review_media'] : []
            );

            $defaultReturn = $invoiceId > 0 ? ('chi-tiet-hoa-don.php?id=' . $invoiceId) : 'danh-sach-hoa-don.php';
            $returnTo = mevabe_sanitize_return_to((string)($_POST['return_to'] ?? ''), $defaultReturn);
            mevabe_redirect_result($returnTo, $result);
        }

        $result = mevabe_cancel_invoice($invoiceId, $sessionPhone);
        $returnTo = mevabe_sanitize_return_to((string)($_POST['return_to'] ?? ''), 'danh-sach-hoa-don.php');
        mevabe_redirect_result($returnTo, $result);
    }

    function mevabe_is_direct_request(): bool
    {
        $script = realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? ''));
        return is_string($script) && $script !== '' && $script === __FILE__;
    }

    if (mevabe_is_direct_request()) {
        mevabe_handle_post_request();
    }
