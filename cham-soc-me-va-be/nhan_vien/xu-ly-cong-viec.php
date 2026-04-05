<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Ho_Chi_Minh');

require_once __DIR__ . '/../session_user.php';
require_once __DIR__ . '/get-hoadon.php';

function row_text(array $row, string $key, string $default = ''): string
{
    $value = trim((string)($row[$key] ?? ''));
    return $value !== '' ? $value : $default;
}

function lower_text_simple(string $value): string
{
    if (function_exists('lower_text')) {
        return lower_text($value);
    }

    $trimmed = trim($value);
    return function_exists('mb_strtolower') ? mb_strtolower($trimmed, 'UTF-8') : strtolower($trimmed);
}

function status_is_cancelled(string $statusLower): bool
{
    return strpos($statusLower, 'huy') !== false
        || strpos($statusLower, 'hủy') !== false
        || strpos($statusLower, 'cancel') !== false;
}

function status_is_completed(string $statusLower): bool
{
    return strpos($statusLower, 'hoan thanh') !== false
        || strpos($statusLower, 'hoàn thành') !== false
        || strpos($statusLower, 'ket thuc') !== false
        || strpos($statusLower, 'kết thúc') !== false
        || strpos($statusLower, 'completed') !== false;
}

function now_sql(): string
{
    return (new DateTimeImmutable('now'))->format('Y-m-d H:i:s');
}

function parse_date_only(string $dateRaw): ?DateTimeImmutable
{
    $raw = trim($dateRaw);
    if (!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $raw)) {
        return null;
    }

    return DateTimeImmutable::createFromFormat('Y-m-d', $raw) ?: null;
}

function parse_time_to_hours(string $timeRaw): float
{
    $raw = trim($timeRaw);
    if (!preg_match('/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/', $raw, $m)) {
        return 0.0;
    }

    $h = (int)$m[1];
    $i = (int)$m[2];
    return $h + ($i / 60);
}

function plan_days(string $startDate, string $endDate): int
{
    $start = parse_date_only($startDate);
    $end = parse_date_only($endDate);
    if (!$start || !$end) {
        return 1;
    }

    $diff = (int)round(($end->getTimestamp() - $start->getTimestamp()) / 86400);
    return max(1, $diff);
}

function in_plan_window(string $startDate, string $endDate): bool
{
    $start = parse_date_only($startDate);
    $end = parse_date_only($endDate);
    if (!$start || !$end) {
        return true;
    }

    $today = new DateTimeImmutable('today');
    return $today >= $start && $today <= $end;
}

function calc_progress_increment(array $invoice, string $endAt): float
{
    $planHours = parse_time_to_hours(row_text($invoice, 'gio_ket_thuc_kehoach'))
        - parse_time_to_hours(row_text($invoice, 'gio_bat_dau_kehoach'));

    $realStartTs = strtotime(row_text($invoice, 'thoigian_batdau_thucte'));
    $realEndTs = strtotime($endAt);
    if ($realStartTs === false || $realEndTs === false) {
        return 0.0;
    }

    $realHours = ($realEndTs - $realStartTs) / 3600;
    $days = plan_days(row_text($invoice, 'ngay_bat_dau_kehoach'), row_text($invoice, 'ngay_ket_thuc_kehoach'));

    if ($planHours <= 0 || $realHours <= 0) {
        return 0.0;
    }

    $value = ($realHours / $planHours) * (100 / $days);
    return max(0.0, min(100.0, $value));
}

function work_format_date_display(string $raw, string $default = '---'): string
{
    $value = trim($raw);
    if ($value === '') {
        return $default;
    }

    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $value, $m)) {
        return (int)$m[3] . '/' . (int)$m[2] . '/' . (int)$m[1];
    }

    return $value;
}

function work_format_time_display(string $raw, string $default = '---'): string
{
    $value = trim($raw);
    if ($value === '') {
        return $default;
    }

    if (preg_match('/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/', $value, $m)) {
        return str_pad((string)(int)$m[1], 2, '0', STR_PAD_LEFT)
            . ':' . str_pad((string)(int)$m[2], 2, '0', STR_PAD_LEFT)
            . ':0';
    }

    return $value;
}

function work_format_datetime_display(string $raw, string $default = '---'): string
{
    $value = trim($raw);
    if ($value === '') {
        return $default;
    }

    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/', $value, $m)) {
        $date = (int)$m[3] . '/' . (int)$m[2] . '/' . (int)$m[1];
        $time = isset($m[4])
            ? (int)$m[4] . ':' . (int)$m[5] . ':' . (int)($m[6] ?? 0)
            : '0:0:0';
        return $date . ' ' . $time;
    }

    return $value;
}

