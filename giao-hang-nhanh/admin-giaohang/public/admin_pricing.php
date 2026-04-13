<?php
session_start();

require_once __DIR__ . '/../lib/pricing_config_service.php';

if (!isset($_SESSION['user_id']) || ($_SESSION['role'] ?? '') !== 'admin') {
    header('Location: login.php');
    exit;
}

$pricingFile = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'pricing-data.json';
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

    unset($goodsFees[$originalKey], $goodsLabels[$originalKey], $goodsDescriptions[$originalKey], $goodsMultipliers[$originalKey]);
    $goodsFees[$nextKey] = $nextFee;
    $goodsLabels[$nextKey] = $nextLabel;
    $goodsDescriptions[$nextKey] = $nextDescription;
    $goodsMultipliers[$nextKey] = $nextHeSo;

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
        default:
            return action_result(false, 'Hành động cập nhật không hợp lệ.');
    }
}

[$pricingData, $readError] = read_pricing_json($pricingFile);

if (!$pricingData) {
    $errorMsg = $readError;
    $pricingData = [];
}

$state = build_admin_pricing_state($pricingData);
extract($state, EXTR_OVERWRITE);

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['ajax_preview'])) {
    header('Content-Type: application/json; charset=UTF-8');

    if ($errorMsg !== '') {
        echo json_encode([
            'success' => false,
            'message' => $errorMsg,
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
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Quản lý bảng giá | Admin</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/admin.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="assets/css/admin/pricing.css?v=<?php echo time(); ?>">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
</head>

<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý bảng giá</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <?php if ($successMsg !== ''): ?>
            <div class="pricing-alert pricing-alert--success">
                <i class="fa-solid fa-circle-check"></i> <?php echo htmlspecialchars($successMsg, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <?php if ($errorMsg !== ''): ?>
            <div class="pricing-alert pricing-alert--error">
                <i class="fa-solid fa-circle-exclamation"></i>
                <?php echo htmlspecialchars($errorMsg, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <div class="pricing-shell" data-active-version-id="<?php echo htmlspecialchars((string) $pricingActiveVersionId, ENT_QUOTES, 'UTF-8'); ?>">
            <div class="pricing-brief">
                <p class="pricing-note">
                    Bảng giá được nạp từ
                    <?php echo $pricingStorageSource === 'krud' ? '<strong>KRUD versioned storage</strong>' : '<code>public/data/pricing-data.json</code>'; ?>
                    và luôn export lại về <code>public/data/pricing-data.json</code> cho UI ngoài đọc. Ba gói chính dùng
                    giá cố định theo vùng, còn <strong>Giao ngay</strong> lấy đơn giá theo km và cấu hình phương tiện.
                </p>
                <?php if ($pricingActiveVersionId > 0): ?>
                    <p class="pricing-note" style="margin-top:8px;">
                        Phiên bản active hiện tại:
                        <strong>#<?php echo htmlspecialchars((string) $pricingActiveVersionId, ENT_QUOTES, 'UTF-8'); ?></strong>
                    </p>
                <?php endif; ?>
            </div>
            <div class="pricing-content">
                <div class="pricing-tabs">
                    <div class="pricing-tabs__label">Mục chỉnh giá</div>
                    <nav class="pricing-nav pricing-nav--tabs">
                        <a href="#section-vung" data-pricing-tab="section-vung">Ba gói chính</a>
                        <a href="#section-instant" data-pricing-tab="section-instant">Giao ngay</a>
                        <a href="#section-service-fee" data-pricing-tab="section-service-fee">Phụ phí dịch vụ</a>
                        <a href="#section-cod" data-pricing-tab="section-cod">COD và bảo hiểm</a>
                        <a href="#section-vehicle" data-pricing-tab="section-vehicle">Phương tiện</a>
                        <a href="#section-goods" data-pricing-tab="section-goods">Phụ phí loại hàng</a>
                    </nav>
                </div>
                <div class="pricing-grid">
                    <?php $instantConfig = $serviceConfigs[$instantServiceKey] ?? []; ?>

                    <section class="pricing-card" id="section-vung">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Bảng giá dịch vụ chính</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Giá cố định của 3 gói
                                        theo vùng giao hàng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Cước nền của
                                        Tiêu chuẩn, Nhanh và Hỏa tốc.</p>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary pricing-open-btn"
                                data-open-modal="modal-services"><i class="fa-solid fa-pen-to-square"></i> Chỉnh toàn
                                bộ</button>
                        </div>
                        <div class="pricing-card__body">
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--services">
                                    <thead>
                                        <tr>
                                            <th>Dịch vụ</th>
                                            <th>Tên hiển thị</th>
                                            <th>Nội quận</th>
                                            <th>Nội thành</th>
                                            <th>Liên tỉnh</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel): ?>
                                            <?php $config = $serviceConfigs[$serviceKey] ?? []; ?>
                                            <?php $base = $config['coban'] ?? []; ?>
                                            <tr>
                                                <td><strong><?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?></strong>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['cungquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['khacquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['lientinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-service-<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>">Chi
                                                        tiết</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-instant">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Cấu hình Giao ngay</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Đơn giá gần, ngưỡng xa và
                                        đơn giá xa của xe máy.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Phần cước vận
                                        chuyển chính của dịch vụ Giao ngay.</p>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary pricing-open-btn"
                                data-open-modal="modal-instant"><i class="fa-solid fa-pen-to-square"></i> Chỉnh chi
                                tiết</button>
                        </div>
                        <div class="pricing-card__body">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Phí tối thiểu xe máy chỉnh ở tab <strong>Phương tiện</strong>. Công thức hiện dùng:
                                <strong>max(phí tối thiểu, km × đơn giá xe máy × hệ số xăng)</strong>.
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table">
                                    <thead>
                                        <tr>
                                            <th>Tên hiển thị</th>
                                            <th>Đơn giá gần</th>
                                            <th>Ngưỡng xa</th>
                                            <th>Đơn giá xa</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey]), ENT_QUOTES, 'UTF-8'); ?>
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview($instantNearPrice), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars((string) $instantFarThreshold, ENT_QUOTES, 'UTF-8'); ?>
                                                km</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview($instantFarPrice), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-instant">Chi tiết</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-service-fee">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phụ phí dịch vụ</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Phí cố định và hệ số theo
                                        khung giờ, điều kiện giao.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Phần phụ phí
                                        cộng thêm vào cước vận chuyển.</p>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary pricing-open-btn"
                                data-open-modal="modal-service-fees"><i class="fa-solid fa-pen-to-square"></i> Chỉnh
                                toàn bộ</button>
                        </div>
                        <div class="pricing-card__body">
                            <div class="pricing-summary-group">
                                <div class="pricing-summary-group__head">
                                    <h4>Khung giờ</h4>
                                    <span><?php echo count((array) ($serviceFeeConfig['thoigian'] ?? [])); ?> mục</span>
                                </div>
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-summary-table pricing-table--service-fees">
                                        <thead>
                                            <tr>
                                                <th>Tên</th>
                                                <th>Bắt đầu</th>
                                                <th>Kết thúc</th>
                                                <th>Phí cố định</th>
                                                <th>Hệ số</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                                                <tr>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><span
                                                            class="pricing-value"><?php echo htmlspecialchars(format_money_preview($timeConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><button type="button" class="pricing-action-btn"
                                                            data-open-modal="modal-time-<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>">Chi
                                                            tiết</button></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="pricing-summary-group">
                                <div class="pricing-summary-group__head">
                                    <h4>Điều kiện giao</h4>
                                    <span><?php echo count((array) ($serviceFeeConfig['thoitiet'] ?? [])); ?> mục</span>
                                </div>
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-summary-table pricing-table--service-fees">
                                        <thead>
                                            <tr>
                                                <th>Tên</th>
                                                <th>Phí cố định</th>
                                                <th>Hệ số</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                                                <tr>
                                                    <td><?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><span
                                                            class="pricing-value"><?php echo htmlspecialchars(format_money_preview($weatherConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($weatherConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><button type="button" class="pricing-action-btn"
                                                            data-open-modal="modal-weather-<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>">Chi
                                                            tiết</button></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-cod">
                        <div class="pricing-card__head">
                            <div>
                                <h3>COD / bảo hiểm</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Ngưỡng miễn phí, tỷ lệ và
                                        mức tối thiểu cho COD, bảo hiểm.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Các khoản thu hộ
                                        và bảo hiểm trong breakdown đơn hàng.</p>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary pricing-open-btn" data-open-modal="modal-cod"><i
                                    class="fa-solid fa-pen-to-square"></i> Chỉnh chi tiết</button>
                        </div>
                        <div class="pricing-card__body">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Tỷ lệ nhập dưới dạng số thập phân. Ví dụ <strong>0.012</strong> tương đương
                                <strong>1.2%</strong>.
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table">
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Ngưỡng miễn phí</th>
                                            <th>Tỷ lệ</th>
                                            <th>Tối thiểu</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>COD</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['thuho']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars(number_format(((float) ($codInsuranceConfig['thuho']['kieu'] ?? 0)) * 100, 2), ENT_QUOTES, 'UTF-8'); ?>%
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['thuho']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-cod-row">Chi tiết</button></td>
                                        </tr>
                                        <tr>
                                            <td>Bảo hiểm</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['baohiem']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars(number_format(((float) ($codInsuranceConfig['baohiem']['kieu'] ?? 0)) * 100, 2), ENT_QUOTES, 'UTF-8'); ?>%
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['baohiem']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-insurance-row">Chi tiết</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card pricing-card--wide" id="section-vehicle">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phương tiện</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Giá cơ bản, hệ số xe, phí
                                        tối thiểu và tải trọng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Giá theo phương
                                        tiện, nhất là xe máy và xe 4 bánh.</p>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary pricing-open-btn"
                                data-open-modal="modal-vehicles"><i class="fa-solid fa-pen-to-square"></i> Chỉnh toàn
                                bộ</button>
                        </div>
                        <div class="pricing-card__body">
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--vehicles">
                                    <thead>
                                        <tr>
                                            <th>Mã</th>
                                            <th>Tên hiển thị</th>
                                            <th>Tải trọng tối đa</th>
                                            <th>Giá cơ bản</th>
                                            <th>Hệ số xe</th>
                                            <th>Đơn giá thực tế/km</th>
                                            <th>Phí tối thiểu</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                                            <?php $donGiaKm = round((float) ($vehicle['gia_co_ban'] ?? 0) * (float) ($vehicle['he_so_xe'] ?? 1)); ?>
                                            <tr>
                                                <td><strong><?php echo htmlspecialchars((string) ($vehicle['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></strong>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>
                                                    kg</td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($vehicle['gia_co_ban'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($vehicle['he_so_xe'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($donGiaKm), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-vehicle-<?php echo htmlspecialchars((string) ($vehicle['key'] ?? $vehicleIndex), ENT_QUOTES, 'UTF-8'); ?>">Chi
                                                        tiết</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-goods">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phụ phí loại hàng</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Phụ phí, hệ số và mô tả
                                        của từng loại hàng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Khoản cộng thêm
                                        theo loại hàng trong breakdown cước.</p>
                                </div>
                            </div>
                            <button type="button" class="btn-secondary pricing-open-btn"
                                data-open-modal="modal-goods"><i class="fa-solid fa-pen-to-square"></i> Chỉnh toàn
                                bộ</button>
                        </div>
                        <div class="pricing-card__body">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Hệ số lớn hơn <strong>1</strong> sẽ cộng thêm theo phần trăm trên cước vận chuyển chính.
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--goods">
                                    <thead>
                                        <tr>
                                            <th>Mã</th>
                                            <th>Tên hiển thị</th>
                                            <th>Phụ phí</th>
                                            <th>Hệ số</th>
                                            <th>Mô tả</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($goodsFees as $goodsKey => $goodsFee): ?>
                                            <tr>
                                                <td><strong><?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?></strong>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($goodsFee), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td class="pricing-cell-muted">
                                                    <?php echo htmlspecialchars((string) ($goodsDescriptions[$goodsKey] ?? 'Chưa có mô tả'), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-goods-<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">Chi
                                                        tiết</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>

                <div class="pricing-modal" data-modal="modal-services" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog pricing-modal__dialog--lg" role="dialog" aria-modal="true"
                        aria-labelledby="modal-services-title">
                        <div class="pricing-modal__head">
                            <div>
                                <h3 id="modal-services-title">Chỉnh bảng giá dịch vụ chính</h3>
                                <p>Nhập giá cố định cho 3 gói theo vùng giao hàng.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <form method="post" onsubmit="return confirm('Lưu thay đổi cho 3 gói dịch vụ chính?');">
                                <input type="hidden" name="action" value="save_services">
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-table--services">
                                        <thead>
                                            <tr>
                                                <th>Dịch vụ</th>
                                                <th>Tên hiển thị</th>
                                                <th>Nội quận</th>
                                                <th>Nội thành</th>
                                                <th>Liên tỉnh</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel): ?>
                                                <?php $config = $serviceConfigs[$serviceKey] ?? []; ?>
                                                <?php $base = $config['coban'] ?? []; ?>
                                                <tr>
                                                    <td><strong><?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?></strong>
                                                    </td>
                                                    <td><input class="admin-input" type="text"
                                                            name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][ten]"
                                                            value="<?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="1000"
                                                            name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][cungquan]"
                                                            value="<?php echo htmlspecialchars((string) ($base['cungquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="1000"
                                                            name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][khacquan]"
                                                            value="<?php echo htmlspecialchars((string) ($base['khacquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="1000"
                                                            name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][lientinh]"
                                                            value="<?php echo htmlspecialchars((string) ($base['lientinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu bảng giá dịch vụ</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="pricing-modal" data-modal="modal-instant" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog" role="dialog" aria-modal="true"
                        aria-labelledby="modal-instant-title">
                        <div class="pricing-modal__head">
                            <div>
                                <h3 id="modal-instant-title">Chỉnh cấu hình Giao ngay</h3>
                                <p>Điều chỉnh đơn giá km của xe máy cho Giao ngay.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Phí tối thiểu xe máy chỉnh ở tab <strong>Phương tiện</strong>. Công thức hiện dùng:
                                <strong>max(phí tối thiểu, km × đơn giá xe máy × hệ số xăng)</strong>.
                            </p>
                            <form method="post" onsubmit="return confirm('Lưu thay đổi cho cấu hình Giao ngay?');">
                                <input type="hidden" name="action" value="save_instant_service">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label for="instant-ten">Tên hiển thị</label>
                                        <input id="instant-ten" class="admin-input" type="text"
                                            name="instant_service[ten]"
                                            value="<?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey]), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="instant-near-price">Đơn giá xe máy đến ngưỡng xa</label>
                                        <input id="instant-near-price" class="admin-input" type="number" min="0"
                                            step="500" name="instant_distance[gia_xe_may_gan]"
                                            value="<?php echo htmlspecialchars((string) $instantNearPrice, ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="instant-threshold">Ngưỡng bắt đầu giá đường dài (km)</label>
                                        <input id="instant-threshold" class="admin-input" type="number" min="0"
                                            step="0.1" name="instant_distance[nguong_xe_may_xa]"
                                            value="<?php echo htmlspecialchars((string) $instantFarThreshold, ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="instant-far-price">Đơn giá xe máy sau ngưỡng xa</label>
                                        <input id="instant-far-price" class="admin-input" type="number" min="0"
                                            step="500" name="instant_distance[gia_xe_may_xa]"
                                            value="<?php echo htmlspecialchars((string) $instantFarPrice, ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu cấu hình Giao ngay</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="pricing-modal" data-modal="modal-service-fees" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog pricing-modal__dialog--lg" role="dialog" aria-modal="true"
                        aria-labelledby="modal-service-fees-title">
                        <div class="pricing-modal__head">
                            <div>
                                <h3 id="modal-service-fees-title">Chỉnh phụ phí dịch vụ</h3>
                                <p>Cập nhật khung giờ và điều kiện giao áp vào cước vận chuyển.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <form method="post" data-confirm-message="Lưu thay đổi phụ phí dịch vụ?">
                                <input type="hidden" name="action" value="save_service_fees">
                                <input type="hidden" name="delete_key" value="">
                                <div class="pricing-summary-group">
                                    <div class="pricing-summary-group__head">
                                        <h4>Khung giờ</h4>
                                    </div>
                                    <div class="pricing-table-wrap">
                                        <table class="pricing-table pricing-table--service-fees">
                                            <thead>
                                                <tr>
                                                    <th>Khung giờ</th>
                                                    <th>Bắt đầu</th>
                                                    <th>Kết thúc</th>
                                                    <th>Phí cố định</th>
                                                    <th>Hệ số</th>
                                                    <th>Xóa</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                                                    <tr>
                                                        <td><input class="admin-input" type="text"
                                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][ten]"
                                                                value="<?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td><input class="admin-input" type="time"
                                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][batdau]"
                                                                value="<?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td><input class="admin-input" type="time"
                                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][ketthuc]"
                                                                value="<?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td><input class="admin-input" type="number" min="0" step="1000"
                                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][phicodinh]"
                                                                value="<?php echo htmlspecialchars((string) ($timeConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td><input class="admin-input" type="number" min="0" step="0.01"
                                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][heso]"
                                                                value="<?php echo htmlspecialchars((string) ($timeConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td>
                                                            <button type="button" class="pricing-inline-delete"
                                                                data-pricing-action="delete_service_time"
                                                                data-delete-key="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                                data-confirm-message="Xóa khung giờ này?">
                                                                <i class="fa-solid fa-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="pricing-divider"></div>
                                <div class="pricing-summary-group">
                                    <div class="pricing-summary-group__head">
                                        <h4>Điều kiện giao</h4>
                                    </div>
                                    <div class="pricing-table-wrap">
                                        <table class="pricing-table pricing-table--service-fees">
                                            <thead>
                                                <tr>
                                                    <th>Điều kiện giao</th>
                                                    <th>Phí cố định</th>
                                                    <th>Hệ số</th>
                                                    <th>Xóa</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                                                    <tr>
                                                        <td><input class="admin-input" type="text"
                                                                name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][ten]"
                                                                value="<?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td><input class="admin-input" type="number" min="0" step="1000"
                                                                name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][phicodinh]"
                                                                value="<?php echo htmlspecialchars((string) ($weatherConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td><input class="admin-input" type="number" min="0" step="0.01"
                                                                name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][heso]"
                                                                value="<?php echo htmlspecialchars((string) ($weatherConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                                        </td>
                                                        <td>
                                                            <button type="button" class="pricing-inline-delete"
                                                                data-pricing-action="delete_weather"
                                                                data-delete-key="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                                data-confirm-message="Xóa điều kiện giao này?">
                                                                <i class="fa-solid fa-trash"></i>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                <?php endforeach; ?>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu phụ phí dịch vụ</button>
                                </div>
                            </form>
                            <div class="pricing-divider"></div>
                            <form method="post" onsubmit="return confirm('Thêm khung giờ mới?');">
                                <input type="hidden" name="action" value="add_service_time">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label for="new-time-key">Mã khung giờ</label>
                                        <input id="new-time-key" class="admin-input" type="text" name="new_time_key"
                                            placeholder="vi_du: dem" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-time-label">Tên hiển thị</label>
                                        <input id="new-time-label" class="admin-input" type="text"
                                            name="new_time_label" placeholder="Ví dụ: Giờ đêm" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-time-start">Bắt đầu</label>
                                        <input id="new-time-start" class="admin-input" type="time"
                                            name="new_time_start" value="00:00" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-time-end">Kết thúc</label>
                                        <input id="new-time-end" class="admin-input" type="time"
                                            name="new_time_end" value="23:59" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-time-fixed-fee">Phí cố định</label>
                                        <input id="new-time-fixed-fee" class="admin-input" type="number" min="0"
                                            step="1000" name="new_time_fixed_fee" value="0" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-time-he-so">Hệ số</label>
                                        <input id="new-time-he-so" class="admin-input" type="number" min="1"
                                            step="0.01" name="new_time_he_so" value="1" required>
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-secondary"><i class="fa-solid fa-plus"></i> Thêm
                                        khung giờ mới</button>
                                </div>
                            </form>
                            <form method="post" onsubmit="return confirm('Thêm điều kiện giao mới?');">
                                <input type="hidden" name="action" value="add_weather">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label for="new-weather-key">Mã điều kiện</label>
                                        <input id="new-weather-key" class="admin-input" type="text"
                                            name="new_weather_key" placeholder="vi_du: troi_mua" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-weather-label">Tên hiển thị</label>
                                        <input id="new-weather-label" class="admin-input" type="text"
                                            name="new_weather_label" placeholder="Ví dụ: Trời mưa" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-weather-fixed-fee">Phí cố định</label>
                                        <input id="new-weather-fixed-fee" class="admin-input" type="number" min="0"
                                            step="1000" name="new_weather_fixed_fee" value="0" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-weather-he-so">Hệ số</label>
                                        <input id="new-weather-he-so" class="admin-input" type="number" min="1"
                                            step="0.01" name="new_weather_he_so" value="1" required>
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-secondary"><i class="fa-solid fa-plus"></i> Thêm
                                        điều kiện mới</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="pricing-modal" data-modal="modal-cod" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog" role="dialog" aria-modal="true"
                        aria-labelledby="modal-cod-title">
                        <div class="pricing-modal__head">
                            <div>
                                <h3 id="modal-cod-title">Chỉnh COD và bảo hiểm</h3>
                                <p>Thiết lập ngưỡng miễn phí, tỷ lệ và mức tối thiểu.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Tỷ lệ nhập dưới dạng số thập phân. Ví dụ <strong>0.012</strong> tương đương
                                <strong>1.2%</strong>.
                            </p>
                            <form method="post" onsubmit="return confirm('Lưu thay đổi COD và bảo hiểm?');">
                                <input type="hidden" name="action" value="save_cod_insurance">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label for="cod-nguong">Ngưỡng COD miễn phí</label>
                                        <input id="cod-nguong" class="admin-input" type="number" min="0" step="1000"
                                            name="cod_insurance[cod_nguong]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="cod-kieu">Tỷ lệ COD</label>
                                        <input id="cod-kieu" class="admin-input" type="number" min="0" step="0.0001"
                                            name="cod_insurance[cod_kieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['kieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="cod-toithieu">COD tối thiểu</label>
                                        <input id="cod-toithieu" class="admin-input" type="number" min="0" step="1000"
                                            name="cod_insurance[cod_toithieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="insurance-nguong">Ngưỡng bảo hiểm</label>
                                        <input id="insurance-nguong" class="admin-input" type="number" min="0"
                                            step="1000" name="cod_insurance[insurance_nguong]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="insurance-kieu">Tỷ lệ bảo hiểm</label>
                                        <input id="insurance-kieu" class="admin-input" type="number" min="0"
                                            step="0.0001" name="cod_insurance[insurance_kieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['kieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label for="insurance-toithieu">Bảo hiểm tối thiểu</label>
                                        <input id="insurance-toithieu" class="admin-input" type="number" min="0"
                                            step="1000" name="cod_insurance[insurance_toithieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu COD / bảo hiểm</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="pricing-modal" data-modal="modal-vehicles" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog pricing-modal__dialog--xl" role="dialog" aria-modal="true"
                        aria-labelledby="modal-vehicles-title">
                        <div class="pricing-modal__head">
                            <div>
                                <h3 id="modal-vehicles-title">Chỉnh cấu hình phương tiện</h3>
                                <p>Giá cơ bản, hệ số xe, phí tối thiểu và tải trọng được chỉnh tại đây.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <form method="post" data-confirm-message="Lưu thay đổi cấu hình phương tiện?">
                                <input type="hidden" name="action" value="save_vehicles">
                                <input type="hidden" name="delete_key" value="">
                                <?php if (!$vehicleConfigs): ?>
                                    <p class="pricing-section__hint pricing-section__hint--inline">
                                        Chưa có cấu hình phương tiện trong nguồn pricing hiện tại. Hãy hoàn tất dữ liệu
                                        phương tiện rồi lưu lại để hệ thống export lại <code>pricing-data.json</code>.
                                    </p>
                                <?php endif; ?>
                                <p class="pricing-scroll-hint">
                                    Kéo ngang bảng để xem đủ tất cả cột. Riêng cột <strong>Mô tả</strong> đã được nới
                                    rộng để đọc nội dung dài dễ hơn.
                                </p>
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-table--vehicles">
                                        <thead>
                                            <tr>
                                                <th>Mã</th>
                                                <th>Tên hiển thị</th>
                                                <th>Tải trọng tối đa</th>
                                                <th>Giá cơ bản</th>
                                                <th>Hệ số xe</th>
                                                <th>Đơn giá thực tế/km</th>
                                                <th>Phí tối thiểu</th>
                                                <th>Mô tả</th>
                                                <th>Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                                                <?php $donGiaKm = round((float) ($vehicle['gia_co_ban'] ?? 0) * (float) ($vehicle['he_so_xe'] ?? 1)); ?>
                                                <tr>
                                                    <td><input class="admin-input" type="text"
                                                            name="vehicles[<?php echo $vehicleIndex; ?>][key]"
                                                            value="<?php echo htmlspecialchars((string) ($vehicle['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="text"
                                                            name="vehicles[<?php echo $vehicleIndex; ?>][label]"
                                                            value="<?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="0.1"
                                                            name="vehicles[<?php echo $vehicleIndex; ?>][trong_luong_toi_da]"
                                                            value="<?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="500"
                                                            name="vehicles[<?php echo $vehicleIndex; ?>][gia_co_ban]"
                                                            value="<?php echo htmlspecialchars((string) ($vehicle['gia_co_ban'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="0.05"
                                                            name="vehicles[<?php echo $vehicleIndex; ?>][he_so_xe]"
                                                            value="<?php echo htmlspecialchars((string) ($vehicle['he_so_xe'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><strong><?php echo htmlspecialchars(format_money_preview($donGiaKm), ENT_QUOTES, 'UTF-8'); ?></strong>
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="1000"
                                                            name="vehicles[<?php echo $vehicleIndex; ?>][phi_toi_thieu]"
                                                            value="<?php echo htmlspecialchars((string) ($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><textarea class="admin-input pricing-textarea" rows="2"
                                                            name="vehicles[<?php echo $vehicleIndex; ?>][description]"><?php echo htmlspecialchars((string) ($vehicle['description'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                                                    </td>
                                                    <td>
                                                        <button type="button" class="pricing-inline-delete"
                                                            data-pricing-action="delete_vehicle"
                                                            data-delete-key="<?php echo htmlspecialchars((string) ($vehicle['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>"
                                                            data-confirm-message="Xóa phương tiện này?">
                                                            <i class="fa-solid fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu phương tiện</button>
                                </div>
                            </form>
                            <div class="pricing-divider"></div>
                            <form method="post" onsubmit="return confirm('Thêm phương tiện mới?');">
                                <input type="hidden" name="action" value="add_vehicle">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label for="new-vehicle-key">Mã phương tiện</label>
                                        <input id="new-vehicle-key" class="admin-input" type="text"
                                            name="new_vehicle_key" placeholder="vi_du: xe_tai_1_tan" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-vehicle-label">Tên hiển thị</label>
                                        <input id="new-vehicle-label" class="admin-input" type="text"
                                            name="new_vehicle_label" placeholder="Ví dụ: Xe tải 1 tấn" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-vehicle-weight">Tải trọng tối đa</label>
                                        <input id="new-vehicle-weight" class="admin-input" type="number" min="0"
                                            step="0.1" name="new_vehicle_weight" value="1" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-vehicle-base-price">Giá cơ bản</label>
                                        <input id="new-vehicle-base-price" class="admin-input" type="number" min="0"
                                            step="500" name="new_vehicle_base_price" value="0" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-vehicle-he-so-xe">Hệ số xe</label>
                                        <input id="new-vehicle-he-so-xe" class="admin-input" type="number" min="1"
                                            step="0.05" name="new_vehicle_he_so_xe" value="1" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-vehicle-min-fee">Phí tối thiểu</label>
                                        <input id="new-vehicle-min-fee" class="admin-input" type="number" min="0"
                                            step="1000" name="new_vehicle_min_fee" value="0" required>
                                    </div>
                                    <div class="form-group" style="grid-column: 1 / -1;">
                                        <label for="new-vehicle-description">Mô tả</label>
                                        <textarea id="new-vehicle-description" class="admin-input pricing-textarea"
                                            rows="2" name="new_vehicle_description"></textarea>
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-secondary"><i class="fa-solid fa-plus"></i> Thêm
                                        phương tiện mới</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="pricing-modal" data-modal="modal-goods" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog pricing-modal__dialog--lg" role="dialog" aria-modal="true"
                        aria-labelledby="modal-goods-title">
                        <div class="pricing-modal__head">
                            <div>
                                <h3 id="modal-goods-title">Chỉnh phụ phí loại hàng</h3>
                                <p>Quản lý phụ phí, hệ số và mô tả của từng loại hàng.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Hệ số lớn hơn <strong>1</strong> sẽ cộng thêm theo phần trăm trên cước vận chuyển chính.
                            </p>
                            <form method="post" onsubmit="return confirm('Lưu thay đổi phụ phí loại hàng?');">
                                <input type="hidden" name="action" value="save_goods_fees">
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-table--goods">
                                        <thead>
                                            <tr>
                                                <th>Mã</th>
                                                <th>Tên hiển thị</th>
                                                <th>Phụ phí</th>
                                                <th>Hệ số</th>
                                                <th>Mô tả</th>
                                                <th style="width: 68px;">Xóa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php $goodsRowIndex = 0; ?>
                                            <?php foreach ($goodsFees as $goodsKey => $goodsFee): ?>
                                                <tr>
                                                    <td><input class="admin-input" type="text"
                                                            name="goods[<?php echo $goodsRowIndex; ?>][key]"
                                                            value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="text"
                                                            name="goods[<?php echo $goodsRowIndex; ?>][label]"
                                                            value="<?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="1000"
                                                            name="goods[<?php echo $goodsRowIndex; ?>][fee]"
                                                            value="<?php echo htmlspecialchars((string) $goodsFee, ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="number" min="0" step="0.1"
                                                            name="goods[<?php echo $goodsRowIndex; ?>][he_so]"
                                                            value="<?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td><input class="admin-input" type="text"
                                                            name="goods[<?php echo $goodsRowIndex; ?>][description]"
                                                            value="<?php echo htmlspecialchars((string) ($goodsDescriptions[$goodsKey] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                                    </td>
                                                    <td>
                                                        <button class="pricing-inline-delete" type="submit"
                                                            onclick="if (!confirm('Xóa loại phụ phí này?')) { return false; } this.form.action.value='delete_goods_fee'; this.form.delete_key.value='<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>';">
                                                            <i class="fa-solid fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                                <?php $goodsRowIndex++; ?>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                                <input type="hidden" name="delete_key" value="">
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu phụ phí loại hàng</button>
                                </div>
                            </form>
                            <div class="pricing-divider"></div>
                            <form method="post" onsubmit="return confirm('Thêm loại phụ phí mới?');">
                                <input type="hidden" name="action" value="add_goods_fee">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label for="new-key">Mã loại hàng</label>
                                        <input id="new-key" type="text" name="new_key" class="admin-input"
                                            placeholder="vi_du: de-vo" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-label">Tên hiển thị</label>
                                        <input id="new-label" type="text" name="new_label" class="admin-input"
                                            placeholder="Ví dụ: Dễ vỡ" required>
                                    </div>
                                    <div class="form-group">
                                        <label for="new-fee">Phụ phí</label>
                                        <input id="new-fee" type="number" min="0" step="1000" name="new_fee"
                                            class="admin-input" value="0">
                                    </div>
                                    <div class="form-group">
                                        <label for="new-he-so">Hệ số</label>
                                        <input id="new-he-so" type="number" min="0" step="0.1" name="new_he_so"
                                            class="admin-input" value="1">
                                    </div>
                                    <div class="form-group" style="grid-column: 1 / -1;">
                                        <label for="new-description">Mô tả</label>
                                        <input id="new-description" type="text" name="new_description"
                                            class="admin-input" placeholder="Mô tả thêm cho loại hàng mới">
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-secondary"><i class="fa-solid fa-plus"></i> Thêm
                                        loại phụ phí mới</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <?php foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel): ?>
                    <?php $config = $serviceConfigs[$serviceKey] ?? []; ?>
                    <?php $base = $config['coban'] ?? []; ?>
                    <div class="pricing-modal"
                        data-modal="modal-service-<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3><?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>
                                    </h3>
                                    <p>Chỉnh riêng gói dịch vụ này.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" onsubmit="return confirm('Lưu thay đổi cho gói dịch vụ này?');">
                                    <input type="hidden" name="action" value="save_services">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text"
                                                name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][ten]"
                                                value="<?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Nội quận</label>
                                            <input class="admin-input" type="number" min="0" step="1000"
                                                name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][cungquan]"
                                                value="<?php echo htmlspecialchars((string) ($base['cungquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Nội thành</label>
                                            <input class="admin-input" type="number" min="0" step="1000"
                                                name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][khacquan]"
                                                value="<?php echo htmlspecialchars((string) ($base['khacquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Liên tỉnh</label>
                                            <input class="admin-input" type="number" min="0" step="1000"
                                                name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][lientinh]"
                                                value="<?php echo htmlspecialchars((string) ($base['lientinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                            Lưu gói này</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                    <div class="pricing-modal"
                        data-modal="modal-time-<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3><?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>
                                    </h3>
                                    <p>Chỉnh riêng khung giờ này.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" onsubmit="return confirm('Lưu thay đổi cho khung giờ này?');">
                                    <input type="hidden" name="action" value="save_service_fees">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Tên khung giờ</label>
                                            <input class="admin-input" type="text"
                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][ten]"
                                                value="<?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Bắt đầu</label>
                                            <input class="admin-input" type="time"
                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][batdau]"
                                                value="<?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Kết thúc</label>
                                            <input class="admin-input" type="time"
                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][ketthuc]"
                                                value="<?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Phí cố định</label>
                                            <input class="admin-input" type="number" min="0" step="1000"
                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][phicodinh]"
                                                value="<?php echo htmlspecialchars((string) ($timeConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số</label>
                                            <input class="admin-input" type="number" min="0" step="0.01"
                                                name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][heso]"
                                                value="<?php echo htmlspecialchars((string) ($timeConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                            Lưu khung giờ</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                    <div class="pricing-modal"
                        data-modal="modal-weather-<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3><?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>
                                    </h3>
                                    <p>Chỉnh riêng điều kiện giao này.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" onsubmit="return confirm('Lưu thay đổi cho điều kiện giao này?');">
                                    <input type="hidden" name="action" value="save_service_fees">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Tên điều kiện</label>
                                            <input class="admin-input" type="text"
                                                name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][ten]"
                                                value="<?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Phí cố định</label>
                                            <input class="admin-input" type="number" min="0" step="1000"
                                                name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][phicodinh]"
                                                value="<?php echo htmlspecialchars((string) ($weatherConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số</label>
                                            <input class="admin-input" type="number" min="0" step="0.01"
                                                name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][heso]"
                                                value="<?php echo htmlspecialchars((string) ($weatherConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                            Lưu điều kiện</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>

                <div class="pricing-modal" data-modal="modal-cod-row" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                        <div class="pricing-modal__head">
                            <div>
                                <h3>Chi tiết COD</h3>
                                <p>Chỉnh riêng cấu hình COD.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <form method="post" onsubmit="return confirm('Lưu thay đổi cấu hình COD?');">
                                <input type="hidden" name="action" value="save_cod_insurance">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label>Ngưỡng COD miễn phí</label>
                                        <input class="admin-input" type="number" min="0" step="1000"
                                            name="cod_insurance[cod_nguong]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label>Tỷ lệ COD</label>
                                        <input class="admin-input" type="number" min="0" step="0.0001"
                                            name="cod_insurance[cod_kieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['kieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label>COD tối thiểu</label>
                                        <input class="admin-input" type="number" min="0" step="1000"
                                            name="cod_insurance[cod_toithieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu COD</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div class="pricing-modal" data-modal="modal-insurance-row" hidden>
                    <div class="pricing-modal__backdrop" data-close-modal></div>
                    <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                        <div class="pricing-modal__head">
                            <div>
                                <h3>Chi tiết bảo hiểm</h3>
                                <p>Chỉnh riêng cấu hình bảo hiểm.</p>
                            </div>
                            <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                    class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="pricing-modal__body">
                            <form method="post" onsubmit="return confirm('Lưu thay đổi cấu hình bảo hiểm?');">
                                <input type="hidden" name="action" value="save_cod_insurance">
                                <div class="pricing-add-grid">
                                    <div class="form-group">
                                        <label>Ngưỡng bảo hiểm</label>
                                        <input class="admin-input" type="number" min="0" step="1000"
                                            name="cod_insurance[insurance_nguong]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label>Tỷ lệ bảo hiểm</label>
                                        <input class="admin-input" type="number" min="0" step="0.0001"
                                            name="cod_insurance[insurance_kieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['kieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                    <div class="form-group">
                                        <label>Bảo hiểm tối thiểu</label>
                                        <input class="admin-input" type="number" min="0" step="1000"
                                            name="cod_insurance[insurance_toithieu]"
                                            value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                                    </div>
                                </div>
                                <div class="pricing-actions">
                                    <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                        Lưu bảo hiểm</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                    <div class="pricing-modal"
                        data-modal="modal-vehicle-<?php echo htmlspecialchars((string) ($vehicle['key'] ?? $vehicleIndex), ENT_QUOTES, 'UTF-8'); ?>"
                        hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3><?php echo htmlspecialchars((string) ($vehicle['label'] ?? $vehicle['key'] ?? 'Phương tiện'), ENT_QUOTES, 'UTF-8'); ?>
                                    </h3>
                                    <p>Chỉnh riêng cấu hình phương tiện này.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" onsubmit="return confirm('Lưu thay đổi phương tiện này?');">
                                    <input type="hidden" name="action" value="save_vehicle_row">
                                    <input type="hidden" name="original_vehicle_key"
                                        value="<?php echo htmlspecialchars((string) ($vehicle['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã</label>
                                            <input class="admin-input" type="text" name="vehicle_row[key]"
                                                value="<?php echo htmlspecialchars((string) ($vehicle['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="vehicle_row[label]"
                                                value="<?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Tải trọng tối đa</label>
                                            <input class="admin-input" type="number" min="0" step="0.1"
                                                name="vehicle_row[trong_luong_toi_da]"
                                                value="<?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Giá cơ bản</label>
                                            <input class="admin-input" type="number" min="0" step="500"
                                                name="vehicle_row[gia_co_ban]"
                                                value="<?php echo htmlspecialchars((string) ($vehicle['gia_co_ban'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số xe</label>
                                            <input class="admin-input" type="number" min="0" step="0.05"
                                                name="vehicle_row[he_so_xe]"
                                                value="<?php echo htmlspecialchars((string) ($vehicle['he_so_xe'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Phí tối thiểu</label>
                                            <input class="admin-input" type="number" min="0" step="1000"
                                                name="vehicle_row[phi_toi_thieu]"
                                                value="<?php echo htmlspecialchars((string) ($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Mô tả</label>
                                            <textarea class="admin-input pricing-textarea" rows="2"
                                                name="vehicle_row[description]"><?php echo htmlspecialchars((string) ($vehicle['description'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                            Lưu phương tiện này</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>

                <?php foreach ($goodsFees as $goodsKey => $goodsFee): ?>
                    <div class="pricing-modal"
                        data-modal="modal-goods-<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>"
                        hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3><?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>
                                    </h3>
                                    <p>Chỉnh riêng loại phụ phí này.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" aria-label="Đóng" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" onsubmit="return confirm('Lưu thay đổi loại phụ phí này?');">
                                    <input type="hidden" name="action" value="save_goods_fee_row">
                                    <input type="hidden" name="original_goods_key"
                                        value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã loại hàng</label>
                                            <input class="admin-input" type="text" name="goods_row[key]"
                                                value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="goods_row[label]"
                                                value="<?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Phụ phí</label>
                                            <input class="admin-input" type="number" min="0" step="1000"
                                                name="goods_row[fee]"
                                                value="<?php echo htmlspecialchars((string) $goodsFee, ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số</label>
                                            <input class="admin-input" type="number" min="0" step="0.1"
                                                name="goods_row[he_so]"
                                                value="<?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Mô tả</label>
                                            <input class="admin-input" type="text" name="goods_row[description]"
                                                value="<?php echo htmlspecialchars((string) ($goodsDescriptions[$goodsKey] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i>
                                            Lưu loại này</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script src="https://api.dvqt.vn/js/krud.js"></script>
    <script>
        window.GHNAdminPricing = {
            pageUrl: "admin_pricing.php",
            exportUrl: "../api/pricing_export.php",
            username: <?php echo json_encode((string) ($_SESSION['username'] ?? $_SESSION['user_id'] ?? 'admin'), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            activeVersionId: <?php echo json_encode((int) $pricingActiveVersionId, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
            currentPricingData: <?php echo json_encode($pricingData, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>,
        };
    </script>
    <script src="assets/js/admin-pricing-krud.js?v=<?php echo time(); ?>"></script>
</body>

</html>
