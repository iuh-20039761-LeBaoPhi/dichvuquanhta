<?php
session_start();

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

function read_pricing_json($path)
{
    if (!is_file($path)) {
        return [null, 'Không tìm thấy file pricing-data.json'];
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        return [null, 'Không thể đọc file pricing-data.json'];
    }

    $parsed = json_decode($raw, true);
    if (!is_array($parsed)) {
        return [null, 'Nội dung pricing-data.json không hợp lệ'];
    }

    return [$parsed, ''];
}

function write_pricing_json($path, array $data)
{
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        return false;
    }

    $handle = @fopen($path, 'cb+');
    if (!$handle) {
        return false;
    }

    $ok = false;
    if (flock($handle, LOCK_EX)) {
        ftruncate($handle, 0);
        rewind($handle);
        $bytes = fwrite($handle, $encoded . PHP_EOL);
        fflush($handle);
        flock($handle, LOCK_UN);
        $ok = $bytes !== false;
    }

    fclose($handle);
    return $ok;
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

    foreach ($currentTime as $timeKey => $timeConfig) {
        $input = $submittedTime[$timeKey] ?? [];
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
        $currentTime[$timeKey] = $timeConfig;
    }

    foreach ($currentWeather as $weatherKey => $weatherConfig) {
        $input = $submittedWeather[$weatherKey] ?? [];
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
        $currentWeather[$weatherKey] = $weatherConfig;
    }

    $currentServiceFeeConfig['thoigian'] = $currentTime;
    $currentServiceFeeConfig['thoitiet'] = $currentWeather;
    $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
    $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

    return action_result(true, 'Đã cập nhật phụ phí dịch vụ.', $pricingData, 'Không thể lưu phụ phí dịch vụ.');
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
        case 'save_cod_insurance':
            return handle_save_cod_insurance_action($pricingData, $post['cod_insurance'] ?? []);
        case 'save_vehicles':
            return handle_save_vehicles_action($pricingData, $post['vehicles'] ?? []);
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

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$errorMsg) {
    $action = trim((string) ($_POST['action'] ?? ''));
    $result = dispatch_pricing_action(
        $action,
        $_POST,
        $pricingData,
        $serviceMeta,
        $scheduledServiceMeta,
        $instantServiceKey
    );

    if (!$result['ok']) {
        $errorMsg = $result['message'];
    } elseif (!write_pricing_json($pricingFile, $result['pricingData'])) {
        $errorMsg = $result['saveError'] !== '' ? $result['saveError'] : 'Không thể lưu cấu hình bảng giá.';
    } else {
        $pricingData = $result['pricingData'];
        $state = build_admin_pricing_state($pricingData);
        extract($state, EXTR_OVERWRITE);
        $successMsg = $result['message'];
    }
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
                <i class="fa-solid fa-circle-exclamation"></i> <?php echo htmlspecialchars($errorMsg, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <div class="pricing-shell">
            <div class="pricing-brief">
                <p class="pricing-note">
                    Chỉnh trực tiếp file <code>public/data/pricing-data.json</code>. Ba gói theo vùng dùng giá cố định, còn <strong>Giao ngay</strong> tính theo km xe máy và tham chiếu thêm cấu hình phương tiện ở dưới.
                </p>
            </div>
            <div class="pricing-layout">
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
            <section class="pricing-card" id="section-vung">
                <div class="pricing-card__head">
                    <div>
                        <h3>Bảng giá dịch vụ chính</h3>
                        <p class="pricing-section__desc">Ba gói này dùng giá cố định theo vùng. Khác với Giao ngay, phần này hiện không tính thêm theo cân nặng hoặc theo km.</p>
                    </div>
                </div>
                <div class="pricing-card__body">
                    <div class="pricing-explainer-grid">
                        <article class="pricing-explainer-card">
                            <h4>Giá nền theo vùng</h4>
                            <p><strong>Nội quận</strong>, <strong>Nội thành</strong> và <strong>Liên tỉnh</strong> là giá mở đầu của từng gói.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Phần không áp dụng</h4>
                            <p>Ba gói này hiện không cộng thêm theo cân nặng. Nếu cần tốc độ và công thức linh hoạt hơn thì dùng tab <strong>Giao ngay</strong>.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Phụ phí khác</h4>
                            <p>Khung giờ, thời tiết, COD, bảo hiểm, loại hàng và điều chỉnh xe nằm ở các tab bên cạnh, không nhập chung ở đây.</p>
                        </article>
                    </div>
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
                                        <td><strong><?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?></strong></td>
                                        <td><input class="admin-input" type="text" name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][ten]" value="<?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>"></td>
                                        <td><input class="admin-input" type="number" min="0" step="1000" name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][cungquan]" value="<?php echo htmlspecialchars((string) ($base['cungquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>"></td>
                                        <td><input class="admin-input" type="number" min="0" step="1000" name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][khacquan]" value="<?php echo htmlspecialchars((string) ($base['khacquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>"></td>
                                        <td><input class="admin-input" type="number" min="0" step="1000" name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][lientinh]" value="<?php echo htmlspecialchars((string) ($base['lientinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>"></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        </div>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu bảng giá dịch vụ</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card" id="section-instant">
                <div class="pricing-card__head">
                    <div>
                        <h3>Cấu hình Giao ngay</h3>
                        <p class="pricing-section__desc">Tab này chỉ chỉnh phần đơn giá xe máy theo km của Giao ngay. Công thức đầy đủ của Giao ngay được ghép từ nhiều tab khác nhau, nên nếu nhìn riêng tab này sẽ có cảm giác thiếu.</p>
                    </div>
                    <p class="pricing-section__hint">
                        Phí tối thiểu xe máy chỉnh trong phần <strong>Phương tiện</strong>.<br>
                        Công thức đang dùng: <strong>max(phí tối thiểu, km × đơn giá xe máy × hệ số xăng)</strong>.
                    </p>
                </div>
                <div class="pricing-card__body">
                    <div class="pricing-explainer-grid">
                        <article class="pricing-explainer-card">
                            <h4>Tab này chỉnh gì</h4>
                            <p>Chỉ chỉnh <strong>đơn giá xe máy gần</strong>, <strong>ngưỡng chuyển giá</strong> và <strong>đơn giá xe máy xa</strong>.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Tab khác ảnh hưởng gì</h4>
                            <p><strong>Phương tiện</strong> quyết định phí tối thiểu và hệ số xe. <strong>Phụ phí dịch vụ</strong> quyết định khung giờ và thời tiết.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Phần cộng thêm</h4>
                            <p><strong>COD / bảo hiểm</strong> và <strong>Phụ phí loại hàng</strong> vẫn cộng vào tổng cước sau khi tính phần vận chuyển chính.</p>
                        </article>
                    </div>
                    <?php $instantConfig = $serviceConfigs[$instantServiceKey] ?? []; ?>
                    <form method="post" onsubmit="return confirm('Lưu thay đổi cho cấu hình Giao ngay?');">
                        <input type="hidden" name="action" value="save_instant_service">
                        <div class="pricing-add-grid">
                            <div class="form-group">
                                <label for="instant-ten">Tên hiển thị</label>
                                <input id="instant-ten" class="admin-input" type="text" name="instant_service[ten]" value="<?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey]), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-near-price">Đơn giá xe máy đến ngưỡng xa</label>
                                <input id="instant-near-price" class="admin-input" type="number" min="0" step="500" name="instant_distance[gia_xe_may_gan]" value="<?php echo htmlspecialchars((string) $instantNearPrice, ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-threshold">Ngưỡng bắt đầu giá đường dài (km)</label>
                                <input id="instant-threshold" class="admin-input" type="number" min="0" step="0.1" name="instant_distance[nguong_xe_may_xa]" value="<?php echo htmlspecialchars((string) $instantFarThreshold, ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-far-price">Đơn giá xe máy sau ngưỡng xa</label>
                                <input id="instant-far-price" class="admin-input" type="number" min="0" step="500" name="instant_distance[gia_xe_may_xa]" value="<?php echo htmlspecialchars((string) $instantFarPrice, ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                        </div>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu cấu hình Giao ngay</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card" id="section-service-fee">
                <div class="pricing-card__head">
                    <div>
                        <h3>Phụ phí dịch vụ</h3>
                        <p class="pricing-section__desc">Một bộ phụ phí thời gian và điều kiện giao đang được dùng để tính thêm cho các gói theo cấu hình hiện hành.</p>
                    </div>
                </div>
                <div class="pricing-card__body">
                    <div class="pricing-explainer-grid">
                        <article class="pricing-explainer-card">
                            <h4>Phí cố định</h4>
                            <p>Khoản cộng thẳng vào đơn khi rơi vào khung giờ hoặc điều kiện đó.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Hệ số</h4>
                            <p>Nhân theo phần cước vận chuyển tạm tính. Ví dụ <strong>1.10</strong> nghĩa là cộng thêm khoảng <strong>10%</strong>.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Thứ tự áp dụng</h4>
                            <p>Hệ thống tính trên phần vận chuyển và phụ phí hàng hóa trước, rồi mới cộng COD, bảo hiểm và điều chỉnh phương tiện.</p>
                        </article>
                    </div>
                    <form method="post" onsubmit="return confirm('Lưu thay đổi phụ phí dịch vụ?');">
                        <input type="hidden" name="action" value="save_service_fees">
                        <div class="pricing-table-wrap">
                        <table class="pricing-table pricing-table--service-fees">
                            <thead>
                                <tr>
                                    <th>Khung giờ</th>
                                    <th>Bắt đầu</th>
                                    <th>Kết thúc</th>
                                    <th>Phí cố định</th>
                                    <th>Hệ số</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                                    <tr>
                                        <td>
                                            <input class="admin-input" type="text" name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][ten]" value="<?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="time" name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][batdau]" value="<?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="time" name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][ketthuc]" value="<?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="1000" name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][phicodinh]" value="<?php echo htmlspecialchars((string) ($timeConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="0.01" name="service_time[<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>][heso]" value="<?php echo htmlspecialchars((string) ($timeConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        </div>

                        <div class="pricing-divider"></div>

                        <div class="pricing-table-wrap">
                        <table class="pricing-table pricing-table--service-fees">
                            <thead>
                                <tr>
                                    <th>Điều kiện giao</th>
                                    <th>Phí cố định</th>
                                    <th>Hệ số</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                                    <tr>
                                        <td>
                                            <input class="admin-input" type="text" name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][ten]" value="<?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="1000" name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][phicodinh]" value="<?php echo htmlspecialchars((string) ($weatherConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="0.01" name="service_weather[<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>][heso]" value="<?php echo htmlspecialchars((string) ($weatherConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        </div>

                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu phụ phí dịch vụ</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card" id="section-cod">
                <div class="pricing-card__head">
                    <div>
                        <h3>COD / bảo hiểm</h3>
                        <p class="pricing-section__desc">Các mức này dùng chung cho thu hộ và bảo hiểm, giúp đồng bộ phần phụ phí giữa các gói cước.</p>
                    </div>
                </div>
                <div class="pricing-card__body">
                    <div class="pricing-explainer-grid">
                        <article class="pricing-explainer-card">
                            <h4>Tỷ lệ nhập dạng số thập phân</h4>
                            <p>Ví dụ <strong>0.012</strong> tương đương <strong>1.2%</strong>, còn <strong>0.005</strong> tương đương <strong>0.5%</strong>.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Ngưỡng miễn phí</h4>
                            <p>Nếu giá trị COD hoặc khai giá chưa vượt ngưỡng, hệ thống sẽ không tính phí.</p>
                        </article>
                    </div>
                    <form method="post" onsubmit="return confirm('Lưu thay đổi COD và bảo hiểm?');">
                        <input type="hidden" name="action" value="save_cod_insurance">
                        <div class="pricing-add-grid">
                            <div class="form-group">
                                <label for="cod-nguong">Ngưỡng COD miễn phí</label>
                                <input id="cod-nguong" class="admin-input" type="number" min="0" step="1000" name="cod_insurance[cod_nguong]" value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="cod-kieu">Tỷ lệ COD</label>
                                <input id="cod-kieu" class="admin-input" type="number" min="0" step="0.0001" name="cod_insurance[cod_kieu]" value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['kieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="cod-toithieu">COD tối thiểu</label>
                                <input id="cod-toithieu" class="admin-input" type="number" min="0" step="1000" name="cod_insurance[cod_toithieu]" value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['thuho']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="insurance-nguong">Ngưỡng bảo hiểm</label>
                                <input id="insurance-nguong" class="admin-input" type="number" min="0" step="1000" name="cod_insurance[insurance_nguong]" value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="insurance-kieu">Tỷ lệ bảo hiểm</label>
                                <input id="insurance-kieu" class="admin-input" type="number" min="0" step="0.0001" name="cod_insurance[insurance_kieu]" value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['kieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="insurance-toithieu">Bảo hiểm tối thiểu</label>
                                <input id="insurance-toithieu" class="admin-input" type="number" min="0" step="1000" name="cod_insurance[insurance_toithieu]" value="<?php echo htmlspecialchars((string) (($codInsuranceConfig['baohiem']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                        </div>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu COD / bảo hiểm</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card pricing-card--wide" id="section-vehicle">
                <div class="pricing-card__head">
                    <div>
                        <h3>Phương tiện</h3>
                        <p class="pricing-section__desc">Đây là nguồn cấu hình thật cho xe 4 bánh và phí tối thiểu của từng nhóm. Đơn giá thực tế mỗi km được tính bằng giá cơ bản × hệ số xe.</p>
                    </div>
                </div>
                <div class="pricing-card__body">
                    <div class="pricing-explainer-grid">
                        <article class="pricing-explainer-card">
                            <h4>Giá cơ bản</h4>
                            <p>Mức giá nền theo km của từng nhóm xe trước khi nhân hệ số.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Hệ số xe</h4>
                            <p>Dùng để tăng giá theo loại xe. <strong>Đơn giá thực tế/km = giá cơ bản × hệ số xe</strong>.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Phí tối thiểu</h4>
                            <p>Quan trọng với Giao ngay vì công thức luôn chốt theo <strong>max(phí tối thiểu, cước km)</strong>.</p>
                        </article>
                    </div>
                    <form method="post" onsubmit="return confirm('Lưu thay đổi cấu hình phương tiện?');">
                        <input type="hidden" name="action" value="save_vehicles">
                        <?php if (!$vehicleConfigs): ?>
                            <p class="pricing-section__hint" style="margin-bottom:16px;">
                                File <code>pricing-data.json</code> hiện chưa có cấu hình phương tiện. Hãy thêm dữ liệu xe trực tiếp vào JSON trước, hoặc lưu lại từ một nguồn đã có dữ liệu hợp lệ.
                            </p>
                        <?php endif; ?>
                        <p class="pricing-scroll-hint">
                            Kéo ngang bảng để xem đủ tất cả cột. Riêng cột <strong>Mô tả</strong> đã được nới rộng để đọc nội dung dài dễ hơn.
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
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                                    <?php $donGiaKm = round((float) ($vehicle['gia_co_ban'] ?? 0) * (float) ($vehicle['he_so_xe'] ?? 1)); ?>
                                    <tr>
                                        <td>
                                            <input class="admin-input" type="text" name="vehicles[<?php echo $vehicleIndex; ?>][key]" value="<?php echo htmlspecialchars((string) ($vehicle['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="text" name="vehicles[<?php echo $vehicleIndex; ?>][label]" value="<?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="0.1" name="vehicles[<?php echo $vehicleIndex; ?>][trong_luong_toi_da]" value="<?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="500" name="vehicles[<?php echo $vehicleIndex; ?>][gia_co_ban]" value="<?php echo htmlspecialchars((string) ($vehicle['gia_co_ban'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="0.05" name="vehicles[<?php echo $vehicleIndex; ?>][he_so_xe]" value="<?php echo htmlspecialchars((string) ($vehicle['he_so_xe'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <strong><?php echo htmlspecialchars(format_money_preview($donGiaKm), ENT_QUOTES, 'UTF-8'); ?></strong>
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="1000" name="vehicles[<?php echo $vehicleIndex; ?>][phi_toi_thieu]" value="<?php echo htmlspecialchars((string) ($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <textarea class="admin-input pricing-textarea" rows="2" name="vehicles[<?php echo $vehicleIndex; ?>][description]"><?php echo htmlspecialchars((string) ($vehicle['description'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        </div>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu phương tiện</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card" id="section-goods">
                <div class="pricing-card__head">
                    <div>
                        <h3>Phụ phí loại hàng</h3>
                        <p class="pricing-section__desc">Danh sách này áp trực tiếp vào phần phụ phí loại hàng trong breakdown. Có thể thêm loại mới mà không phải sửa lại calculator.</p>
                    </div>
                </div>
                <div class="pricing-card__body">
                    <div class="pricing-explainer-grid">
                        <article class="pricing-explainer-card">
                            <h4>Phụ phí</h4>
                            <p>Khoản cộng cố định theo từng loại hàng, thường tính theo số kiện.</p>
                        </article>
                        <article class="pricing-explainer-card">
                            <h4>Hệ số</h4>
                            <p>Nếu lớn hơn <strong>1</strong>, hệ thống cộng thêm phần trăm trên cước vận chuyển chính của đơn.</p>
                        </article>
                    </div>
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
                                        <td>
                                            <input class="admin-input" type="text" name="goods[<?php echo $goodsRowIndex; ?>][key]" value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="text" name="goods[<?php echo $goodsRowIndex; ?>][label]" value="<?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="1000" name="goods[<?php echo $goodsRowIndex; ?>][fee]" value="<?php echo htmlspecialchars((string) $goodsFee, ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="0.1" name="goods[<?php echo $goodsRowIndex; ?>][he_so]" value="<?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="text" name="goods[<?php echo $goodsRowIndex; ?>][description]" value="<?php echo htmlspecialchars((string) ($goodsDescriptions[$goodsKey] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <button class="pricing-inline-delete" type="submit" onclick="if (!confirm('Xóa loại phụ phí này?')) { return false; } this.form.action.value='delete_goods_fee'; this.form.delete_key.value='<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>';">
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
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu phụ phí loại hàng</button>
                        </div>
                    </form>

                    <div class="pricing-divider"></div>

                    <form method="post" onsubmit="return confirm('Thêm loại phụ phí mới?');">
                        <input type="hidden" name="action" value="add_goods_fee">
                        <div class="pricing-add-grid">
                            <div class="form-group">
                                <label for="new-key">Mã loại hàng</label>
                                <input id="new-key" type="text" name="new_key" class="admin-input" placeholder="vi_du: de-vo" required>
                            </div>
                            <div class="form-group">
                                <label for="new-label">Tên hiển thị</label>
                                <input id="new-label" type="text" name="new_label" class="admin-input" placeholder="Ví dụ: Dễ vỡ" required>
                            </div>
                            <div class="form-group">
                                <label for="new-fee">Phụ phí</label>
                                <input id="new-fee" type="number" min="0" step="1000" name="new_fee" class="admin-input" value="0">
                            </div>
                            <div class="form-group">
                                <label for="new-he-so">Hệ số</label>
                                <input id="new-he-so" type="number" min="0" step="0.1" name="new_he_so" class="admin-input" value="1">
                            </div>
                            <div class="form-group" style="grid-column: 1 / -1;">
                                <label for="new-description">Mô tả</label>
                                <input id="new-description" type="text" name="new_description" class="admin-input" placeholder="Mô tả thêm cho loại hàng mới">
                            </div>
                        </div>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-secondary"><i class="fa-solid fa-plus"></i> Thêm loại phụ phí mới</button>
                        </div>
                    </form>
                </div>
            </section>

        </div>
                </div>
            </div>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
    <script>
        (function () {
            const tabs = Array.from(document.querySelectorAll("[data-pricing-tab]"));
            const sections = Array.from(document.querySelectorAll(".pricing-card[id]"));
            if (!tabs.length || !sections.length) return;

            function activateSection(id, syncHash = true) {
                const targetId = sections.some((section) => section.id === id) ? id : sections[0].id;

                sections.forEach((section) => {
                    const active = section.id === targetId;
                    section.hidden = !active;
                    section.classList.toggle("is-active", active);
                });

                tabs.forEach((tab) => {
                    const active = tab.dataset.pricingTab === targetId;
                    tab.classList.toggle("is-active", active);
                    tab.setAttribute("aria-current", active ? "page" : "false");
                });

                if (syncHash) {
                    window.history.replaceState({}, "", `#${targetId}`);
                }
            }

            tabs.forEach((tab) => {
                tab.addEventListener("click", (event) => {
                    event.preventDefault();
                    activateSection(tab.dataset.pricingTab || "");
                });
            });

            const initialId = (window.location.hash || "").replace(/^#/, "");
            activateSection(initialId || tabs[0].dataset.pricingTab || "", false);
        })();
    </script>
</body>
</html>
