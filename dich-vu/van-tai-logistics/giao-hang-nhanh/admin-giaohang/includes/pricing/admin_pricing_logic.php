<?php
$pricingFile = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'pricing-data.json';
$serviceMeta = [
    'tieuchuan' => 'Tiêu chuẩn',
    'nhanh' => 'Nhanh',
    'hoatoc' => 'Hỏa tốc',
    'laptuc' => 'Ngay lập tức',
];
$scheduledServiceMeta = [
    'tieuchuan' => $serviceMeta['tieuchuan'],
    'nhanh' => $serviceMeta['nhanh'],
    'hoatoc' => $serviceMeta['hoatoc'],
];
$instantServiceKey = 'laptuc';

$successMsg = '';
$errorMsg = '';
$pricingStorageSource = 'file';
$pricingActiveVersionId = 0;

function read_pricing_json($path)
{
    global $pricingStorageSource, $pricingActiveVersionId;

    $loaded = pricing_service_load_config($path);
    $pricingStorageSource = (string) ($loaded['source'] ?? 'file');
    $pricingActiveVersionId = (int) ($loaded['version_id'] ?? 0);

    return [$loaded['data'] ?? null, (string) ($loaded['error'] ?? '')];
}

function sanitize_price_key($value)
{
    $value = strtolower(trim((string) $value));
    $value = preg_replace('/[^a-z0-9\-_]+/', '-', $value);
    return trim((string) $value, '-');
}

function to_int_price($value)
{
    return (int) round((float) str_replace(',', '', (string) $value));
}

function to_float_number($value, $precision = 2)
{
    return round((float) str_replace(',', '', (string) $value), $precision);
}

function time_text_to_minutes($value)
{
    $value = trim((string) $value);
    if (!preg_match('/^(\d{2}):(\d{2})$/', $value, $matches)) {
        return PHP_INT_MAX;
    }

    return ((int) $matches[1] * 60) + (int) $matches[2];
}

function sort_service_time_rows(array $rows): array
{
    $sortable = [];
    $index = 0;

    foreach ($rows as $key => $row) {
        $sortable[] = [
            'key' => $key,
            'row' => $row,
            'start' => time_text_to_minutes($row['batdau'] ?? ''),
            'end' => time_text_to_minutes($row['ketthuc'] ?? ''),
            'index' => $index++,
        ];
    }

    usort($sortable, static function (array $left, array $right): int {
        if ($left['start'] !== $right['start']) {
            return $left['start'] <=> $right['start'];
        }
        if ($left['end'] !== $right['end']) {
            return $left['end'] <=> $right['end'];
        }

        return $left['index'] <=> $right['index'];
    });

    $sorted = [];
    foreach ($sortable as $item) {
        $sorted[$item['key']] = $item['row'];
    }

    return $sorted;
}

function normalize_vehicle_configs($configs)
{
    $normalized = [];

    foreach ((array) $configs as $vehicle) {
        $key = trim((string) ($vehicle['key'] ?? ''));
        if ($key === '') {
            continue;
        }

        $normalized[$key] = [
            'key' => $key,
            'label' => trim((string) ($vehicle['label'] ?? $key)),
            'he_so_xe' => to_float_number($vehicle['he_so_xe'] ?? 1, 2),
            'gia_co_ban' => to_int_price($vehicle['gia_co_ban'] ?? 0),
            'phi_toi_thieu' => to_int_price($vehicle['phi_toi_thieu'] ?? 0),
            'trong_luong_toi_da' => to_float_number($vehicle['trong_luong_toi_da'] ?? 0, 2),
            'description' => trim((string) ($vehicle['description'] ?? '')),
        ];
    }

    return array_values($normalized);
}

function format_money_preview($value)
{
    return number_format((float) $value, 0, ',', '.') . 'đ';
}

function find_vehicle_config(array $vehicles, $key)
{
    foreach ($vehicles as $vehicle) {
        if (($vehicle['key'] ?? '') === $key) {
            return $vehicle;
        }
    }

    return null;
}

function is_valid_time_text($value)
{
    return preg_match('/^\d{2}:\d{2}$/', trim((string) $value)) === 1;
}

function get_vehicle_icon($key)
{
    $key = strtolower($key);
    if (strpos($key, 'motorcycle') !== false || strpos($key, 'xe_may') !== false) {
        return 'fa-motorcycle';
    }
    if (strpos($key, 'truck') !== false || strpos($key, 'xe_tai') !== false) {
        return 'fa-truck';
    }
    if (strpos($key, 'van') !== false || strpos($key, 'xe_ban_tai') !== false) {
        return 'fa-truck-front';
    }
    if (strpos($key, 'three_wheeler') !== false || strpos($key, 'ba_banh') !== false) {
        return 'fa-motorcycle'; // Hoặc icon phù hợp hơn
    }
    return 'fa-truck-pickup';
}