function work_parse_jobs(string $value): array
{
    $raw = trim($value);
    if ($raw === '') {
        return ['---'];
    }

    $parts = preg_split('/\s*[\.\r\n;]+\s*/u', $raw) ?: [];
    $jobs = [];

    foreach ($parts as $part) {
        $text = trim((string)$part);
        $text = preg_replace('/^[,;:\-\.\s]+/u', '', $text) ?? $text;
        if ($text !== '') {
            $jobs[] = $text;
        }
    }

    return $jobs ?: ['---'];
}

function work_parse_media(string $raw): array
{
    $value = trim($raw);
    if ($value === '') {
        return [];
    }

    $parts = preg_split('/[,\n]/', $value) ?: [];
    $items = [];

    foreach ($parts as $part) {
        $item = trim($part);
        if ($item === '') {
            continue;
        }

        if (preg_match('/^https?:\/\/.*\.(jpg|jpeg|png|gif|webp|mp4|webm|ogg|mov)(\?.*)?$/i', $item)) {
            $items[] = $item;
        }
    }

    return array_values(array_unique($items));
}

function build_invoice_work_view_data(array $invoice, array $sessionUser = []): array
{
    $idNumber = (int)($invoice['id'] ?? 0);
    $invoiceCode = $idNumber > 0 ? ('#' . str_pad((string)$idNumber, 6, '0', STR_PAD_LEFT)) : '---';

    $statusText = row_text($invoice, 'trangthai', 'Chờ xác nhận');
    $statusLower = lower_text_simple($statusText);
    $isCancelled = status_is_cancelled($statusLower);
    $isCompleted = status_is_completed($statusLower);
    $stateClass = $isCancelled ? 'danger' : ($isCompleted ? 'success' : 'warning');

    $progress = (float)str_replace(',', '.', row_text($invoice, 'tien_do', '0'));
    if (!is_finite($progress)) {
        $progress = 0.0;
    }
    $progress = max(0.0, min(100.0, $progress));

    $planStartDateRaw = row_text($invoice, 'ngay_bat_dau_kehoach');
    $planEndDateRaw = row_text($invoice, 'ngay_ket_thuc_kehoach');
    $planStartTimeRaw = row_text($invoice, 'gio_bat_dau_kehoach');
    $planEndTimeRaw = row_text($invoice, 'gio_ket_thuc_kehoach');

    $planStartDateText = work_format_date_display($planStartDateRaw);
    $planEndDateText = work_format_date_display($planEndDateRaw);
    $planStartTimeText = work_format_time_display($planStartTimeRaw);
    $planEndTimeText = work_format_time_display($planEndTimeRaw);

    $planTimeRangeText = $planStartTimeText . ' - ' . $planEndTimeText;
    $planDayRangeText = $planStartDateText . ' -> ' . $planEndDateText;

    $staffAssigned = invoice_has_supplier_assignment($invoice);
    $isMyOrder = $staffAssigned && invoice_assigned_to_employee($invoice, $sessionUser);

    $started = row_text($invoice, 'thoigian_batdau_thucte') !== '';
    $ended = row_text($invoice, 'thoigian_ketthuc_thucte') !== '';
    $inPlanWindow = in_plan_window($planStartDateRaw, $planEndDateRaw);

    $proofMedia = array_merge(
        work_parse_media(row_text($invoice, 'yeu_cau_khac')),
        work_parse_media(row_text($invoice, 'ghi_chu'))
    );

    return [
        'idNumber' => $idNumber,
        'invoiceCode' => $invoiceCode,
        'statusText' => $statusText,
        'stateClass' => $stateClass,

        'progress' => $progress,
        'progressText' => number_format($progress, 2, '.', ''),
        'totalMoneyText' => row_text($invoice, 'tong_tien', '0'),
        'serviceName' => row_text($invoice, 'dich_vu', '---'),
        'addressText' => row_text($invoice, 'diachikhachhang', '---'),

        'planTimeRangeText' => $planTimeRangeText,
        'planDayRangeText' => $planDayRangeText,
        'planStartDateTimeText' => trim($planStartDateText . ' ' . $planStartTimeText),
        'planEndDateTimeText' => trim($planEndDateText . ' ' . $planEndTimeText),
        'realStartText' => work_format_datetime_display(row_text($invoice, 'thoigian_batdau_thucte')),
        'realEndText' => work_format_datetime_display(row_text($invoice, 'thoigian_ketthuc_thucte')),
        'daysPlan' => plan_days($planStartDateRaw, $planEndDateRaw),

        'jobs' => work_parse_jobs(row_text($invoice, 'cong_viec')),
        'requestExtra' => row_text($invoice, 'yeu_cau_khac', '---'),
        'note' => row_text($invoice, 'ghi_chu', '---'),

        'customerName' => row_text($invoice, 'tenkhachhang', 'Khách hàng'),
        'customerPhone' => row_text($invoice, 'sdtkhachhang', '---'),
        'customerEmail' => row_text($invoice, 'emailkhachhang', '---'),
        'customerAddress' => row_text($invoice, 'diachikhachhang', '---'),
        'customerAvatar' => '../assets/logomvb.png',

        'staffAssigned' => $staffAssigned,
        'staffName' => row_text($invoice, 'tenncc', row_text($invoice, 'hotenncc', ($isMyOrder ? row_text($sessionUser, 'ten', '---') : '---'))),
        'staffPhone' => row_text($invoice, 'sdtncc', row_text($invoice, 'sodienthoaincc', ($isMyOrder ? row_text($sessionUser, 'sodienthoai', '---') : '---'))),
        'staffEmail' => row_text($invoice, 'emailncc', '---'),
        'staffAddress' => row_text($invoice, 'diachincc', '---'),
        'staffReceiveAt' => work_format_datetime_display(row_text($invoice, 'ngaynhan')),
        'staffAvatar' => '../assets/logomvb.png',

        'canClaim' => !$staffAssigned && !$isCancelled && !$isCompleted,
        'canStart' => $isMyOrder && $inPlanWindow && (!$started || $ended) && !$isCancelled && !$isCompleted,
        'canEnd' => $isMyOrder && $started && !$ended && !$isCancelled && !$isCompleted,

        'proofMedia' => array_values(array_unique($proofMedia)),
    ];
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

function krud_call(array $payload): array
{
    $url = 'https://api.dvqt.vn/krud/';
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE);
    if ($body === false) {
        return ['success' => false, 'message' => 'Khong tao duoc payload cap nhat.'];
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
    $error = curl_error($ch);
    curl_close($ch);

    if (!is_string($raw) || $raw === '') {
        return ['success' => false, 'message' => $error !== '' ? $error : 'Khong nhan duoc phan hoi API.'];
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

function handle_work_action_request(): void
{
    $user = session_user_require_employee('../login.html', 'nhan_vien/danh-sach-hoa-don.php');

    $invoiceId = (int)($_POST['invoice_id'] ?? 0);
    $returnTo = safe_return_to((string)($_POST['return_to'] ?? ''), $invoiceId);
    $action = strtolower(trim((string)($_POST['action'] ?? '')));

    if (!employee_account_is_approved((string)($user['trangthai'] ?? ''))) {
        redirect_back($returnTo, false, 'Tai khoan cua ban dang cho duyet.');
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        redirect_back($returnTo, false, 'Phuong thuc khong hop le.');
    }

    if ($invoiceId <= 0) {
        redirect_back($returnTo, false, 'Khong tim thay ma hoa don can xu ly.');
    }

    if (!in_array($action, ['claim', 'start', 'end'], true)) {
        redirect_back($returnTo, false, 'Hanh dong khong hop le.');
    }

    $invoiceResult = getHoaDonData($invoiceId);
    $invoice = is_array($invoiceResult['row'] ?? null) ? $invoiceResult['row'] : null;
    if (!is_array($invoice)) {
        redirect_back($returnTo, false, 'Khong tim thay hoa don can xu ly.');
    }

    $employeeId = (int)($user['id'] ?? 0);
    if ($employeeId <= 0) {
        redirect_back($returnTo, false, 'Khong xac dinh duoc tai khoan nhan vien.');
    }

    if (!invoice_in_employee_scope($invoice, $employeeId, $user)) {
        redirect_back($returnTo, false, 'Ban khong co quyen thao tac hoa don nay.');
    }

    $statusLower = lower_text_simple(row_text($invoice, 'trangthai'));
    $isCancelled = status_is_cancelled($statusLower);
    $isCompleted = status_is_completed($statusLower);
    $isAssignedToMe = invoice_has_supplier_assignment($invoice) && invoice_assigned_to_employee($invoice, $user);

    if ($action === 'claim') {
        if ($isCancelled || $isCompleted) {
            redirect_back($returnTo, false, 'Don da huy hoac da ket thuc, khong the nhan viec.');
        }

        if (invoice_has_supplier_assignment($invoice)) {
            if ($isAssignedToMe) {
                redirect_back($returnTo, true, 'Ban da nhan viec truoc do.');
            }

            redirect_back($returnTo, false, 'Hoa don nay da duoc nhan boi nhan vien khac.');
        }

        $employeeName = row_text($user, 'ten', row_text($user, 'hovaten', ''));
        $employeePhone = row_text($user, 'sodienthoai');
        $employeeEmail = row_text($user, 'email');
        $employeeAddress = row_text($user, 'dia_chi');

        $updateResult = update_invoice($invoiceId, [
            'id_nhacungcap' => $employeeId,
            'ngaynhan' => now_sql(),
            'tenncc' => $employeeName,
            'sdtncc' => $employeePhone,
            'emailncc' => $employeeEmail,
            'diachincc' => $employeeAddress,
            'hotenncc' => $employeeName,
            'sodienthoaincc' => $employeePhone,
            'trangthai' => 'đã nhận',
        ]);

        redirect_back(
            $returnTo,
            (bool)($updateResult['success'] ?? false),
            (string)($updateResult['success'] ?? false ? 'Nhan viec thanh cong.' : ($updateResult['message'] ?? 'Nhan viec that bai.'))
        );
    }

    if ($action === 'start') {
        if ($isCancelled || $isCompleted) {
            redirect_back($returnTo, false, 'Don da huy hoac da ket thuc, khong the bat dau.');
        }

        if (!$isAssignedToMe) {
            redirect_back($returnTo, false, 'Ban can nhan viec truoc khi bat dau.');
        }

        if (!in_plan_window(row_text($invoice, 'ngay_bat_dau_kehoach'), row_text($invoice, 'ngay_ket_thuc_kehoach'))) {
            redirect_back($returnTo, false, 'Chi duoc bat dau trong khoang thoi gian ke hoach.');
        }

        $startedAt = row_text($invoice, 'thoigian_batdau_thucte');
        $endedAt = row_text($invoice, 'thoigian_ketthuc_thucte');
        if ($startedAt !== '' && $endedAt === '') {
            redirect_back($returnTo, true, 'Cong viec da bat dau truoc do.');
        }

        $updateResult = update_invoice($invoiceId, [
            'trangthai' => 'đang thực hiện',
            'thoigian_batdau_thucte' => now_sql(),
            'thoigian_ketthuc_thucte' => '',
        ]);

        redirect_back(
            $returnTo,
            (bool)($updateResult['success'] ?? false),
            (string)($updateResult['success'] ?? false ? 'Bat dau cong viec thanh cong.' : ($updateResult['message'] ?? 'Bat dau cong viec that bai.'))
        );
    }

    if ($isCancelled || $isCompleted) {
        redirect_back($returnTo, false, 'Don da huy hoac da ket thuc, khong the ket thuc lan nua.');
    }

    if (!$isAssignedToMe) {
        redirect_back($returnTo, false, 'Ban khong phai nhan vien dang phu trach don nay.');
    }

    $startAt = row_text($invoice, 'thoigian_batdau_thucte');
    if ($startAt === '') {
        redirect_back($returnTo, false, 'Ban can bat dau cong viec truoc khi ket thuc.');
    }

    if (row_text($invoice, 'thoigian_ketthuc_thucte') !== '') {
        redirect_back($returnTo, true, 'Cong viec da ket thuc truoc do.');
    }

    $endAt = now_sql();
    $endResult = update_invoice($invoiceId, [
        'trangthai' => 'đã kết thúc',
        'thoigian_ketthuc_thucte' => $endAt,
    ]);

    if (!($endResult['success'] ?? false)) {
        redirect_back($returnTo, false, (string)($endResult['message'] ?? 'Ket thuc cong viec that bai.'));
    }

    $latestResult = getHoaDonData($invoiceId);
    $latest = is_array($latestResult['row'] ?? null) ? $latestResult['row'] : $invoice;
    $latest['thoigian_ketthuc_thucte'] = $endAt;

    $currentProgress = (float)str_replace(',', '.', row_text($latest, 'tien_do', '0'));
    if (!is_finite($currentProgress)) {
        $currentProgress = 0.0;
    }

    $increment = calc_progress_increment($latest, $endAt);
    $nextProgress = min(100.0, max(0.0, $currentProgress + $increment));

    $progressResult = update_invoice($invoiceId, [
        'tien_do' => (float)number_format($nextProgress, 2, '.', ''),
    ]);

    if (!($progressResult['success'] ?? false)) {
        redirect_back($returnTo, false, (string)($progressResult['message'] ?? 'Cap nhat tien do that bai.'));
    }

    redirect_back($returnTo, true, 'Ket thuc cong viec thanh cong. Tien do +' . number_format($increment, 2, '.', '') . '%.');
}

if (realpath((string)($_SERVER['SCRIPT_FILENAME'] ?? '')) === __FILE__) {
    handle_work_action_request();
}
