<?php
declare(strict_types=1);

const DATLICH_MEVABE_COLUMNS = [
    'id',
    'trangthai',
    'dich_vu',
    'goi_dich_vu',
    'ngayhuy',
    'tien_do',
    'tenkhachhang',
    'sdtkhachhang',
    'emailkhachhang',
    'diachikhachhang',
    'ngay_bat_dau_kehoach',
    'ngay_ket_thuc_kehoach',
    'gio_bat_dau_kehoach',
    'gio_ket_thuc_kehoach',
    'ngaydat',
    'ngaynhan',
    'tenncc',
    'sdtncc',
    'emailncc',
    'diachincc',
    'hotenncc',
    'sodienthoaincc',
    'cong_viec',
    'tong_tien',
    'yeu_cau_khac',
    'ghi_chu',
    'thoigian_batdau_thucte',
    'thoigian_ketthuc_thucte',
];

function normalize_sdt(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

function row_value(array $row, string $key, string $default = ''): string
{
    if (!array_key_exists($key, $row)) {
        return $default;
    }

    $value = trim((string)$row[$key]);
    return $value !== '' ? $value : $default;
}

function pick_datlich_mevabe_row(array $row): array
{
    $picked = [];
    foreach (DATLICH_MEVABE_COLUMNS as $column) {
        $picked[$column] = $row[$column] ?? '';
    }

    return $picked;
}

function list_table_rows(string $table): array
{
    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => $table], JSON_UNESCAPED_UNICODE);
    if ($payload === false) {
        return [];
    }

    $raw = false;
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
    } else {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 20,
            ],
        ]);
        $raw = @file_get_contents($url, false, $context);
    }

    if (!is_string($raw) || $raw === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded) || !empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return [];
    }

    $rows = $decoded;
    if (isset($decoded['data']) && is_array($decoded['data'])) {
        $rows = $decoded['data'];
    } elseif (isset($decoded['rows']) && is_array($decoded['rows'])) {
        $rows = $decoded['rows'];
    } elseif (isset($decoded['items']) && is_array($decoded['items'])) {
        $rows = $decoded['items'];
    }

    if (!is_array($rows)) {
        return [];
    }

    return array_values(array_filter($rows, static fn($item): bool => is_array($item)));
}

function getHoaDonBySessionSdt(string $sessionPhone, ?int $invoiceId = null): array
{
    $sessionPhoneNorm = normalize_sdt($sessionPhone);
    if ($sessionPhoneNorm === '') {
        return [
            'success' => false,
            'error' => 'Không tìm thấy số điện thoại trong session.',
            'rows' => [],
            'row' => null,
        ];
    }

    $rows = list_table_rows('datlich_mevabe');
    $filtered = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $picked = pick_datlich_mevabe_row($row);
        if (normalize_sdt(row_value($picked, 'sdtkhachhang', '')) === $sessionPhoneNorm) {
            $filtered[] = $picked;
        }
    }

    usort($filtered, static function (array $a, array $b): int {
        return ((int)($b['id'] ?? 0)) <=> ((int)($a['id'] ?? 0));
    });

    $matchedRow = null;
    if ($invoiceId !== null && $invoiceId > 0) {
        foreach ($filtered as $item) {
            if ((int)($item['id'] ?? 0) === $invoiceId) {
                $matchedRow = $item;
                break;
            }
        }
    }

    return [
        'success' => true,
        'error' => '',
        'rows' => $filtered,
        'row' => $matchedRow,
    ];
}

function build_mevabe_invoice_list_view_data(array $invoiceRows): array
{
    $viewRows = [];
    $servicesMap = [];
    $statusesMap = [];

    foreach ($invoiceRows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $service = row_value($row, 'dich_vu', '---');
        $status = row_value($row, 'trangthai', 'Chờ xác nhận');

        if ($service !== '---') {
            $servicesMap[$service] = $service;
        }
        $statusesMap[$status] = $status;

        $viewRows[] = [
            'id' => row_value($row, 'id', ''),
            'service' => $service,
            'package' => row_value($row, 'goi_dich_vu', '---'),
            'startDate' => format_vi_datetime(
                row_value($row, 'ngay_bat_dau_kehoach', ''),
                row_value($row, 'gio_bat_dau_kehoach', '')
            ),
            'customer' => row_value($row, 'tenkhachhang', '---'),
            'amount' => row_value($row, 'tong_tien', '0'),
            'status' => $status,
            'employee' => row_value($row, 'tenncc', row_value($row, 'hotenncc', '')),
        ];
    }

    $services = array_values($servicesMap);
    $statuses = array_values($statusesMap);
    sort($services);
    sort($statuses);

    return [
        'rows' => $viewRows,
        'services' => $services,
        'statuses' => $statuses,
    ];
}