function build_admin_pricing_state(array $pricingData)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $serviceConfigs = $domestic['dichvu'] ?? [];
    $goodsFees = $domestic['philoaihang'] ?? [];
    $goodsLabels = $domestic['tenloaihang'] ?? [];
    $goodsDescriptions = $domestic['motaloaihang'] ?? [];
    $goodsMultipliers = $domestic['hesoloaihang'] ?? [];
    $distanceConfig = $domestic['cauhinh_khoangcach'] ?? [];
    $serviceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $serviceFeeConfig['thoigian'] = sort_service_time_rows((array) ($serviceFeeConfig['thoigian'] ?? []));
    $codInsuranceConfig = $pricingData['BANGGIA']['phuthu'] ?? [];
    $vehicleConfigs = normalize_vehicle_configs($pricingData['phuong_tien'] ?? []);
    $xeMayConfig = find_vehicle_config($vehicleConfigs, 'xe_may') ?? [];

    return [
        'domestic' => $domestic,
        'serviceConfigs' => $serviceConfigs,
        'goodsFees' => $goodsFees,
        'goodsLabels' => $goodsLabels,
        'goodsDescriptions' => $goodsDescriptions,
        'goodsMultipliers' => $goodsMultipliers,
        'distanceConfig' => $distanceConfig,
        'serviceFeeConfig' => $serviceFeeConfig,
        'codInsuranceConfig' => $codInsuranceConfig,
        'vehicleConfigs' => $vehicleConfigs,
        'xeMayConfig' => $xeMayConfig,
        'instantNearPrice' => to_int_price($distanceConfig['gia_xe_may_gan'] ?? ($xeMayConfig['gia_co_ban'] ?? 0)),
        'instantFarPrice' => to_int_price($distanceConfig['gia_xe_may_xa'] ?? 0),
        'instantFarThreshold' => to_float_number($distanceConfig['nguong_xe_may_xa'] ?? 0, 1),
    ];
}

function action_result($ok, $message, array $pricingData = [], $saveError = '')
{
    return [
        'ok' => $ok,
        'message' => $message,
        'pricingData' => $pricingData,
        'saveError' => $saveError,
    ];
}

function replace_assoc_key_preserve_order(array $rows, string $originalKey, string $nextKey, $nextValue): array
{
    $rebuilt = [];

    foreach ($rows as $key => $value) {
        if ((string) $key === $originalKey) {
            $rebuilt[$nextKey] = $nextValue;
            continue;
        }

        $rebuilt[$key] = $value;
    }

    return $rebuilt;
}

function handle_save_services_action(array $pricingData, array $submittedServices, array $scheduledServiceMeta)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $serviceConfigs = $domestic['dichvu'] ?? [];

    foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel) {
        $current = $serviceConfigs[$serviceKey] ?? [];
        $input = $submittedServices[$serviceKey] ?? [];
        $ten = trim((string) ($input['ten'] ?? ($current['ten'] ?? $serviceLabel)));
        if ($ten === '') {
            return action_result(false, 'Tên hiển thị của gói dịch vụ không được để trống.');
        }

        $base = $current['coban'] ?? [];
        $base['cungquan'] = to_int_price($input['cungquan'] ?? ($base['cungquan'] ?? 0));
        $base['khacquan'] = to_int_price($input['khacquan'] ?? ($base['khacquan'] ?? 0));
        $base['lientinh'] = to_int_price($input['lientinh'] ?? ($base['lientinh'] ?? 0));

        $current['ten'] = $ten;
        $current['coban'] = $base;
        $current['buoctiep'] = to_int_price($input['buoctiep'] ?? ($current['buoctiep'] ?? 0));
        unset($current['heso_dichvu']);
        $serviceConfigs[$serviceKey] = $current;
    }

    $domestic['dichvu'] = $serviceConfigs;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật bảng giá dịch vụ.', $pricingData, 'Không thể lưu bảng giá dịch vụ.');
}

function handle_save_instant_service_action(array $pricingData, array $input, array $distanceInput, array $serviceMeta, $instantServiceKey)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $serviceConfigs = $domestic['dichvu'] ?? [];
    $current = $serviceConfigs[$instantServiceKey] ?? [];
    $currentDistance = $domestic['cauhinh_khoangcach'] ?? [];

    $ten = trim((string) ($input['ten'] ?? ($current['ten'] ?? ($serviceMeta[$instantServiceKey] ?? 'Giao ngay'))));
    if ($ten === '') {
        return action_result(false, 'Tên hiển thị của Giao ngay không được để trống.');
    }

    $giaGan = to_int_price($distanceInput['gia_xe_may_gan'] ?? ($currentDistance['gia_xe_may_gan'] ?? 6500));
    $nguongXa = to_float_number($distanceInput['nguong_xe_may_xa'] ?? ($currentDistance['nguong_xe_may_xa'] ?? 20), 1);
    $giaXa = to_int_price($distanceInput['gia_xe_may_xa'] ?? ($currentDistance['gia_xe_may_xa'] ?? 5000));

    if ($giaGan <= 0 || $giaXa <= 0) {
        return action_result(false, 'Đơn giá xe máy phải lớn hơn 0.');
    }
    if ($nguongXa <= 0) {
        return action_result(false, 'Ngưỡng bắt đầu giá đường dài phải lớn hơn 0.');
    }
    if ($giaXa > $giaGan) {
        return action_result(false, 'Đơn giá sau ngưỡng xa không nên lớn hơn đơn giá gần.');
    }

    $current['ten'] = $ten;
    unset($current['heso_dichvu']);
    $currentDistance['gia_xe_may_gan'] = $giaGan;
    $currentDistance['nguong_xe_may_xa'] = $nguongXa;
    $currentDistance['gia_xe_may_xa'] = $giaXa;

    $serviceConfigs[$instantServiceKey] = $current;
    $domestic['dichvu'] = $serviceConfigs;
    $domestic['cauhinh_khoangcach'] = $currentDistance;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật cấu hình Giao ngay.', $pricingData, 'Không thể lưu cấu hình Giao ngay.');
}

