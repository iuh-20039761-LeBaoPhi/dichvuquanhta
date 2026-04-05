<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';
require_once __DIR__ . '/get_nhanvien.php';

if (!function_exists('get_hoadon_data')) {
    function get_hoadon_data(): array
    {
        $result = admin_api_list_table('datlich_mevabe');
        $rows = $result['rows'] ?? [];

        usort($rows, static function (array $a, array $b): int {
            return (int)($b['id'] ?? 0) <=> (int)($a['id'] ?? 0);
        });

        return [
            'rows' => $rows,
            'error' => (string)($result['error'] ?? ''),
        ];
    }
}

if (!function_exists('hoadon_get_first')) {
    function hoadon_get_first(array $row, array $keys, string $default = ''): string
    {
        foreach ($keys as $key) {
            if (!array_key_exists($key, $row)) {
                continue;
            }
            $value = trim((string)$row[$key]);
            if ($value !== '') {
                return $value;
            }
        }

        return $default;
    }
}

if (!function_exists('hoadon_format_datetime')) {
    function hoadon_format_datetime(string $value, string $mode = 'auto'): string
    {
        $raw = trim($value);
        if ($raw === '') {
            return $mode === 'time' ? '--:--:--' : '---';
        }

        $hasDate = false;
        $hasTime = false;
        $d = $m = $y = 0;
        $h = $i = $s = 0;

        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/', $raw, $x)) {
            [$y, $m, $d] = [(int)$x[1], (int)$x[2], (int)$x[3]];
            [$h, $i, $s] = [isset($x[4]) ? (int)$x[4] : 0, isset($x[5]) ? (int)$x[5] : 0, isset($x[6]) ? (int)$x[6] : 0];
            $hasDate = true;
            $hasTime = isset($x[4]) && $x[4] !== '';
        } elseif (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?$/', $raw, $x)) {
            [$d, $m, $y] = [(int)$x[1], (int)$x[2], (int)$x[3]];
            [$h, $i, $s] = [isset($x[4]) ? (int)$x[4] : 0, isset($x[5]) ? (int)$x[5] : 0, isset($x[6]) ? (int)$x[6] : 0];
            $hasDate = true;
            $hasTime = isset($x[4]) && $x[4] !== '';
        } elseif (preg_match('/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/', $raw, $x)) {
            [$h, $i, $s] = [(int)$x[1], (int)$x[2], isset($x[3]) ? (int)$x[3] : 0];
            $hasTime = true;
        } else {
            return $raw;
        }

        $date = $hasDate ? sprintf('%02d/%02d/%04d', $d, $m, $y) : '---';
        $time = $hasTime ? ($h . ':' . $i . ':' . $s) : '--:--:--';

        if ($mode === 'date') return $date;
        if ($mode === 'time') return $time;
        if ($hasDate && $hasTime) return $date . ' ' . $time;
        if ($hasDate) return $date;
        return $time;
    }
}

if (!function_exists('hoadon_parse_date_ymd')) {
    function hoadon_parse_date_ymd(string $value): string
    {
        $raw = trim($value);
        if ($raw === '') {
            return '';
        }

        if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T]\d{1,2}(?::\d{1,2})?(?::\d{1,2})?)?$/', $raw, $x)) {
            $y = (int)$x[1];
            $m = (int)$x[2];
            $d = (int)$x[3];
            return checkdate($m, $d, $y) ? sprintf('%04d-%02d-%02d', $y, $m, $d) : '';
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+\d{1,2}(?::\d{1,2})?(?::\d{1,2})?)?$/', $raw, $x)) {
            $d = (int)$x[1];
            $m = (int)$x[2];
            $y = (int)$x[3];
            return checkdate($m, $d, $y) ? sprintf('%04d-%02d-%02d', $y, $m, $d) : '';
        }

        $timestamp = strtotime($raw);
        if ($timestamp === false) {
            return '';
        }

        return date('Y-m-d', $timestamp);
    }
}

if (!function_exists('hoadon_parse_jobs')) {
    function hoadon_parse_jobs(string $jobsRaw): array
    {
        $raw = trim($jobsRaw);
        if ($raw === '') {
            return ['Chưa cập nhật công việc'];
        }

        $jobs = [];
        $jobsNormalized = preg_replace('/\s+/u', ' ', $raw) ?? $raw;
        $parts = preg_split('/\s*[\.\x{3002}]\s*/u', $jobsNormalized) ?: [];
        foreach ($parts as $part) {
            $clean = trim((string)$part);
            $clean = preg_replace('/^[,;:\-\s]+/u', '', $clean) ?? $clean;
            if ($clean !== '') {
                $jobs[] = $clean;
            }
        }

        return $jobs ?: ['Chưa cập nhật công việc'];
    }
}