function mevabe_status_is_pending(string $status): bool
{
    $raw = trim($status);
    if ($raw === '') {
        return true;
    }

    $lower = function_exists('mb_strtolower') ? mb_strtolower($raw, 'UTF-8') : strtolower($raw);
    return in_array($lower, ['chờ duyệt', 'cho duyet', 'pending', 'waiting'], true);
}

function display_text(string $value, string $default = '---'): string
{
    $text = trim($value);
    return $text !== '' ? $text : $default;
}

function format_vi_datetime(string $dateValue, string $timeValue = '', string $default = '---'): string
{
    $dateRaw = trim($dateValue);
    $timeRaw = trim($timeValue);

    if ($dateRaw === '' && $timeRaw === '') {
        return $default;
    }

    $date = '';
    $time = '';

    if ($dateRaw !== '' && preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/', $dateRaw, $m)) {
        $date = (int)$m[3] . '/' . (int)$m[2] . '/' . (int)$m[1];
        $time = isset($m[4]) ? ((int)$m[4] . ':' . (int)$m[5] . ':' . (int)($m[6] ?? 0)) : '';
    } elseif ($dateRaw !== '' && preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/', $dateRaw, $m)) {
        $date = (int)$m[1] . '/' . (int)$m[2] . '/' . (int)$m[3];
        $time = isset($m[4]) ? ((int)$m[4] . ':' . (int)$m[5] . ':' . (int)($m[6] ?? 0)) : '';
    }

    if ($timeRaw !== '' && preg_match('/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/', $timeRaw, $t)) {
        $time = (int)$t[1] . ':' . (int)$t[2] . ':' . (int)($t[3] ?? 0);
    }

    if ($date !== '') {
        return $date . ' ' . ($time !== '' ? $time : '0:0:0');
    }
    if ($time !== '') {
        return $time;
    }

    return $dateRaw !== '' ? $dateRaw : $default;
}

function parse_jobs_list(string $value): array
{
    $raw = trim($value);
    if ($raw === '') {
        return ['---'];
    }

    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $jobs = [];
        foreach ($decoded as $item) {
            $text = trim((string)$item);
            $text = preg_replace('/^[,;:\-\.\s]+/u', '', $text) ?? $text;
            if ($text !== '') {
                $jobs[] = $text;
            }
        }
        if ($jobs) {
            return $jobs;
        }
    }

    $parts = preg_split('/\s*[\.\x{3002}\r\n;]+\s*/u', $raw) ?: [];
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

function detail_status_class(string $statusText): string
{
    $raw = function_exists('mb_strtolower') ? mb_strtolower(trim($statusText), 'UTF-8') : strtolower(trim($statusText));

    if ($raw === '') {
        return 'warning';
    }
    if (strpos($raw, 'hủy') !== false || strpos($raw, 'huy') !== false || strpos($raw, 'cancel') !== false) {
        return 'danger';
    }
    if (strpos($raw, 'hoàn thành') !== false || strpos($raw, 'hoan thanh') !== false || strpos($raw, 'kết thúc') !== false || strpos($raw, 'ket thuc') !== false) {
        return 'success';
    }

    return 'warning';
}