function build_goods_payload_from_rows(array $submittedGoods)
{
    $nextFees = [];
    $nextLabels = [];
    $nextDescriptions = [];
    $nextMultipliers = [];

    foreach ($submittedGoods as $row) {
        $key = sanitize_price_key($row['key'] ?? '');
        if ($key === '') {
            return ['error' => 'Mã loại hàng không được để trống.'];
        }
        if (isset($nextFees[$key])) {
            return ['error' => 'Mã loại hàng bị trùng, vui lòng kiểm tra lại.'];
        }

        $label = trim((string) ($row['label'] ?? $key));
        if ($label === '') {
            return ['error' => 'Tên hiển thị của loại hàng không được để trống.'];
        }

        $heSo = to_float_number($row['he_so'] ?? 1, 3);
        if ($heSo < 1) {
            return ['error' => 'Hệ số loại hàng phải từ 1 trở lên.'];
        }

        $nextFees[$key] = to_int_price($row['fee'] ?? 0);
        $nextLabels[$key] = $label;
        $nextDescriptions[$key] = trim((string) ($row['description'] ?? ''));
        $nextMultipliers[$key] = $heSo;
    }

    return [
        'fees' => $nextFees,
        'labels' => $nextLabels,
        'descriptions' => $nextDescriptions,
        'multipliers' => $nextMultipliers,
    ];
}

function handle_save_goods_fees_action(array $pricingData, array $submittedGoods)
{
    $payload = build_goods_payload_from_rows($submittedGoods);
    if (isset($payload['error'])) {
        return action_result(false, $payload['error']);
    }

    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $domestic['philoaihang'] = $payload['fees'];
    $domestic['tenloaihang'] = $payload['labels'];
    $domestic['motaloaihang'] = $payload['descriptions'];
    $domestic['hesoloaihang'] = $payload['multipliers'];
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật danh sách phụ phí loại hàng.', $pricingData, 'Không thể lưu danh sách phụ phí loại hàng.');
}

function handle_add_goods_fee_action(array $pricingData, array $post)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $goodsFees = $domestic['philoaihang'] ?? [];
    $goodsLabels = $domestic['tenloaihang'] ?? [];
    $goodsDescriptions = $domestic['motaloaihang'] ?? [];
    $goodsMultipliers = $domestic['hesoloaihang'] ?? [];

    $newKey = sanitize_price_key($post['new_key'] ?? '');
    $newLabel = trim((string) ($post['new_label'] ?? ''));
    $newHeSo = to_float_number($post['new_he_so'] ?? 1, 3);

    if ($newKey === '' || $newLabel === '') {
        return action_result(false, 'Cần nhập mã loại hàng và tên hiển thị.');
    }
    if (isset($goodsFees[$newKey])) {
        return action_result(false, 'Mã loại hàng này đã tồn tại.');
    }
    if ($newHeSo < 1) {
        return action_result(false, 'Hệ số loại hàng phải từ 1 trở lên.');
    }

    $goodsFees[$newKey] = to_int_price($post['new_fee'] ?? 0);
    $goodsLabels[$newKey] = $newLabel;
    $goodsDescriptions[$newKey] = trim((string) ($post['new_description'] ?? ''));
    $goodsMultipliers[$newKey] = $newHeSo;

    $domestic['philoaihang'] = $goodsFees;
    $domestic['tenloaihang'] = $goodsLabels;
    $domestic['motaloaihang'] = $goodsDescriptions;
    $domestic['hesoloaihang'] = $goodsMultipliers;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã thêm loại phụ phí mới.', $pricingData, 'Không thể thêm loại phụ phí mới.');
}

function handle_delete_goods_fee_action(array $pricingData, $deleteKey)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $goodsFees = $domestic['philoaihang'] ?? [];
    $goodsLabels = $domestic['tenloaihang'] ?? [];
    $goodsDescriptions = $domestic['motaloaihang'] ?? [];
    $goodsMultipliers = $domestic['hesoloaihang'] ?? [];
    $deleteKey = sanitize_price_key($deleteKey);

    if ($deleteKey === '' || !isset($goodsFees[$deleteKey])) {
        return action_result(false, 'Không tìm thấy loại phụ phí cần xóa.');
    }

    unset($goodsFees[$deleteKey], $goodsLabels[$deleteKey], $goodsDescriptions[$deleteKey], $goodsMultipliers[$deleteKey]);
    $domestic['philoaihang'] = $goodsFees;
    $domestic['tenloaihang'] = $goodsLabels;
    $domestic['motaloaihang'] = $goodsDescriptions;
    $domestic['hesoloaihang'] = $goodsMultipliers;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã xóa loại phụ phí.', $pricingData, 'Không thể xóa loại phụ phí.');
}