if (!function_exists('hoadon_detail_view_defaults')) {
    function hoadon_detail_view_defaults(): array
    {
        return [
            'statusText' => 'N/A',
            'progressText' => '0',
            'priceText' => '0 VND',
            'timeRange' => '--:--:-- - --:--:--',
            'dateRange' => '---',
            'address' => 'N/A',
            'requestText' => 'Không có',
            'noteText' => 'Không có',
            'jobItems' => ['Chưa cập nhật công việc'],
            'jobCount' => 1,
            'updatedAtDisplay' => 'N/A',
            'startRealDisplay' => 'N/A',
            'timeEndDisplay' => 'N/A',
            'endRealDisplay' => 'N/A',
            'hasStart' => false,
            'hasEnd' => false,
            'isDone' => false,
            'isRunning' => false,
            'customerName' => 'N/A',
            'customerPhone' => 'N/A',
            'customerEmail' => 'N/A',
            'customerAddress' => 'N/A',
            'customerAvatar' => '',
            'createdDateDisplay' => 'N/A',
            'serviceName' => 'N/A',
            'packageName' => 'N/A',
            'supplierAssigned' => false,
            'supplierName' => 'Chưa phân công',
            'supplierPhone' => 'N/A',
            'supplierEmail' => 'N/A',
            'supplierAddress' => 'N/A',
            'supplierAvatar' => '',
            'supplierExp' => 'Không có',
            'supplierRatingText' => 'Chưa có đánh giá',
            'supplierReceivedAtDisplay' => '---',
            'reviewCustomer' => '',
            'reviewSupplier' => '',
            'reviewCustomerAtDisplay' => '---',
            'reviewSupplierAtDisplay' => '---',
        ];
    }
}

if (!function_exists('hoadon_get_nhanvien_row')) {
    function hoadon_get_nhanvien_row(array $row): ?array
    {
        $nhanVienId = (int)($row['id_nhacungcap'] ?? 0);
        if ($nhanVienId <= 0) {
            return null;
        }

        $nv = get_nhanvien_by_id($nhanVienId);
        return is_array($nv['row'] ?? null) ? $nv['row'] : null;
    }
}

if (!function_exists('hoadon_staff_field')) {
    function hoadon_staff_field(?array $nhanVienRow, array $keys, string $default = ''): string
    {
        return is_array($nhanVienRow) ? hoadon_get_first($nhanVienRow, $keys, $default) : $default;
    }
}

if (!function_exists('hoadon_build_time_range')) {
    function hoadon_build_time_range(string $timeStart, string $timeEnd): string
    {
        if ($timeStart === '' && $timeEnd === '') {
            return '--:--:-- - --:--:--';
        }

        $left = $timeStart !== '' ? hoadon_format_datetime($timeStart, 'time') : '--:--:--';
        $right = $timeEnd !== '' ? hoadon_format_datetime($timeEnd, 'time') : '--:--:--';
        return $left . ' - ' . $right;
    }
}

if (!function_exists('hoadon_build_date_range')) {
    function hoadon_build_date_range(string $dateStart, string $dateEnd): string
    {
        if ($dateStart === '' && $dateEnd === '') {
            return '---';
        }

        $left = $dateStart !== '' ? hoadon_format_datetime($dateStart, 'date') : '---';
        return $dateEnd !== '' ? ($left . ' -> ' . hoadon_format_datetime($dateEnd, 'date')) : $left;
    }
}

if (!function_exists('hoadon_real_or_plan_datetime')) {
    function hoadon_real_or_plan_datetime(string $real, string $datePlan, string $timePlan): string
    {
        if ($real !== '') {
            return hoadon_format_datetime($real);
        }
        if ($datePlan === '') {
            return 'N/A';
        }

        $time = $timePlan !== '' ? hoadon_format_datetime($timePlan, 'time') : '--:--:--';
        return hoadon_format_datetime($datePlan, 'date') . ' ' . $time;
    }
}