function build_mevabe_invoice_detail_template_data(array $invoiceRow, array $sessionUser = []): array
{
    $idNumber = (int)($invoiceRow['id'] ?? 0);
    $invoiceCode = $idNumber > 0 ? ('#' . str_pad((string)$idNumber, 6, '0', STR_PAD_LEFT)) : '---';

    $statusText = display_text((string)($invoiceRow['trangthai'] ?? ''), 'Chờ xác nhận');
    $stateClass = detail_status_class($statusText);

    $progress = (float)str_replace(',', '.', (string)($invoiceRow['tien_do'] ?? '0'));
    if (!is_finite($progress)) {
        $progress = 0.0;
    }
    $progress = max(0.0, min(100.0, $progress));
    $progressText = number_format($progress, 2, '.', '');

    $planStartDate = format_vi_datetime((string)($invoiceRow['ngay_bat_dau_kehoach'] ?? ''));
    $planEndDate = format_vi_datetime((string)($invoiceRow['ngay_ket_thuc_kehoach'] ?? ''));
    $planStartTime = format_vi_datetime('', (string)($invoiceRow['gio_bat_dau_kehoach'] ?? ''));
    $planEndTime = format_vi_datetime('', (string)($invoiceRow['gio_ket_thuc_kehoach'] ?? ''));
    $planStartDateTimeText = format_vi_datetime(
        (string)($invoiceRow['ngay_bat_dau_kehoach'] ?? ''),
        (string)($invoiceRow['gio_bat_dau_kehoach'] ?? '')
    );
    $planEndDateTimeText = format_vi_datetime(
        (string)($invoiceRow['ngay_ket_thuc_kehoach'] ?? ''),
        (string)($invoiceRow['gio_ket_thuc_kehoach'] ?? '')
    );

    $staffName = display_text((string)($invoiceRow['tenncc'] ?? ''), display_text((string)($invoiceRow['hotenncc'] ?? ''), '---'));
    $staffPhone = display_text((string)($invoiceRow['sdtncc'] ?? ''), display_text((string)($invoiceRow['sodienthoaincc'] ?? ''), '---'));
    $staffAssigned = $staffName !== '---';

    $statusRaw = function_exists('mb_strtolower') ? mb_strtolower($statusText, 'UTF-8') : strtolower($statusText);
    $isCancelled = strpos($statusRaw, 'hủy') !== false || strpos($statusRaw, 'huy') !== false || strpos($statusRaw, 'cancel') !== false;

    $daysPlan = 0;
    $startRaw = trim((string)($invoiceRow['ngay_bat_dau_kehoach'] ?? ''));
    $endRaw = trim((string)($invoiceRow['ngay_ket_thuc_kehoach'] ?? ''));
    if (preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', $startRaw) && preg_match('/^\d{4}-\d{1,2}-\d{1,2}$/', $endRaw)) {
        $startDt = DateTimeImmutable::createFromFormat('Y-m-d', $startRaw);
        $endDt = DateTimeImmutable::createFromFormat('Y-m-d', $endRaw);
        if ($startDt && $endDt) {
            $daysPlan = (int)$startDt->diff($endDt)->format('%a') + 1;
        }
    }

    return [
        'idNumber' => $idNumber,
        'invoiceCode' => $invoiceCode,
        'statusText' => $statusText,
        'stateClass' => $stateClass,
        'progress' => $progress,
        'progressText' => $progressText,
        'totalMoneyText' => display_text((string)($invoiceRow['tong_tien'] ?? ''), '0'),
        'serviceName' => display_text((string)($invoiceRow['dich_vu'] ?? ''), '---'),

        'planTimeRangeText' => $planStartTime . ' - ' . $planEndTime,
        'planDayRangeText' => $planStartDate . ' -> ' . $planEndDate,
        'planStartDateTimeText' => $planStartDateTimeText,
        'planEndDateTimeText' => $planEndDateTimeText,
        'realStartText' => format_vi_datetime((string)($invoiceRow['thoigian_batdau_thucte'] ?? '')),
        'realEndText' => format_vi_datetime((string)($invoiceRow['thoigian_ketthuc_thucte'] ?? '')),
        'dayHintText' => $planStartDate . ' -> ' . $planEndDate,
        'daysPlan' => $daysPlan,

        'addressText' => display_text((string)($invoiceRow['diachikhachhang'] ?? ''), '---'),
        'requestExtra' => display_text((string)($invoiceRow['yeu_cau_khac'] ?? ''), '---'),
        'note' => display_text((string)($invoiceRow['ghi_chu'] ?? ''), '---'),
        'jobs' => parse_jobs_list((string)($invoiceRow['cong_viec'] ?? '')),

        'customerName' => display_text((string)($invoiceRow['tenkhachhang'] ?? ''), 'Khách hàng'),
        'customerPhone' => display_text((string)($invoiceRow['sdtkhachhang'] ?? ''), '---'),
        'customerEmail' => display_text((string)($invoiceRow['emailkhachhang'] ?? ''), '---'),
        'customerAddress' => display_text((string)($invoiceRow['diachikhachhang'] ?? ''), '---'),
        'customerBirth' => display_text((string)($sessionUser['ngaysinh'] ?? ''), '---'),
        'customerAvatar' => display_text((string)($sessionUser['anh_dai_dien'] ?? ''), '../assets/logomvb.png'),

        'staffName' => $staffName,
        'staffPhone' => $staffPhone,
        'staffEmail' => display_text((string)($invoiceRow['emailncc'] ?? ''), '---'),
        'staffAddress' => display_text((string)($invoiceRow['diachincc'] ?? ''), '---'),
        'staffReceiveAt' => format_vi_datetime((string)($invoiceRow['ngaynhan'] ?? '')),
        'staffExp' => '---',
        'staffAssigned' => $staffAssigned,
        'staffAvatar' => '../assets/logomvb.png',
        'canCancel' => !$staffAssigned && !$isCancelled,

        'customerReviewText' => '',
        'staffReviewText' => '',
        'customerReviewTime' => '---',
        'staffReviewTime' => '---',
        'customerReviewMedia' => [],
        'staffReviewMedia' => [],
    ];
}