function handle_save_service_fees_action(array $pricingData, array $submittedTime, array $submittedWeather)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $currentServiceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $currentTime = $currentServiceFeeConfig['thoigian'] ?? [];
    $currentWeather = $currentServiceFeeConfig['thoitiet'] ?? [];
    $nextTime = [];
    $nextWeather = [];

    foreach ($currentTime as $timeKey => $timeConfig) {
        $input = $submittedTime[$timeKey] ?? [];
        if (!isset($submittedTime[$timeKey])) {
            continue;
        }
        $ten = trim((string) ($input['ten'] ?? ($timeConfig['ten'] ?? $timeKey)));
        $batDau = trim((string) ($input['batdau'] ?? ($timeConfig['batdau'] ?? '00:00')));
        $ketThuc = trim((string) ($input['ketthuc'] ?? ($timeConfig['ketthuc'] ?? '23:59')));
        $heSo = to_float_number($input['heso'] ?? ($timeConfig['heso'] ?? 1), 3);

        if ($ten === '' || !is_valid_time_text($batDau) || !is_valid_time_text($ketThuc)) {
            return action_result(false, 'Khung giờ phải có tên, giờ bắt đầu và giờ kết thúc hợp lệ theo định dạng HH:MM.');
        }
        if ($heSo < 1) {
            return action_result(false, 'Hệ số phụ phí thời gian phải từ 1 trở lên.');
        }

        $timeConfig['ten'] = $ten;
        $timeConfig['batdau'] = $batDau;
        $timeConfig['ketthuc'] = $ketThuc;
        $timeConfig['phicodinh'] = to_int_price($input['phicodinh'] ?? ($timeConfig['phicodinh'] ?? 0));
        $timeConfig['heso'] = $heSo;
        $nextTime[$timeKey] = $timeConfig;
    }

    foreach ($currentWeather as $weatherKey => $weatherConfig) {
        $input = $submittedWeather[$weatherKey] ?? [];
        if (!isset($submittedWeather[$weatherKey])) {
            continue;
        }
        $ten = trim((string) ($input['ten'] ?? ($weatherConfig['ten'] ?? $weatherKey)));
        $heSo = to_float_number($input['heso'] ?? ($weatherConfig['heso'] ?? 1), 3);

        if ($ten === '') {
            return action_result(false, 'Tên điều kiện giao không được để trống.');
        }
        if ($heSo < 1) {
            return action_result(false, 'Hệ số điều kiện giao phải từ 1 trở lên.');
        }

        $weatherConfig['ten'] = $ten;
        $weatherConfig['phicodinh'] = to_int_price($input['phicodinh'] ?? ($weatherConfig['phicodinh'] ?? 0));
        $weatherConfig['heso'] = $heSo;
        $nextWeather[$weatherKey] = $weatherConfig;
    }

    $currentServiceFeeConfig['thoigian'] = $nextTime;
    $currentServiceFeeConfig['thoitiet'] = $nextWeather;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật phụ phí dịch vụ.', $pricingData, 'Không thể lưu phụ phí dịch vụ.');
}

function handle_add_service_time_action(array $pricingData, array $post)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $currentServiceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $currentTime = $currentServiceFeeConfig['thoigian'] ?? [];

    $key = sanitize_price_key($post['new_time_key'] ?? '');
    $label = trim((string) ($post['new_time_label'] ?? ''));
    $start = trim((string) ($post['new_time_start'] ?? '00:00'));
    $end = trim((string) ($post['new_time_end'] ?? '23:59'));
    $fixed = to_int_price($post['new_time_fixed_fee'] ?? 0);
    $heSo = to_float_number($post['new_time_he_so'] ?? 1, 3);

    if ($key === '' || $label === '') {
        return action_result(false, 'Cần nhập mã và tên cho khung giờ mới.');
    }
    if (isset($currentTime[$key])) {
        return action_result(false, 'Khung giờ này đã tồn tại.');
    }
    if (!is_valid_time_text($start) || !is_valid_time_text($end)) {
        return action_result(false, 'Giờ bắt đầu và kết thúc phải theo định dạng HH:MM.');
    }
    if ($heSo < 1) {
        return action_result(false, 'Hệ số phải từ 1 trở lên.');
    }

    $currentTime[$key] = [
        'ten' => $label,
        'batdau' => $start,
        'ketthuc' => $end,
        'phicodinh' => $fixed,
        'heso' => $heSo,
    ];
    $currentServiceFeeConfig['thoigian'] = $currentTime;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã thêm khung giờ mới.', $pricingData, 'Không thể thêm khung giờ mới.');
}

function handle_delete_service_time_action(array $pricingData, $deleteKey)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $currentServiceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $currentTime = $currentServiceFeeConfig['thoigian'] ?? [];
    $deleteKey = sanitize_price_key($deleteKey);

    if ($deleteKey === '' || !isset($currentTime[$deleteKey])) {
        return action_result(false, 'Không tìm thấy khung giờ cần xóa.');
    }

    unset($currentTime[$deleteKey]);
    $currentServiceFeeConfig['thoigian'] = $currentTime;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã xóa khung giờ.', $pricingData, 'Không thể xóa khung giờ.');
}

function handle_add_weather_action(array $pricingData, array $post)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $currentServiceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $currentWeather = $currentServiceFeeConfig['thoitiet'] ?? [];

    $key = sanitize_price_key($post['new_weather_key'] ?? '');
    $label = trim((string) ($post['new_weather_label'] ?? ''));
    $fixed = to_int_price($post['new_weather_fixed_fee'] ?? 0);
    $heSo = to_float_number($post['new_weather_he_so'] ?? 1, 3);

    if ($key === '' || $label === '') {
        return action_result(false, 'Cần nhập mã và tên cho điều kiện giao mới.');
    }
    if (isset($currentWeather[$key])) {
        return action_result(false, 'Điều kiện giao này đã tồn tại.');
    }
    if ($heSo < 1) {
        return action_result(false, 'Hệ số phải từ 1 trở lên.');
    }

    $currentWeather[$key] = [
        'ten' => $label,
        'phicodinh' => $fixed,
        'heso' => $heSo,
    ];
    $currentServiceFeeConfig['thoitiet'] = $currentWeather;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã thêm điều kiện giao mới.', $pricingData, 'Không thể thêm điều kiện giao mới.');
}

