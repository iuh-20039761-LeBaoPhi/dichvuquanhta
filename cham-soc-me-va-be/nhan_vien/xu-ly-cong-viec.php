<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadon.php';

function lower_text_simple(string $value): string
{
    $trimmed = trim($value);
    return function_exists('mb_strtolower') ? mb_strtolower($trimmed, 'UTF-8') : strtolower($trimmed);
}

function row_text(array $row, string $key): string
{
    return trim((string)($row[$key] ?? ''));
}

function normalize_phone_digits(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

function employee_account_is_approved(string $status): bool
{
    $raw = lower_text_simple($status);
    return in_array($raw, ['active', 'approved', 'da_duyet', 'da duyet', 'đã duyệt'], true);
}

function invoice_has_supplier_assignment(array $invoice): bool
{
    foreach (['id_nhacungcap', 'tenncc', 'hotenncc', 'nhacungcapnhan', 'sdtncc', 'sodienthoaincc', 'emailncc', 'diachincc', 'ngaynhan'] as $key) {
        if ($key === 'id_nhacungcap') {
            if ((int)($invoice[$key] ?? 0) > 0) {
                return true;
            }
            continue;
        }

        if (trim((string)($invoice[$key] ?? '')) !== '') {
            return true;
        }
    }

    return false;
}

function invoice_assigned_to_employee(array $invoice, array $employee): bool
{
    $supplierPhone = normalize_phone_digits((string)($invoice['sdtncc'] ?? ''));
    if ($supplierPhone === '') {
        $supplierPhone = normalize_phone_digits((string)($invoice['sodienthoaincc'] ?? ''));
    }

    $employeePhone = normalize_phone_digits((string)($employee['sodienthoai'] ?? ''));
    if ($supplierPhone !== '' && $employeePhone !== '' && $supplierPhone === $employeePhone) {
        return true;
    }

    $supplierName = lower_text_simple((string)($invoice['tenncc'] ?? ''));
    if ($supplierName === '') {
        $supplierName = lower_text_simple((string)($invoice['hotenncc'] ?? ''));
    }

    $employeeName = lower_text_simple((string)($employee['ten'] ?? ''));
    if ($supplierName !== '' && $employeeName !== '' && $supplierName === $employeeName) {
        return true;
    }

    return false;
}

function invoice_in_employee_scope(array $invoice, int $employeeId, array $employee = []): bool
{
    if ($employeeId <= 0) {
        return false;
    }

    if (!invoice_has_supplier_assignment($invoice)) {
        return true;
    }

    return invoice_assigned_to_employee($invoice, $employee);
}

function filter_invoices_for_employee(array $rows, int $employeeId, array $employee = []): array
{
    return array_values(array_filter($rows, static function ($item) use ($employeeId, $employee): bool {
        return is_array($item) && invoice_in_employee_scope($item, $employeeId, $employee);
    }));
}

function status_is_cancelled(string $statusLower): bool
{
    return $statusLower !== '' && (
        strpos($statusLower, 'huy') !== false
        || strpos($statusLower, 'hủy') !== false
        || strpos($statusLower, 'cancel') !== false
    );
}

function status_is_overdue(string $statusLower): bool
{
    return $statusLower !== '' && (
        strpos($statusLower, 'qua han') !== false
        || strpos($statusLower, 'quá hạn') !== false
        || strpos($statusLower, 'overdue') !== false
        || strpos($statusLower, 'expired') !== false
    );
}

function status_is_completed(string $statusLower): bool
{
    return $statusLower !== '' && (
        strpos($statusLower, 'hoan thanh') !== false
        || strpos($statusLower, 'hoàn thành') !== false
        || strpos($statusLower, 'ket thuc') !== false
        || strpos($statusLower, 'kết thúc') !== false
        || strpos($statusLower, 'complete') !== false
    );
}

function work_now(): DateTimeImmutable
{
    return new DateTimeImmutable('now', new DateTimeZone('Asia/Ho_Chi_Minh'));
}

function parse_plan_datetime(string $dateText, string $timeText): ?DateTimeImmutable
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

function in_plan_window(string $startDate, string $endDate): bool
{
    $start = parse_plan_datetime($startDate, '00:00:00');
    $end = parse_plan_datetime($endDate, '23:59:59');

    if (!$start || !$end) {
        return true;
    }

    $now = work_now();
    return $now >= $start && $now <= $end;
}

function work_parse_media(string $raw): array
{
    $raw = trim($raw);
    if ($raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    $items = [];

    if (is_array($decoded)) {
        foreach ($decoded as $item) {
            $value = trim((string)$item);
            if ($value !== '') {
                $items[] = $value;
            }
        }
    } else {
        $parts = preg_split('/\s*[\r\n,;|]+\s*/', $raw) ?: [];
        foreach ($parts as $part) {
            $value = trim((string)$part);
            if ($value !== '') {
                $items[] = $value;
            }
        }
    }

    return array_values(array_unique($items));
}

function work_media_is_video(string $path): bool
{
    $pathPart = parse_url($path, PHP_URL_PATH);
    $normalized = is_string($pathPart) && $pathPart !== '' ? $pathPart : $path;
    $ext = strtolower((string)pathinfo($normalized, PATHINFO_EXTENSION));
    return in_array($ext, ['mp4', 'webm', 'ogg', 'mov'], true);
}

function krud_call(array $payload): array
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

function update_invoice(int $invoiceId, array $data): array
{
    if ($invoiceId <= 0) {
        return ['success' => false, 'message' => 'Ma hoa don khong hop le.'];
    }

    return krud_call([
        'action' => 'update',
        'table' => 'datlich_mevabe',
        'id' => $invoiceId,
        'data' => $data,
    ]);
}

function work_auto_update_status(array $invoice): array
{
    $invoiceId = (int)($invoice['id'] ?? 0);
    if ($invoiceId <= 0) {
        return ['row' => $invoice, 'changed' => false];
    }

    $statusLower = lower_text_simple((string)($invoice['trangthai'] ?? ''));
    if (status_is_cancelled($statusLower)) {
        return ['row' => $invoice, 'changed' => false];
    }

    $hasStaff = invoice_has_supplier_assignment($invoice);
    $startPlan = parse_plan_datetime((string)($invoice['ngay_bat_dau_kehoach'] ?? ''), (string)($invoice['gio_bat_dau_kehoach'] ?? ''));
    $endPlan = parse_plan_datetime((string)($invoice['ngay_ket_thuc_kehoach'] ?? ''), (string)($invoice['gio_ket_thuc_kehoach'] ?? ''));
    $now = work_now();

    if (!$hasStaff && $startPlan instanceof DateTimeImmutable && $now > $startPlan && !status_is_overdue($statusLower) && !status_is_completed($statusLower)) {
        $update = update_invoice($invoiceId, ['trangthai' => 'quá hạn']);
        if (($update['success'] ?? false) === true) {
            $invoice['trangthai'] = 'quá hạn';
            return ['row' => $invoice, 'changed' => true];
        }
    }

    if ($hasStaff && $endPlan instanceof DateTimeImmutable && $now > $endPlan && !status_is_completed($statusLower) && !status_is_overdue($statusLower)) {
        $update = update_invoice($invoiceId, ['trangthai' => 'hoàn thành']);
        if (($update['success'] ?? false) === true) {
            $invoice['trangthai'] = 'hoàn thành';
            return ['row' => $invoice, 'changed' => true];
        }
    }

    return ['row' => $invoice, 'changed' => false];
}

function work_reload_order(int $invoiceId): ?array
{
    $result = getHoaDonData($invoiceId);
    $invoice = is_array($result['row'] ?? null) ? $result['row'] : null;
    if (!is_array($invoice)) {
        return null;
    }

    $auto = work_auto_update_status($invoice);
    if (($auto['changed'] ?? false) === true) {
        $latest = getHoaDonData($invoiceId);
        $invoice = is_array($latest['row'] ?? null) ? $latest['row'] : (array)($auto['row'] ?? $invoice);
    } else {
        $invoice = (array)($auto['row'] ?? $invoice);
    }

    return $invoice;
}

function work_can_claim_invoice(array $invoice): array
{
    $statusLower = lower_text_simple((string)($invoice['trangthai'] ?? ''));

    if (status_is_overdue($statusLower)) {
        return ['ok' => false, 'message' => 'Đơn hàng quá hạn, không thể nhận việc'];
    }

    if (status_is_cancelled($statusLower) || status_is_completed($statusLower)) {
        return ['ok' => false, 'message' => 'Đơn không hợp lệ để nhận việc.'];
    }

    if (invoice_has_supplier_assignment($invoice)) {
        return ['ok' => false, 'message' => 'Đơn đã có nhân viên nhận việc.'];
    }

    $startPlan = parse_plan_datetime((string)($invoice['ngay_bat_dau_kehoach'] ?? ''), (string)($invoice['gio_bat_dau_kehoach'] ?? ''));
    if ($startPlan instanceof DateTimeImmutable && work_now() >= $startPlan) {
        return ['ok' => false, 'message' => 'Đơn hàng quá hạn, không thể nhận việc'];
    }

    return ['ok' => true, 'message' => ''];
}

function work_can_start_invoice(array $invoice, array $employee): array
{
    $statusLower = lower_text_simple((string)($invoice['trangthai'] ?? ''));

    if (status_is_cancelled($statusLower) || status_is_completed($statusLower) || status_is_overdue($statusLower)) {
        return ['ok' => false, 'message' => 'Đơn không hợp lệ để bắt đầu công việc.'];
    }

    if (!invoice_has_supplier_assignment($invoice) || !invoice_assigned_to_employee($invoice, $employee)) {
        return ['ok' => false, 'message' => 'Bạn không phải nhân viên đã nhận đơn này.'];
    }

    if (!in_plan_window((string)($invoice['ngay_bat_dau_kehoach'] ?? ''), (string)($invoice['ngay_ket_thuc_kehoach'] ?? ''))) {
        return ['ok' => false, 'message' => 'Chỉ được bắt đầu trong cửa sổ ngày kế hoạch.'];
    }

    if (row_text($invoice, 'thoigian_batdau_thucte') !== '') {
        return ['ok' => false, 'message' => 'Công việc đã bắt đầu trước đó.'];
    }

    return ['ok' => true, 'message' => ''];
}

function work_can_end_invoice(array $invoice, array $employee): array
{
    $statusLower = lower_text_simple((string)($invoice['trangthai'] ?? ''));

    if (status_is_cancelled($statusLower) || status_is_completed($statusLower) || status_is_overdue($statusLower)) {
        return ['ok' => false, 'message' => 'Đơn không hợp lệ để kết thúc công việc.'];
    }

    if (!invoice_has_supplier_assignment($invoice) || !invoice_assigned_to_employee($invoice, $employee)) {
        return ['ok' => false, 'message' => 'Bạn không phải nhân viên đã nhận đơn này.'];
    }

    if (row_text($invoice, 'thoigian_batdau_thucte') === '') {
        return ['ok' => false, 'message' => 'Bạn cần bấm bắt đầu trước khi kết thúc công việc.'];
    }

    if (row_text($invoice, 'thoigian_ketthuc_thucte') !== '') {
        return ['ok' => false, 'message' => 'Công việc đã kết thúc trước đó.'];
    }

    return ['ok' => true, 'message' => ''];
}

function work_review_locked_by_plan_end(array $invoice): bool
{
    $endPlan = parse_plan_datetime((string)($invoice['ngay_ket_thuc_kehoach'] ?? ''), (string)($invoice['gio_ket_thuc_kehoach'] ?? ''));
    if (!$endPlan || work_now() <= $endPlan) {
        return false;
    }

    $statusLower = lower_text_simple((string)($invoice['trangthai'] ?? ''));
    if (status_is_cancelled($statusLower) || status_is_overdue($statusLower)) {
        return true;
    }

    return !invoice_has_supplier_assignment($invoice);
}

function work_can_staff_review(array $invoice, array $employee): array
{
    $statusLower = lower_text_simple((string)($invoice['trangthai'] ?? ''));

    if (!status_is_completed($statusLower)) {
        return ['ok' => false, 'message' => 'Chỉ được đánh giá khi đơn đã hoàn thành.'];
    }

    if (!invoice_has_supplier_assignment($invoice) || !invoice_assigned_to_employee($invoice, $employee)) {
        return ['ok' => false, 'message' => 'Bạn không phải nhân viên đã nhận đơn này.'];
    }

    if (work_review_locked_by_plan_end($invoice)) {
        return ['ok' => false, 'message' => 'Đơn đang bị khóa đánh giá theo mốc thời gian.'];
    }

    if (row_text($invoice, 'danhgia_nhanvien') !== '' || row_text($invoice, 'thoigian_danhgia_nhanvien') !== '' || row_text($invoice, 'media_danhgia_nhanvien') !== '') {
        return ['ok' => false, 'message' => 'Đơn đã được đánh giá trước đó.'];
    }

    return ['ok' => true, 'message' => ''];
}

function work_save_staff_review(int $invoiceId, array $employee, string $reviewText, string $reviewMediaRaw): array
{
    $invoice = work_reload_order($invoiceId);
    if (!is_array($invoice)) {
        return ['success' => false, 'message' => 'Không tìm thấy hóa đơn để đánh giá.'];
    }

    $check = work_can_staff_review($invoice, $employee);
    if (($check['ok'] ?? false) !== true) {
        return ['success' => false, 'message' => (string)($check['message'] ?? 'Không đủ điều kiện đánh giá.')];
    }

    $reviewText = trim($reviewText);
    $reviewMediaRaw = trim($reviewMediaRaw);

    if ($reviewText === '' && $reviewMediaRaw === '') {
        return ['success' => false, 'message' => 'Vui lòng nhập nội dung hoặc media đánh giá.'];
    }

    $mediaItems = work_parse_media($reviewMediaRaw);
    $mediaValue = '';
    if ($mediaItems) {
        $encoded = json_encode($mediaItems, JSON_UNESCAPED_UNICODE);
        $mediaValue = $encoded === false ? '' : $encoded;
    } elseif ($reviewMediaRaw !== '') {
        $mediaValue = $reviewMediaRaw;
    }

    $saved = update_invoice($invoiceId, [
        'danhgia_nhanvien' => $reviewText,
        'media_danhgia_nhanvien' => $mediaValue,
        'thoigian_danhgia_nhanvien' => work_now()->format('Y-m-d H:i:s'),
    ]);

    if (($saved['success'] ?? false) !== true) {
        return ['success' => false, 'message' => (string)($saved['message'] ?? 'Lưu đánh giá thất bại.')];
    }

    return ['success' => true, 'message' => 'Lưu đánh giá thành công.'];
}

function safe_return_to(string $returnTo, int $invoiceId): string
{
    $fallback = 'chi-tiet-hoa-don.php?id=' . max(0, $invoiceId);
    $target = trim($returnTo);

    if ($target === '') {
        return $fallback;
    }

    if (preg_match('/^(https?:|\/|\\\\|\.\.\/)/i', $target)) {
        return $fallback;
    }

    if (strpos($target, 'chi-tiet-hoa-don.php') !== 0 && strpos($target, 'danh-sach-hoa-don.php') !== 0) {
        return $fallback;
    }

    return $target;
}

function redirect_back(string $returnTo, bool $ok, string $message): void
{
    $separator = strpos($returnTo, '?') === false ? '?' : '&';
    header('Location: ' . $returnTo . $separator . 'ok=' . ($ok ? '1' : '0') . '&msg=' . rawurlencode($message));
    exit;
}

function handle_work_action_request(): void
{
    $user = session_user_require_employee('../login.html', 'nhan_vien/danh-sach-hoa-don.php');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Location: danh-sach-hoa-don.php');
        exit;
    }

    $invoiceId = (int)($_POST['invoice_id'] ?? 0);
    $returnTo = safe_return_to((string)($_POST['return_to'] ?? ''), $invoiceId);
    $action = strtolower(trim((string)($_POST['action'] ?? '')));

    if (!employee_account_is_approved((string)($user['trangthai'] ?? ''))) {
        redirect_back($returnTo, false, 'Tài khoản của bạn đang chờ duyệt.');
    }

    if ($invoiceId <= 0) {
        redirect_back($returnTo, false, 'Mã hóa đơn không hợp lệ.');
    }

    if (!in_array($action, ['claim', 'start', 'end', 'save_review'], true)) {
        redirect_back($returnTo, false, 'Hành động không hợp lệ.');
    }

    $employeeId = (int)($user['id'] ?? 0);
    if ($employeeId <= 0) {
        redirect_back($returnTo, false, 'Không xác định được tài khoản nhân viên.');
    }

    $invoice = work_reload_order($invoiceId);
    if (!is_array($invoice)) {
        redirect_back($returnTo, false, 'Không tìm thấy hóa đơn.');
    }

    if (!invoice_in_employee_scope($invoice, $employeeId, $user)) {
        redirect_back($returnTo, false, 'Bạn không có quyền thao tác hóa đơn này.');
    }

    if ($action === 'save_review') {
        $result = work_save_staff_review(
            $invoiceId,
            $user,
            (string)($_POST['review_text'] ?? ''),
            (string)($_POST['review_media'] ?? '')
        );

        work_reload_order($invoiceId);
        redirect_back($returnTo, (bool)($result['success'] ?? false), (string)($result['message'] ?? 'Lưu đánh giá thất bại.'));
    }

    if ($action === 'claim') {
        $check = work_can_claim_invoice($invoice);
        if (($check['ok'] ?? false) !== true) {
            if (($check['message'] ?? '') === 'Đơn hàng quá hạn, không thể nhận việc') {
                work_reload_order($invoiceId);
            }
            redirect_back($returnTo, false, (string)($check['message'] ?? 'Không thể nhận việc.'));
        }

        $employeeName = row_text($user, 'ten');
        $employeePhone = row_text($user, 'sodienthoai');
        $employeeEmail = row_text($user, 'email');
        $employeeAddress = row_text($user, 'diachi');
        $employeeAvatar = row_text($user, 'anh_dai_dien');

        $update = update_invoice($invoiceId, [
            'ngaynhan' => work_now()->format('Y-m-d H:i:s'),
            'tenncc' => $employeeName,
            'sdtncc' => $employeePhone,
            'emailncc' => $employeeEmail,
            'diachincc' => $employeeAddress,
            'avatar_ncc' => $employeeAvatar,
            'trangthai' => 'đã nhận',
        ]);

        work_reload_order($invoiceId);

        if (($update['success'] ?? false) !== true) {
            redirect_back($returnTo, false, (string)($update['message'] ?? 'Nhận việc thất bại.'));
        }

        redirect_back($returnTo, true, 'Nhận việc thành công.');
    }

    if ($action === 'start') {
        $check = work_can_start_invoice($invoice, $user);
        if (($check['ok'] ?? false) !== true) {
            redirect_back($returnTo, false, (string)($check['message'] ?? 'Không thể bắt đầu công việc.'));
        }

        $update = update_invoice($invoiceId, [
            'trangthai' => 'đang thực hiện',
            'thoigian_batdau_thucte' => work_now()->format('Y-m-d H:i:s'),
            'thoigian_ketthuc_thucte' => '',
        ]);

        work_reload_order($invoiceId);

        if (($update['success'] ?? false) !== true) {
            redirect_back($returnTo, false, (string)($update['message'] ?? 'Bắt đầu công việc thất bại.'));
        }

        redirect_back($returnTo, true, 'Bắt đầu công việc thành công.');
    }

    $check = work_can_end_invoice($invoice, $user);
    if (($check['ok'] ?? false) !== true) {
        redirect_back($returnTo, false, (string)($check['message'] ?? 'Không thể kết thúc công việc.'));
    }

    $update = update_invoice($invoiceId, [
        'trangthai' => 'hoàn thành',
        'thoigian_ketthuc_thucte' => work_now()->format('Y-m-d H:i:s'),
        'tien_do' => 100,
    ]);

    work_reload_order($invoiceId);

    if (($update['success'] ?? false) !== true) {
        redirect_back($returnTo, false, (string)($update['message'] ?? 'Kết thúc công việc thất bại.'));
    }

    redirect_back($returnTo, true, 'Kết thúc công việc thành công.');
}

if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    handle_work_action_request();
}