if (!function_exists('hoadon_build_detail_view')) {
    function hoadon_build_detail_view(array $row, ?array $nhanVienRow): array
    {
        $statusMeta = hoadon_status_meta((string)($row['trangthai'] ?? ''));
        $statusText = (string)($statusMeta['text'] ?? ($row['trangthai'] ?? ''));
        $statusRaw = strtolower(trim($statusText));

        $progress = max(0, min(100, (float)($row['tien_do'] ?? 0)));
        $progressText = rtrim(rtrim(number_format($progress, 2, '.', ''), '0'), '.');

        $priceRaw = hoadon_get_first($row, ['tong_tien', 'tongtien'], '0');
        $priceDigits = preg_replace('/[^0-9]/', '', $priceRaw);
        $priceNum = $priceDigits !== '' ? (float)$priceDigits : 0.0;
        $priceText = $priceNum > 0 ? number_format($priceNum, 0, ',', '.') . ' VND' : ($priceRaw !== '' ? $priceRaw : '0 VND');

        $dateStart = hoadon_get_first($row, ['ngay_bat_dau_kehoach', 'ngay_bat_dau'], '');
        $dateEnd = hoadon_get_first($row, ['ngay_ket_thuc_kehoach', 'ngay_ket_thuc'], '');
        $timeStart = hoadon_get_first($row, ['gio_bat_dau_kehoach', 'gio_bat_dau'], '');
        $timeEnd = hoadon_get_first($row, ['gio_ket_thuc_kehoach', 'gio_ket_thuc'], '');

        $startReal = trim((string)($row['thoigian_batdau_thucte'] ?? ''));
        $endReal = trim((string)($row['thoigian_ketthuc_thucte'] ?? ''));
        $createdDate = hoadon_get_first($row, ['ngaydat', 'created_date'], '');
        $updatedAt = $endReal !== '' ? $endReal : ($startReal !== '' ? $startReal : $createdDate);

        $hasStart = $startReal !== '';
        $hasEnd = $endReal !== '';
        $isDone = (strpos($statusRaw, 'hoàn thành') !== false || strpos($statusRaw, 'hoan thanh') !== false) || $hasEnd;
        $isRunning = (strpos($statusRaw, 'đang') !== false || strpos($statusRaw, 'dang') !== false) && !$isDone;

        $jobs = hoadon_parse_jobs(hoadon_get_first($row, ['cong_viec', 'congviec'], ''));

        $supplierName = hoadon_get_first($row, ['tenncc', 'hotenncc', 'nhacungcapnhan'], hoadon_staff_field($nhanVienRow, ['hovaten'], 'Chưa phân công'));
        $supplierPhone = hoadon_get_first($row, ['sdtncc', 'sodienthoaincc'], hoadon_staff_field($nhanVienRow, ['sodienthoai'], 'N/A'));
        $supplierEmail = hoadon_get_first($row, ['emailncc'], hoadon_staff_field($nhanVienRow, ['email'], 'N/A'));
        $supplierAddress = hoadon_get_first($row, ['diachincc'], hoadon_staff_field($nhanVienRow, ['diachi'], 'N/A'));

        $supplierRating = hoadon_staff_field($nhanVienRow, ['diem_danhgia', 'rating'], '');
        $supplierReviews = hoadon_staff_field($nhanVienRow, ['so_danh_gia', 'review_count'], '');

        return [
            'statusText' => $statusText,
            'progressText' => $progressText,
            'priceText' => $priceText,
            'timeRange' => hoadon_build_time_range($timeStart, $timeEnd),
            'dateRange' => hoadon_build_date_range($dateStart, $dateEnd),
            'address' => hoadon_get_first($row, ['diachikhachhang', 'diachi'], 'N/A'),
            'requestText' => hoadon_get_first($row, ['yeu_cau_khac', 'yeucaukhac'], 'Không có'),
            'noteText' => hoadon_get_first($row, ['ghi_chu', 'ghichu'], 'Không có'),
            'jobItems' => $jobs,
            'jobCount' => count($jobs),
            'updatedAtDisplay' => $updatedAt !== '' ? hoadon_format_datetime($updatedAt) : 'N/A',
            'startRealDisplay' => hoadon_real_or_plan_datetime($startReal, $dateStart, $timeStart),
            'timeEndDisplay' => $timeEnd !== '' ? hoadon_format_datetime($timeEnd, 'time') : 'N/A',
            'endRealDisplay' => hoadon_real_or_plan_datetime($endReal, $dateEnd, $timeEnd),
            'hasStart' => $hasStart,
            'hasEnd' => $hasEnd,
            'isDone' => $isDone,
            'isRunning' => $isRunning,
            'customerName' => hoadon_get_first($row, ['tenkhachhang', 'hovaten'], 'N/A'),
            'customerPhone' => hoadon_get_first($row, ['sdtkhachhang', 'sodienthoai'], 'N/A'),
            'customerEmail' => hoadon_get_first($row, ['emailkhachhang', 'email'], 'N/A'),
            'customerAddress' => hoadon_get_first($row, ['diachikhachhang', 'diachi'], 'N/A'),
            'customerAvatar' => trim((string)($row['anh_dai_dien'] ?? '')),
            'createdDateDisplay' => $createdDate !== '' ? hoadon_format_datetime($createdDate) : 'N/A',
            'serviceName' => hoadon_get_first($row, ['dich_vu', 'dichvu'], 'N/A'),
            'packageName' => hoadon_get_first($row, ['goi_dich_vu', 'goidichvu'], 'N/A'),
            'supplierAssigned' => (int)($row['id_nhacungcap'] ?? 0) > 0,
            'supplierName' => $supplierName,
            'supplierPhone' => $supplierPhone,
            'supplierEmail' => $supplierEmail,
            'supplierAddress' => $supplierAddress,
            'supplierAvatar' => hoadon_staff_field($nhanVienRow, ['anh_dai_dien'], ''),
            'supplierExp' => hoadon_staff_field($nhanVienRow, ['kinh_nghiem'], 'Không có'),
            'supplierRatingText' => $supplierRating !== '' ? ($supplierRating . ($supplierReviews !== '' ? (' (' . $supplierReviews . ' đánh giá)') : '')) : 'Chưa có đánh giá',
            'supplierReceivedAtDisplay' => hoadon_format_datetime(hoadon_get_first($row, ['ngaynhan'], '')),
            'reviewCustomer' => trim((string)($row['danhgia_khachhang'] ?? '')),
            'reviewSupplier' => trim((string)($row['danhgia_nhanvien'] ?? '')),
            'reviewCustomerAtDisplay' => hoadon_format_datetime(trim((string)($row['thoigian_danhgia_khachhang'] ?? ''))),
            'reviewSupplierAtDisplay' => hoadon_format_datetime(trim((string)($row['thoigian_danhgia_nhanvien'] ?? ''))),
        ];
    }
}