function handle_delete_weather_action(array $pricingData, $deleteKey)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $currentServiceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $currentWeather = $currentServiceFeeConfig['thoitiet'] ?? [];
    $deleteKey = sanitize_price_key($deleteKey);

    if ($deleteKey === '' || !isset($currentWeather[$deleteKey])) {
        return action_result(false, 'Không tìm thấy điều kiện giao cần xóa.');
    }

    unset($currentWeather[$deleteKey]);
    $currentServiceFeeConfig['thoitiet'] = $currentWeather;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã xóa điều kiện giao.', $pricingData, 'Không thể xóa điều kiện giao.');
}

function handle_save_service_time_row_action(array $pricingData, array $submittedRow, $originalKey)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $currentServiceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $currentTime = $currentServiceFeeConfig['thoigian'] ?? [];

    $originalKey = sanitize_price_key($originalKey);
    if ($originalKey === '' || !isset($currentTime[$originalKey])) {
        return action_result(false, 'Không tìm thấy khung giờ cần cập nhật.');
    }

    $nextKey = sanitize_price_key($submittedRow['key'] ?? $originalKey);
    $nextLabel = trim((string) ($submittedRow['ten'] ?? ($currentTime[$originalKey]['ten'] ?? $nextKey)));
    $start = trim((string) ($submittedRow['batdau'] ?? ($currentTime[$originalKey]['batdau'] ?? '00:00')));
    $end = trim((string) ($submittedRow['ketthuc'] ?? ($currentTime[$originalKey]['ketthuc'] ?? '23:59')));
    $fixed = to_int_price($submittedRow['phicodinh'] ?? ($currentTime[$originalKey]['phicodinh'] ?? 0));
    $heSo = to_float_number($submittedRow['heso'] ?? ($currentTime[$originalKey]['heso'] ?? 1), 3);

    if ($nextKey === '' || $nextLabel === '') {
        return action_result(false, 'Mã và tên khung giờ không được để trống.');
    }
    if ($nextKey !== $originalKey && isset($currentTime[$nextKey])) {
        return action_result(false, 'Mã khung giờ này đã tồn tại.');
    }
    if (!is_valid_time_text($start) || !is_valid_time_text($end)) {
        return action_result(false, 'Giờ bắt đầu và kết thúc không hợp lệ.');
    }
    if ($heSo < 1) {
        return action_result(false, 'Hệ số phải từ 1 trở lên.');
    }

    $currentTime = replace_assoc_key_preserve_order($currentTime, $originalKey, $nextKey, [
        'ten' => $nextLabel,
        'batdau' => $start,
        'ketthuc' => $end,
        'phicodinh' => $fixed,
        'heso' => $heSo,
    ]);

    $currentServiceFeeConfig['thoigian'] = $currentTime;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật khung giờ.', $pricingData, 'Không thể cập nhật khung giờ.');
}

function handle_save_weather_row_action(array $pricingData, array $submittedRow, $originalKey)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $currentServiceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
    $currentWeather = $currentServiceFeeConfig['thoitiet'] ?? [];

    $originalKey = sanitize_price_key($originalKey);
    if ($originalKey === '' || !isset($currentWeather[$originalKey])) {
        return action_result(false, 'Không tìm thấy điều kiện giao cần cập nhật.');
    }

    $nextKey = sanitize_price_key($submittedRow['key'] ?? $originalKey);
    $nextLabel = trim((string) ($submittedRow['ten'] ?? ($currentWeather[$originalKey]['ten'] ?? $nextKey)));
    $fixed = to_int_price($submittedRow['phicodinh'] ?? ($currentWeather[$originalKey]['phicodinh'] ?? 0));
    $heSo = to_float_number($submittedRow['heso'] ?? ($currentWeather[$originalKey]['heso'] ?? 1), 3);

    if ($nextKey === '' || $nextLabel === '') {
        return action_result(false, 'Mã và tên điều kiện không được để trống.');
    }
    if ($nextKey !== $originalKey && isset($currentWeather[$nextKey])) {
        return action_result(false, 'Mã điều kiện này đã tồn tại.');
    }
    if ($heSo < 1) {
        return action_result(false, 'Hệ số phải từ 1 trở lên.');
    }

    $currentWeather = replace_assoc_key_preserve_order($currentWeather, $originalKey, $nextKey, [
        'ten' => $nextLabel,
        'phicodinh' => $fixed,
        'heso' => $heSo,
    ]);

    $currentServiceFeeConfig['thoitiet'] = $currentWeather;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật điều kiện giao.', $pricingData, 'Không thể cập nhật điều kiện giao.');
}

function handle_save_cod_insurance_action(array $pricingData, array $submitted)
{
    $currentFeeConfig = $pricingData['BANGGIA']['phuthu'] ?? [];

    $codRate = to_float_number($submitted['cod_kieu'] ?? (($currentFeeConfig['thuho']['kieu'] ?? 0)), 4);
    $insuranceRate = to_float_number($submitted['insurance_kieu'] ?? (($currentFeeConfig['baohiem']['kieu'] ?? 0)), 4);

    if ($codRate < 0 || $codRate > 1 || $insuranceRate < 0 || $insuranceRate > 1) {
        return action_result(false, 'Tỷ lệ COD và bảo hiểm phải nằm trong khoảng từ 0 đến 1.');
    }

    $currentFeeConfig['thuho']['nguong'] = to_int_price($submitted['cod_nguong'] ?? (($currentFeeConfig['thuho']['nguong'] ?? 0)));
    $currentFeeConfig['thuho']['kieu'] = $codRate;
    $currentFeeConfig['thuho']['toithieu'] = to_int_price($submitted['cod_toithieu'] ?? (($currentFeeConfig['thuho']['toithieu'] ?? 0)));

    $currentFeeConfig['baohiem']['nguong'] = to_int_price($submitted['insurance_nguong'] ?? (($currentFeeConfig['baohiem']['nguong'] ?? 0)));
    $currentFeeConfig['baohiem']['kieu'] = $insuranceRate;
    $currentFeeConfig['baohiem']['toithieu'] = to_int_price($submitted['insurance_toithieu'] ?? (($currentFeeConfig['baohiem']['toithieu'] ?? 0)));

    $pricingData['BANGGIA']['phuthu'] = $currentFeeConfig;

    return action_result(true, 'Đã cập nhật COD và bảo hiểm.', $pricingData, 'Không thể lưu COD và bảo hiểm.');
}

function handle_save_vehicles_action(array $pricingData, array $submittedVehicles)
{
    $nextVehicles = [];
    $seenKeys = [];

    foreach ($submittedVehicles as $vehicle) {
        $key = trim((string) ($vehicle['key'] ?? ''));
        if ($key === '') {
            return action_result(false, 'Mã phương tiện không được để trống.');
        }
        if (isset($seenKeys[$key])) {
            return action_result(false, 'Mã phương tiện bị trùng, vui lòng kiểm tra lại.');
        }

        $label = trim((string) ($vehicle['label'] ?? $key));
        $heSoXe = to_float_number($vehicle['he_so_xe'] ?? 1, 2);
        $giaCoBan = to_int_price($vehicle['gia_co_ban'] ?? 0);
        $phiToiThieu = to_int_price($vehicle['phi_toi_thieu'] ?? 0);
        $trongLuong = to_float_number($vehicle['trong_luong_toi_da'] ?? 0, 2);

        if ($label === '') {
            return action_result(false, 'Tên hiển thị phương tiện không được để trống.');
        }
        if ($heSoXe < 1) {
            return action_result(false, 'Hệ số xe phải từ 1 trở lên.');
        }
        if ($giaCoBan <= 0 || $phiToiThieu < 0 || $trongLuong <= 0) {
            return action_result(false, 'Giá cơ bản, phí tối thiểu và tải trọng tối đa của phương tiện phải hợp lệ.');
        }

        $seenKeys[$key] = true;
        $nextVehicles[] = [
            'key' => $key,
            'label' => $label,
            'he_so_xe' => $heSoXe,
            'gia_co_ban' => $giaCoBan,
            'phi_toi_thieu' => $phiToiThieu,
            'trong_luong_toi_da' => $trongLuong,
            'description' => trim((string) ($vehicle['description'] ?? '')),
        ];
    }

    if (!isset($seenKeys['xe_may'])) {
        return action_result(false, 'Cần giữ lại cấu hình xe_may để tính Giao ngay.');
    }

    $pricingData['phuong_tien'] = $nextVehicles;
    return action_result(true, 'Đã cập nhật cấu hình phương tiện.', $pricingData, 'Không thể lưu cấu hình phương tiện.');
}

function handle_add_vehicle_action(array $pricingData, array $post)
{
    $vehicles = normalize_vehicle_configs($pricingData['phuong_tien'] ?? []);

    $key = sanitize_price_key($post['new_vehicle_key'] ?? '');
    $label = trim((string) ($post['new_vehicle_label'] ?? ''));
    $weight = to_float_number($post['new_vehicle_weight'] ?? 0, 2);
    $basePrice = to_int_price($post['new_vehicle_base_price'] ?? 0);
    $heSoXe = to_float_number($post['new_vehicle_he_so_xe'] ?? 1, 2);
    $minimumFee = to_int_price($post['new_vehicle_min_fee'] ?? 0);
    $description = trim((string) ($post['new_vehicle_description'] ?? ''));

    if ($key === '' || $label === '') {
        return action_result(false, 'Cần nhập mã và tên hiển thị cho phương tiện mới.');
    }
    if (find_vehicle_config($vehicles, $key)) {
        return action_result(false, 'Mã phương tiện này đã tồn tại.');
    }
    if ($weight <= 0 || $basePrice <= 0 || $heSoXe < 1 || $minimumFee < 0) {
        return action_result(false, 'Giá trị phương tiện mới không hợp lệ.');
    }

    $vehicles[] = [
        'key' => $key,
        'label' => $label,
        'he_so_xe' => $heSoXe,
        'gia_co_ban' => $basePrice,
        'phi_toi_thieu' => $minimumFee,
        'trong_luong_toi_da' => $weight,
        'description' => $description,
    ];

    $pricingData['phuong_tien'] = array_values($vehicles);
    return action_result(true, 'Đã thêm phương tiện mới.', $pricingData, 'Không thể thêm phương tiện mới.');
}

function handle_delete_vehicle_action(array $pricingData, $deleteKey)
{
    $vehicles = normalize_vehicle_configs($pricingData['phuong_tien'] ?? []);
    $deleteKey = sanitize_price_key($deleteKey);
    if ($deleteKey === '') {
        return action_result(false, 'Mã phương tiện không hợp lệ.');
    }

    $next = [];
    $found = false;
    foreach ($vehicles as $vehicle) {
        if (($vehicle['key'] ?? '') === $deleteKey) {
            $found = true;
            continue;
        }
        $next[] = $vehicle;
    }

    if (!$found) {
        return action_result(false, 'Không tìm thấy phương tiện cần xóa.');
    }
    if (!find_vehicle_config($next, 'xe_may')) {
        return action_result(false, 'Cần giữ lại cấu hình xe_may để tính Giao ngay.');
    }

    $pricingData['phuong_tien'] = array_values($next);
    return action_result(true, 'Đã xóa phương tiện.', $pricingData, 'Không thể xóa phương tiện.');
}