if (!function_exists('hoadon_build_list_item')) {
    function hoadon_build_list_item(array $row): array
    {
        $statusMeta = hoadon_status_meta((string)($row['trangthai'] ?? ''));
        $customerName = hoadon_get_first($row, ['tenkhachhang', 'hovaten'], 'N/A');
        $customerPhone = hoadon_get_first($row, ['sdtkhachhang', 'sodienthoai'], '');
        $serviceName = hoadon_get_first($row, ['dich_vu', 'dichvu'], 'N/A');
        $packageName = hoadon_get_first($row, ['goi_dich_vu', 'goidichvu'], 'N/A');
        $bookedAtRaw = hoadon_get_first($row, ['ngaydat', 'created_date', 'ngay_bat_dau_kehoach', 'ngay_bat_dau'], '');

        return [
            'id' => (int)($row['id'] ?? 0),
            'statusMeta' => $statusMeta,
            'customerName' => $customerName,
            'customerPhone' => $customerPhone,
            'serviceName' => $serviceName,
            'packageName' => $packageName,
            'priceText' => hoadon_get_first($row, ['tong_tien', 'tongtien'], '0'),
            'bookedAtText' => hoadon_format_datetime($bookedAtRaw, 'auto'),
            'bookedDateYmd' => hoadon_parse_date_ymd($bookedAtRaw),
            'searchText' => strtolower(implode(' ', [
                (string)($row['id'] ?? ''),
                $customerName,
                $customerPhone,
                $serviceName,
                $packageName,
            ])),
        ];
    }
}