function handle_save_vehicle_row_action(array $pricingData, array $submittedVehicle, $originalKey)
{
    $vehicles = normalize_vehicle_configs($pricingData['phuong_tien'] ?? []);
    $originalKey = trim((string) $originalKey);
    $index = null;

    foreach ($vehicles as $i => $vehicle) {
        if (($vehicle['key'] ?? '') === $originalKey) {
            $index = $i;
            break;
        }
    }

    if ($index === null) {
        return action_result(false, 'Không tìm thấy phương tiện cần cập nhật.');
    }

    $nextKey = trim((string) ($submittedVehicle['key'] ?? $originalKey));
    $nextLabel = trim((string) ($submittedVehicle['label'] ?? ($vehicles[$index]['label'] ?? $nextKey)));
    $heSoXe = to_float_number($submittedVehicle['he_so_xe'] ?? ($vehicles[$index]['he_so_xe'] ?? 1), 2);
    $giaCoBan = to_int_price($submittedVehicle['gia_co_ban'] ?? ($vehicles[$index]['gia_co_ban'] ?? 0));
    $phiToiThieu = to_int_price($submittedVehicle['phi_toi_thieu'] ?? ($vehicles[$index]['phi_toi_thieu'] ?? 0));
    $trongLuong = to_float_number($submittedVehicle['trong_luong_toi_da'] ?? ($vehicles[$index]['trong_luong_toi_da'] ?? 0), 2);

    if ($nextKey === '') {
        return action_result(false, 'Mã phương tiện không được để trống.');
    }
    if ($nextLabel === '') {
        return action_result(false, 'Tên hiển thị phương tiện không được để trống.');
    }
    if ($heSoXe < 1) {
        return action_result(false, 'Hệ số xe phải từ 1 trở lên.');
    }
    if ($giaCoBan <= 0 || $phiToiThieu < 0 || $trongLuong <= 0) {
        return action_result(false, 'Giá cơ bản, phí tối thiểu và tải trọng tối đa của phương tiện phải hợp lệ.');
    }

    foreach ($vehicles as $i => $vehicle) {
        if ($i === $index) {
            continue;
        }
        if (($vehicle['key'] ?? '') === $nextKey) {
            return action_result(false, 'Mã phương tiện bị trùng, vui lòng kiểm tra lại.');
        }
    }

    $vehicles[$index] = [
        'key' => $nextKey,
        'label' => $nextLabel,
        'he_so_xe' => $heSoXe,
        'gia_co_ban' => $giaCoBan,
        'phi_toi_thieu' => $phiToiThieu,
        'trong_luong_toi_da' => $trongLuong,
        'description' => trim((string) ($submittedVehicle['description'] ?? ($vehicles[$index]['description'] ?? ''))),
    ];

    if (!find_vehicle_config($vehicles, 'xe_may')) {
        return action_result(false, 'Cần giữ lại cấu hình xe_may để tính Giao ngay.');
    }

    $pricingData['phuong_tien'] = array_values($vehicles);
    return action_result(true, 'Đã cập nhật phương tiện.', $pricingData, 'Không thể cập nhật phương tiện.');
}

function handle_save_goods_fee_row_action(array $pricingData, array $submittedRow, $originalKey)
{
    $domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
    $goodsFees = $domestic['philoaihang'] ?? [];
    $goodsLabels = $domestic['tenloaihang'] ?? [];
    $goodsDescriptions = $domestic['motaloaihang'] ?? [];
    $goodsMultipliers = $domestic['hesoloaihang'] ?? [];

    $originalKey = sanitize_price_key($originalKey);
    if ($originalKey === '' || !isset($goodsFees[$originalKey])) {
        return action_result(false, 'Không tìm thấy loại hàng cần cập nhật.');
    }

    $nextKey = sanitize_price_key($submittedRow['key'] ?? $originalKey);
    $nextLabel = trim((string) ($submittedRow['label'] ?? ($goodsLabels[$originalKey] ?? $nextKey)));
    $nextHeSo = to_float_number($submittedRow['he_so'] ?? ($goodsMultipliers[$originalKey] ?? 1), 3);

    if ($nextKey === '') {
        return action_result(false, 'Mã loại hàng không được để trống.');
    }
    if ($nextLabel === '') {
        return action_result(false, 'Tên hiển thị của loại hàng không được để trống.');
    }
    if ($nextHeSo < 1) {
        return action_result(false, 'Hệ số loại hàng phải từ 1 trở lên.');
    }
    if ($nextKey !== $originalKey && isset($goodsFees[$nextKey])) {
        return action_result(false, 'Mã loại hàng này đã tồn tại.');
    }

    $nextFee = to_int_price($submittedRow['fee'] ?? $goodsFees[$originalKey]);
    $nextDescription = trim((string) ($submittedRow['description'] ?? ($goodsDescriptions[$originalKey] ?? '')));

    $goodsFees = replace_assoc_key_preserve_order($goodsFees, $originalKey, $nextKey, $nextFee);
    $goodsLabels = replace_assoc_key_preserve_order($goodsLabels, $originalKey, $nextKey, $nextLabel);
    $goodsDescriptions = replace_assoc_key_preserve_order($goodsDescriptions, $originalKey, $nextKey, $nextDescription);
    $goodsMultipliers = replace_assoc_key_preserve_order($goodsMultipliers, $originalKey, $nextKey, $nextHeSo);

    $domestic['philoaihang'] = $goodsFees;
    $domestic['tenloaihang'] = $goodsLabels;
    $domestic['motaloaihang'] = $goodsDescriptions;
    $domestic['hesoloaihang'] = $goodsMultipliers;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật loại phụ phí.', $pricingData, 'Không thể cập nhật loại phụ phí.');
}