if (!function_exists('get_hoadon_list_view_data')) {
    function get_hoadon_list_view_data(string $q = '', string $statusFilter = 'all', string $dateFrom = '', string $dateTo = ''): array
    {
        $result = get_hoadon_data();
        if (($result['error'] ?? '') !== '') {
            return ['items' => [], 'error' => (string)$result['error']];
        }

        $qLower = strtolower(trim($q));
        $dateFromYmd = hoadon_parse_date_ymd($dateFrom);
        $dateToYmd = hoadon_parse_date_ymd($dateTo);
        if ($dateFromYmd !== '' && $dateToYmd !== '' && $dateFromYmd > $dateToYmd) {
            [$dateFromYmd, $dateToYmd] = [$dateToYmd, $dateFromYmd];
        }

        $items = [];
        foreach (($result['rows'] ?? []) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $item = hoadon_build_list_item($row);

            if ($statusFilter !== 'all' && ($item['statusMeta']['key'] ?? '') !== $statusFilter) {
                continue;
            }

            if ($qLower !== '' && strpos((string)$item['searchText'], $qLower) === false) {
                continue;
            }

            $bookedDateYmd = (string)($item['bookedDateYmd'] ?? '');
            if ($dateFromYmd !== '' && ($bookedDateYmd === '' || $bookedDateYmd < $dateFromYmd)) {
                continue;
            }

            if ($dateToYmd !== '' && ($bookedDateYmd === '' || $bookedDateYmd > $dateToYmd)) {
                continue;
            }

            $items[] = $item;
        }

        return ['items' => $items, 'error' => ''];
    }
}

if (!function_exists('get_hoadon_detail_view_data')) {
    function get_hoadon_detail_view_data(int $id): array
    {
        $detail = get_hoadon_by_id($id);
        $row = $detail['row'] ?? null;
        $error = (string)($detail['error'] ?? '');
        $viewDefaults = hoadon_detail_view_defaults();

        if (!is_array($row)) {
            return ['row' => null, 'view' => $viewDefaults, 'error' => ($error !== '' ? $error : 'Không tìm thấy hóa đơn.')];
        }

        $nhanVienRow = hoadon_get_nhanvien_row($row);

        return [
            'row' => $row,
            'view' => array_merge($viewDefaults, hoadon_build_detail_view($row, $nhanVienRow)),
            'error' => '',
        ];
    }
}

if (!function_exists('get_hoadon_by_id')) {
    function get_hoadon_by_id(int $id): array
    {
        if ($id <= 0) {
            return ['row' => null, 'error' => 'Ma hoa don khong hop le.'];
        }

        $result = get_hoadon_data();
        if (($result['error'] ?? '') !== '') {
            return ['row' => null, 'error' => (string)$result['error']];
        }

        foreach (($result['rows'] ?? []) as $row) {
            if ((int)($row['id'] ?? 0) === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Khong tim thay hoa don.'];
    }
}

if (!function_exists('hoadon_status_key')) {
    function hoadon_status_key(string $status): string
    {
        $raw = strtolower(trim($status));

        $aliases = [
            'cancelled' => ['huy_don', 'huy don', 'huy', 'da_huy', 'da huy', 'đã hủy', 'cancelled', 'canceled'],
            'completed' => ['hoan_thanh', 'hoan thanh', 'completed', 'done'],
            'in_progress' => ['da_nhan', 'da nhan', 'đã nhận', 'received', 'dang_thuc_hien', 'dang thuc hien', 'in_progress', 'in progress'],
            'confirmed' => ['da_duyet', 'da duyet', 'đã duyệt', 'approved', 'da_xac_nhan', 'da xac nhan', 'confirmed'],
            'pending' => ['', 'pending', 'cho_duyet', 'cho duyet', 'chờ duyệt', 'waiting'],
        ];

        foreach ($aliases as $key => $values) {
            if (in_array($raw, $values, true)) {
                return $key;
            }
        }

        return 'other';
    }
}

if (!function_exists('hoadon_status_meta')) {
    function hoadon_status_meta(string $status): array
    {
        $key = hoadon_status_key($status);

        $metaMap = [
            'cancelled' => ['text' => 'Da huy', 'badge' => 'text-bg-danger'],
            'completed' => ['text' => 'Hoan thanh', 'badge' => 'text-bg-success'],
            'in_progress' => ['text' => 'Dang thuc hien', 'badge' => 'text-bg-warning'],
            'confirmed' => ['text' => 'Da xac nhan', 'badge' => 'text-bg-info'],
            'pending' => ['text' => 'Cho xac nhan', 'badge' => 'text-bg-secondary'],
            'other' => ['text' => 'Khac', 'badge' => 'text-bg-dark'],
        ];

        $meta = $metaMap[$key] ?? $metaMap['other'];
        return ['key' => $key, 'text' => $meta['text'], 'badge' => $meta['badge']];
    }
}