function dispatch_pricing_action($action, array $post, array $pricingData, array $serviceMeta, array $scheduledServiceMeta, $instantServiceKey)
{
    switch ($action) {
        case 'save_services':
            return handle_save_services_action($pricingData, $post['services'] ?? [], $scheduledServiceMeta);
        case 'save_instant_service':
            return handle_save_instant_service_action($pricingData, $post['instant_service'] ?? [], $post['instant_distance'] ?? [], $serviceMeta, $instantServiceKey);
        case 'save_goods_fees':
            return handle_save_goods_fees_action($pricingData, $post['goods'] ?? []);
        case 'add_goods_fee':
            return handle_add_goods_fee_action($pricingData, $post);
        case 'delete_goods_fee':
            return handle_delete_goods_fee_action($pricingData, $post['delete_key'] ?? '');
        case 'save_service_fees':
            return handle_save_service_fees_action($pricingData, $post['service_time'] ?? [], $post['service_weather'] ?? []);
        case 'add_service_time':
            return handle_add_service_time_action($pricingData, $post);
        case 'delete_service_time':
            return handle_delete_service_time_action($pricingData, $post['delete_key'] ?? '');
        case 'add_weather':
            return handle_add_weather_action($pricingData, $post);
        case 'delete_weather':
            return handle_delete_weather_action($pricingData, $post['delete_key'] ?? '');
        case 'save_cod_insurance':
            return handle_save_cod_insurance_action($pricingData, $post['cod_insurance'] ?? []);
        case 'save_vehicles':
            return handle_save_vehicles_action($pricingData, $post['vehicles'] ?? []);
        case 'add_vehicle':
            return handle_add_vehicle_action($pricingData, $post);
        case 'delete_vehicle':
            return handle_delete_vehicle_action($pricingData, $post['delete_key'] ?? '');
        case 'save_vehicle_row':
            return handle_save_vehicle_row_action($pricingData, $post['vehicle_row'] ?? [], $post['original_vehicle_key'] ?? '');
        case 'save_goods_fee_row':
            return handle_save_goods_fee_row_action($pricingData, $post['goods_row'] ?? [], $post['original_goods_key'] ?? '');
        case 'save_service_time_row':
            return handle_save_service_time_row_action($pricingData, $post['time_row'] ?? [], $post['original_time_key'] ?? '');
        case 'save_weather_row':
            return handle_save_weather_row_action($pricingData, $post['weather_row'] ?? [], $post['original_weather_key'] ?? '');
        default:
            return action_result(false, 'Hành động cập nhật không hợp lệ.');
    }
}

[$pricingData, $readError] = read_pricing_json($pricingFile);
$pricingCanEdit = $pricingStorageSource === 'krud' || $pricingStorageSource === 'json_cache_bootstrap';
$pricingSourceLabel = match ($pricingStorageSource) {
    'krud' => 'KRUD active #' . $pricingActiveVersionId,
    'json_cache_bootstrap' => 'JSON cache bootstrap',
    'krud_error' => 'KRUD lỗi đọc dữ liệu',
    default => 'Không có nguồn dữ liệu',
};
$pricingSourceDescription = match ($pricingStorageSource) {
    'krud' => 'KRUD đang là nguồn chính. JSON cache public chỉ là file export để trang public đọc nhanh.',
    'json_cache_bootstrap' => 'Chưa có KRUD active. Hệ thống chỉ dùng JSON cache để khởi tạo KRUD lần đầu; sau khi lưu, KRUD sẽ thành nguồn chính.',
    'krud_error' => 'KRUD active đang lỗi nên không cho chỉnh từ JSON cache. Cần sửa dữ liệu/API KRUD trước rồi export lại JSON.',
    default => 'Không đọc được KRUD hoặc JSON cache.',
};

if (!$pricingData) {
    $errorMsg = $readError;
    $pricingData = [];
}

$state = build_admin_pricing_state($pricingData);
extract($state, EXTR_OVERWRITE);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax_preview'])) {
    header('Content-Type: application/json; charset=UTF-8');

    if ($errorMsg !== '' || !$pricingCanEdit) {
        echo json_encode([
            'success' => false,
            'message' => $errorMsg !== '' ? $errorMsg : 'KRUD là nguồn chính, JSON chỉ là cache/export nên không thể chỉnh khi KRUD chưa sẵn sàng.',
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    $action = trim((string) ($_POST['action'] ?? ''));
    $result = dispatch_pricing_action(
        $action,
        $_POST,
        $pricingData,
        $serviceMeta,
        $scheduledServiceMeta,
        $instantServiceKey
    );

    echo json_encode([
        'success' => !empty($result['ok']),
        'message' => (string) ($result['message'] ?? ''),
        'pricingData' => $result['pricingData'] ?? [],
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$errorMsg) {
    $errorMsg = 'Trang bảng giá hiện lưu qua KRUD bằng JavaScript. Vui lòng bật JavaScript rồi thử lại.';
}
