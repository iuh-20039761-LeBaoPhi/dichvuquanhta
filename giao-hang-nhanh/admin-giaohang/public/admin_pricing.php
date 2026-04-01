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

    return file_put_contents($path, $encoded . PHP_EOL) !== false;
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

[$pricingData, $readError] = read_pricing_json($pricingFile);

if (!$pricingData) {
    $errorMsg = $readError;
    $pricingData = [];
}

$domestic = $pricingData['BAOGIACHITIET']['noidia'] ?? [];
$serviceConfigs = $domestic['dichvu'] ?? [];
$goodsFees = $domestic['philoaihang'] ?? [];
$goodsLabels = $domestic['tenloaihang'] ?? [];
$goodsDescriptions = $domestic['motaloaihang'] ?? [];
$goodsMultipliers = $domestic['hesoloaihang'] ?? [];
$distanceConfig = $domestic['cauhinh_khoangcach'] ?? [];
$serviceFeeConfig = (($domestic['phidichvu'] ?? [])['giaongaylaptuc'] ?? []);
$codInsuranceConfig = $pricingData['BANGGIA']['phuthu'] ?? [];
$vehicleConfigs = $pricingData['phuong_tien'] ?? [];

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$errorMsg) {
    $action = trim((string) ($_POST['action'] ?? ''));

    if ($action === 'save_services') {
        $submittedServices = $_POST['services'] ?? [];

        foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel) {
            $current = $serviceConfigs[$serviceKey] ?? [];
            $input = $submittedServices[$serviceKey] ?? [];

            $base = $current['coban'] ?? [];
            $base['cungquan'] = to_int_price($input['cungquan'] ?? ($base['cungquan'] ?? 0));
            $base['khacquan'] = to_int_price($input['khacquan'] ?? ($base['khacquan'] ?? 0));
            $base['lientinh'] = to_int_price($input['lientinh'] ?? ($base['lientinh'] ?? 0));

            $current['ten'] = trim((string) ($input['ten'] ?? ($current['ten'] ?? $serviceLabel)));
            $current['coban'] = $base;
            $current['buoctiep'] = to_int_price($input['buoctiep'] ?? ($current['buoctiep'] ?? 0));
            $current['heso_dichvu'] = (float) ($input['heso_dichvu'] ?? ($current['heso_dichvu'] ?? 1));

            $serviceConfigs[$serviceKey] = $current;
        }

        $domestic['dichvu'] = $serviceConfigs;
        $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

        if (write_pricing_json($pricingFile, $pricingData)) {
            $serviceConfigs = $domestic['dichvu'];
            $successMsg = 'Đã cập nhật bảng giá dịch vụ.';
        } else {
            $errorMsg = 'Không thể lưu bảng giá dịch vụ.';
        }
    } elseif ($action === 'save_instant_service') {
        $current = $serviceConfigs[$instantServiceKey] ?? [];
        $input = $_POST['instant_service'] ?? [];
        $distanceInput = $_POST['instant_distance'] ?? [];
        $currentDistance = $distanceConfig;

        $current['ten'] = trim((string) ($input['ten'] ?? ($current['ten'] ?? $serviceMeta[$instantServiceKey])));
        $current['buoctiep'] = to_int_price($input['buoctiep'] ?? ($current['buoctiep'] ?? 0));
        $current['heso_dichvu'] = (float) ($input['heso_dichvu'] ?? ($current['heso_dichvu'] ?? 1));

        $currentDistance['km_coban'] = to_float_number($distanceInput['km_coban'] ?? ($currentDistance['km_coban'] ?? 3), 2);
        $currentDistance['gia_coban'] = to_int_price($distanceInput['gia_coban'] ?? ($currentDistance['gia_coban'] ?? 0));
        $currentDistance['gia_tiep_theo_km'] = to_int_price($distanceInput['gia_tiep_theo_km'] ?? ($currentDistance['gia_tiep_theo_km'] ?? 0));
        $currentDistance['nguong_xa'] = to_float_number($distanceInput['nguong_xa'] ?? ($currentDistance['nguong_xa'] ?? 50), 2);
        $currentDistance['gia_xa'] = to_int_price($distanceInput['gia_xa'] ?? ($currentDistance['gia_xa'] ?? 0));

        $serviceConfigs[$instantServiceKey] = $current;
        $domestic['dichvu'] = $serviceConfigs;
        $domestic['cauhinh_khoangcach'] = $currentDistance;
        $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

        if (write_pricing_json($pricingFile, $pricingData)) {
            $serviceConfigs = $domestic['dichvu'];
            $distanceConfig = $domestic['cauhinh_khoangcach'];
            $successMsg = 'Đã cập nhật cấu hình Giao ngay.';
        } else {
            $errorMsg = 'Không thể lưu cấu hình Giao ngay.';
        }
    } elseif ($action === 'save_goods_fees') {
        $submittedGoods = $_POST['goods'] ?? [];
        $nextFees = [];
        $nextLabels = [];
        $nextDescriptions = [];
        $nextMultipliers = [];

        foreach ($submittedGoods as $row) {
            $key = sanitize_price_key($row['key'] ?? '');
            if ($key === '') {
                continue;
            }

            $nextFees[$key] = to_int_price($row['fee'] ?? 0);
            $nextLabels[$key] = trim((string) ($row['label'] ?? $key));
            $nextDescriptions[$key] = trim((string) ($row['description'] ?? ''));
            $nextMultipliers[$key] = (float) ($row['multiplier'] ?? 1);
        }

        $domestic['philoaihang'] = $nextFees;
        $domestic['tenloaihang'] = $nextLabels;
        $domestic['motaloaihang'] = $nextDescriptions;
        $domestic['hesoloaihang'] = $nextMultipliers;
        $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

        if (write_pricing_json($pricingFile, $pricingData)) {
            $goodsFees = $nextFees;
            $goodsLabels = $nextLabels;
            $goodsDescriptions = $nextDescriptions;
            $goodsMultipliers = $nextMultipliers;
            $successMsg = 'Đã cập nhật danh sách phụ phí loại hàng.';
        } else {
            $errorMsg = 'Không thể lưu danh sách phụ phí loại hàng.';
        }
    } elseif ($action === 'add_goods_fee') {
        $newKey = sanitize_price_key($_POST['new_key'] ?? '');
        $newLabel = trim((string) ($_POST['new_label'] ?? ''));

        if ($newKey === '' || $newLabel === '') {
            $errorMsg = 'Cần nhập mã loại hàng và tên hiển thị.';
        } elseif (isset($goodsFees[$newKey])) {
            $errorMsg = 'Mã loại hàng này đã tồn tại.';
        } else {
            $goodsFees[$newKey] = to_int_price($_POST['new_fee'] ?? 0);
            $goodsLabels[$newKey] = $newLabel;
            $goodsDescriptions[$newKey] = trim((string) ($_POST['new_description'] ?? ''));
            $goodsMultipliers[$newKey] = (float) ($_POST['new_multiplier'] ?? 1);

            $domestic['philoaihang'] = $goodsFees;
            $domestic['tenloaihang'] = $goodsLabels;
            $domestic['motaloaihang'] = $goodsDescriptions;
            $domestic['hesoloaihang'] = $goodsMultipliers;
            $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

            if (write_pricing_json($pricingFile, $pricingData)) {
                $successMsg = 'Đã thêm loại phụ phí mới.';
            } else {
                $errorMsg = 'Không thể thêm loại phụ phí mới.';
            }
        }
    } elseif ($action === 'delete_goods_fee') {
        $deleteKey = sanitize_price_key($_POST['delete_key'] ?? '');

        if ($deleteKey === '' || !isset($goodsFees[$deleteKey])) {
            $errorMsg = 'Không tìm thấy loại phụ phí cần xóa.';
        } else {
            unset($goodsFees[$deleteKey], $goodsLabels[$deleteKey], $goodsDescriptions[$deleteKey], $goodsMultipliers[$deleteKey]);
            $domestic['philoaihang'] = $goodsFees;
            $domestic['tenloaihang'] = $goodsLabels;
            $domestic['motaloaihang'] = $goodsDescriptions;
            $domestic['hesoloaihang'] = $goodsMultipliers;
            $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

            if (write_pricing_json($pricingFile, $pricingData)) {
                $successMsg = 'Đã xóa loại phụ phí.';
            } else {
                $errorMsg = 'Không thể xóa loại phụ phí.';
            }
        }
    } elseif ($action === 'save_service_fees') {
        $currentServiceFeeConfig = $serviceFeeConfig;
        $currentTime = $currentServiceFeeConfig['thoigian'] ?? [];
        $currentWeather = $currentServiceFeeConfig['thoitiet'] ?? [];
        $submittedTime = $_POST['service_time'] ?? [];
        $submittedWeather = $_POST['service_weather'] ?? [];

        foreach ($currentTime as $timeKey => $timeConfig) {
            $input = $submittedTime[$timeKey] ?? [];
            $timeConfig['ten'] = trim((string) ($input['ten'] ?? ($timeConfig['ten'] ?? $timeKey)));
            $timeConfig['batdau'] = trim((string) ($input['batdau'] ?? ($timeConfig['batdau'] ?? '00:00')));
            $timeConfig['ketthuc'] = trim((string) ($input['ketthuc'] ?? ($timeConfig['ketthuc'] ?? '23:59')));
            $timeConfig['phicodinh'] = to_int_price($input['phicodinh'] ?? ($timeConfig['phicodinh'] ?? 0));
            $timeConfig['heso'] = to_float_number($input['heso'] ?? ($timeConfig['heso'] ?? 1), 3);
            $currentTime[$timeKey] = $timeConfig;
        }

        foreach ($currentWeather as $weatherKey => $weatherConfig) {
            $input = $submittedWeather[$weatherKey] ?? [];
            $weatherConfig['ten'] = trim((string) ($input['ten'] ?? ($weatherConfig['ten'] ?? $weatherKey)));
            $weatherConfig['phicodinh'] = to_int_price($input['phicodinh'] ?? ($weatherConfig['phicodinh'] ?? 0));
            $weatherConfig['heso'] = to_float_number($input['heso'] ?? ($weatherConfig['heso'] ?? 1), 3);
            $currentWeather[$weatherKey] = $weatherConfig;
        }

        $currentServiceFeeConfig['thoigian'] = $currentTime;
        $currentServiceFeeConfig['thoitiet'] = $currentWeather;
        $domestic['phidichvu']['giaongaylaptuc'] = $currentServiceFeeConfig;
        $pricingData['BAOGIACHITIET']['noidia'] = $domestic;

        if (write_pricing_json($pricingFile, $pricingData)) {
            $serviceFeeConfig = $currentServiceFeeConfig;
            $successMsg = 'Đã cập nhật phụ phí dịch vụ.';
        } else {
            $errorMsg = 'Không thể lưu phụ phí dịch vụ.';
        }
    } elseif ($action === 'save_cod_insurance') {
        $submitted = $_POST['cod_insurance'] ?? [];
        $currentFeeConfig = $codInsuranceConfig;

        $currentFeeConfig['thuho']['nguong'] = to_int_price($submitted['cod_nguong'] ?? (($currentFeeConfig['thuho']['nguong'] ?? 0)));
        $currentFeeConfig['thuho']['kieu'] = to_float_number($submitted['cod_kieu'] ?? (($currentFeeConfig['thuho']['kieu'] ?? 0)), 4);
        $currentFeeConfig['thuho']['toithieu'] = to_int_price($submitted['cod_toithieu'] ?? (($currentFeeConfig['thuho']['toithieu'] ?? 0)));

        $currentFeeConfig['baohiem']['nguong'] = to_int_price($submitted['insurance_nguong'] ?? (($currentFeeConfig['baohiem']['nguong'] ?? 0)));
        $currentFeeConfig['baohiem']['kieu'] = to_float_number($submitted['insurance_kieu'] ?? (($currentFeeConfig['baohiem']['kieu'] ?? 0)), 4);
        $currentFeeConfig['baohiem']['toithieu'] = to_int_price($submitted['insurance_toithieu'] ?? (($currentFeeConfig['baohiem']['toithieu'] ?? 0)));

        $pricingData['BANGGIA']['phuthu'] = $currentFeeConfig;

        if (write_pricing_json($pricingFile, $pricingData)) {
            $codInsuranceConfig = $currentFeeConfig;
            $successMsg = 'Đã cập nhật COD và bảo hiểm.';
        } else {
            $errorMsg = 'Không thể lưu COD và bảo hiểm.';
        }
    } elseif ($action === 'save_vehicles') {
        $submittedVehicles = $_POST['vehicles'] ?? [];
        $nextVehicles = [];

        foreach ($submittedVehicles as $vehicle) {
            $key = trim((string) ($vehicle['key'] ?? ''));
            if ($key === '') {
                continue;
            }

            $nextVehicles[] = [
                'key' => $key,
                'label' => trim((string) ($vehicle['label'] ?? $key)),
                'multiplier' => to_float_number($vehicle['multiplier'] ?? 1, 2),
                'description' => trim((string) ($vehicle['description'] ?? '')),
            ];
        }

        $pricingData['phuong_tien'] = $nextVehicles;

        if (write_pricing_json($pricingFile, $pricingData)) {
            $vehicleConfigs = $nextVehicles;
            $successMsg = 'Đã cập nhật cấu hình phương tiện.';
        } else {
            $errorMsg = 'Không thể lưu cấu hình phương tiện.';
        }
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
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        .pricing-grid {
            display: grid;
            gap: 16px;
            margin-top: 16px;
        }

        .pricing-note,
        .pricing-card {
            background: transparent;
        }

        .pricing-note {
            margin-top: 12px;
            padding: 0;
            color: #475569;
            line-height: 1.6;
        }

        .pricing-card__head {
            padding: 0 0 10px;
        }

        .pricing-card__head h3 {
            margin: 0;
            color: #0a2a66;
            font-size: 17px;
        }

        .pricing-card__body {
            padding: 0 0 18px;
        }

        .pricing-card {
            border-bottom: 1px solid #dbe4f0;
            padding-bottom: 18px;
        }

        .pricing-table {
            width: 100%;
            border-collapse: collapse;
        }

        .pricing-table th,
        .pricing-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #edf2f7;
            vertical-align: top;
        }

        .pricing-table th {
            text-align: left;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #64748b;
        }

        .pricing-table tr:last-child td {
            border-bottom: none;
        }

        .pricing-actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: flex-end;
            gap: 12px;
            margin-top: 14px;
        }

        .pricing-add-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
        }

        .pricing-inline-delete {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            min-width: 42px;
            height: 42px;
            border: 1px solid #fecaca;
            border-radius: 10px;
            background: #fff;
            color: #b91c1c;
            cursor: pointer;
        }

        .pricing-list {
            margin: 8px 0 0;
            padding-left: 18px;
            color: #475569;
            line-height: 1.7;
        }

        .pricing-divider {
            height: 1px;
            background: #edf2f7;
            margin: 20px 0;
        }

        @media (max-width: 900px) {
            .pricing-add-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <?php include __DIR__ . '/../includes/header_admin.php'; ?>

    <main class="admin-container">
        <div class="page-header">
            <h2 class="page-title">Quản lý bảng giá</h2>
            <a href="admin_stats.php" class="back-link"><i class="fa-solid fa-arrow-left"></i> Dashboard</a>
        </div>

        <div class="pricing-note">
            Trang này đang cập nhật trực tiếp file <code>public/data/pricing-data.json</code>. Ba gói định tuyến dùng bảng giá theo vùng, còn <strong>Giao ngay</strong> được chỉnh riêng theo km.
        </div>

        <?php if ($successMsg !== ''): ?>
            <div class="status-badge status-active" style="width: 100%; margin-top: 20px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-circle-check"></i> <?php echo htmlspecialchars($successMsg, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <?php if ($errorMsg !== ''): ?>
            <div class="status-badge status-cancelled" style="width: 100%; margin-top: 20px; padding: 15px; border-radius: 12px;">
                <i class="fa-solid fa-circle-exclamation"></i> <?php echo htmlspecialchars($errorMsg, ENT_QUOTES, 'UTF-8'); ?>
            </div>
        <?php endif; ?>

        <div class="pricing-grid">
            <section class="pricing-card">
                <div class="pricing-card__head">
                    <h3>Bảng giá dịch vụ chính</h3>
                </div>
                <div class="pricing-card__body">
                    <form method="post" onsubmit="return confirm('Lưu thay đổi cho 3 gói dịch vụ chính?');">
                        <input type="hidden" name="action" value="save_services">
                        <table class="pricing-table">
                            <thead>
                                <tr>
                                    <th>Dịch vụ</th>
                                    <th>Tên hiển thị</th>
                                    <th>Nội quận</th>
                                    <th>Nội thành</th>
                                    <th>Liên tỉnh</th>
                                    <th>Bước tiếp</th>
                                    <th>Hệ số</th>
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
                                        <td><input class="admin-input" type="number" min="0" step="500" name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][buoctiep]" value="<?php echo htmlspecialchars((string) ($config['buoctiep'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>"></td>
                                        <td><input class="admin-input" type="number" min="0" step="0.05" name="services[<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>][heso_dichvu]" value="<?php echo htmlspecialchars((string) ($config['heso_dichvu'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>"></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu bảng giá dịch vụ</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card">
                <div class="pricing-card__head">
                    <h3>Cấu hình Giao ngay</h3>
                </div>
                <div class="pricing-card__body">
                    <?php $instantConfig = $serviceConfigs[$instantServiceKey] ?? []; ?>
                    <form method="post" onsubmit="return confirm('Lưu thay đổi cho cấu hình Giao ngay?');">
                        <input type="hidden" name="action" value="save_instant_service">
                        <div class="pricing-add-grid">
                            <div class="form-group">
                                <label for="instant-ten">Tên hiển thị</label>
                                <input id="instant-ten" class="admin-input" type="text" name="instant_service[ten]" value="<?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey]), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-buoctiep">Phí bước tiếp 0.5kg</label>
                                <input id="instant-buoctiep" class="admin-input" type="number" min="0" step="500" name="instant_service[buoctiep]" value="<?php echo htmlspecialchars((string) ($instantConfig['buoctiep'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-heso">Hệ số dịch vụ</label>
                                <input id="instant-heso" class="admin-input" type="number" min="0" step="0.05" name="instant_service[heso_dichvu]" value="<?php echo htmlspecialchars((string) ($instantConfig['heso_dichvu'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-km-coban">Km cơ bản</label>
                                <input id="instant-km-coban" class="admin-input" type="number" min="0" step="0.1" name="instant_distance[km_coban]" value="<?php echo htmlspecialchars((string) ($distanceConfig['km_coban'] ?? 3), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-gia-coban">Giá cơ bản</label>
                                <input id="instant-gia-coban" class="admin-input" type="number" min="0" step="1000" name="instant_distance[gia_coban]" value="<?php echo htmlspecialchars((string) ($distanceConfig['gia_coban'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-gia-tiep">Giá tiếp theo / km</label>
                                <input id="instant-gia-tiep" class="admin-input" type="number" min="0" step="500" name="instant_distance[gia_tiep_theo_km]" value="<?php echo htmlspecialchars((string) ($distanceConfig['gia_tiep_theo_km'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-nguong-xa">Ngưỡng xa</label>
                                <input id="instant-nguong-xa" class="admin-input" type="number" min="0" step="0.1" name="instant_distance[nguong_xa]" value="<?php echo htmlspecialchars((string) ($distanceConfig['nguong_xa'] ?? 50), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                            <div class="form-group">
                                <label for="instant-gia-xa">Giá km xa</label>
                                <input id="instant-gia-xa" class="admin-input" type="number" min="0" step="500" name="instant_distance[gia_xa]" value="<?php echo htmlspecialchars((string) ($distanceConfig['gia_xa'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                            </div>
                        </div>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu cấu hình Giao ngay</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card">
                <div class="pricing-card__head">
                    <h3>Phụ phí dịch vụ</h3>
                </div>
                <div class="pricing-card__body">
                    <form method="post" onsubmit="return confirm('Lưu thay đổi phụ phí dịch vụ?');">
                        <input type="hidden" name="action" value="save_service_fees">
                        <table class="pricing-table">
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

                        <div class="pricing-divider"></div>

                        <table class="pricing-table">
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

                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu phụ phí dịch vụ</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card">
                <div class="pricing-card__head">
                    <h3>COD / bảo hiểm</h3>
                </div>
                <div class="pricing-card__body">
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

            <section class="pricing-card">
                <div class="pricing-card__head">
                    <h3>Phương tiện</h3>
                </div>
                <div class="pricing-card__body">
                    <form method="post" onsubmit="return confirm('Lưu thay đổi cấu hình phương tiện?');">
                        <input type="hidden" name="action" value="save_vehicles">
                        <table class="pricing-table">
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Tên hiển thị</th>
                                    <th>Hệ số</th>
                                    <th>Mô tả</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                                    <tr>
                                        <td>
                                            <input class="admin-input" type="text" name="vehicles[<?php echo $vehicleIndex; ?>][key]" value="<?php echo htmlspecialchars((string) ($vehicle['key'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="text" name="vehicles[<?php echo $vehicleIndex; ?>][label]" value="<?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="number" min="0" step="0.1" name="vehicles[<?php echo $vehicleIndex; ?>][multiplier]" value="<?php echo htmlspecialchars((string) ($vehicle['multiplier'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                        <td>
                                            <input class="admin-input" type="text" name="vehicles[<?php echo $vehicleIndex; ?>][description]" value="<?php echo htmlspecialchars((string) ($vehicle['description'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                        <div class="pricing-actions">
                            <button type="submit" class="btn-primary"><i class="fa-solid fa-floppy-disk"></i> Lưu phương tiện</button>
                        </div>
                    </form>
                </div>
            </section>

            <section class="pricing-card">
                <div class="pricing-card__head">
                    <h3>Phụ phí loại hàng</h3>
                </div>
                <div class="pricing-card__body">
                    <form method="post" onsubmit="return confirm('Lưu thay đổi phụ phí loại hàng?');">
                        <input type="hidden" name="action" value="save_goods_fees">
                        <table class="pricing-table">
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
                                            <input class="admin-input" type="number" min="0" step="0.1" name="goods[<?php echo $goodsRowIndex; ?>][multiplier]" value="<?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
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
                                <label for="new-multiplier">Hệ số</label>
                                <input id="new-multiplier" type="number" min="0" step="0.1" name="new_multiplier" class="admin-input" value="1">
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

            <section class="pricing-card">
                <div class="pricing-card__head">
                    <h3>Phụ phí đang có trong công thức</h3>
                </div>
                <div class="pricing-card__body">
                    <p style="margin:0; color:#475569; line-height:1.6;">
                        Màn này hiện đã mở chỉnh các nhóm chính theo đúng thứ tự tính giá. Phần chưa đưa vào form riêng chủ yếu là các nội dung minh họa và ghi chú hiển thị trên trang bảng giá.
                    </p>
                    <ul class="pricing-list">
                        <li>Các nội dung minh họa / công thức hiển thị trên trang bảng giá</li>
                        <li>Ví dụ tham khảo cho từng kịch bản báo giá</li>
                        <li>Ghi chú hướng dẫn đọc bảng giá cho khách hàng</li>
                    </ul>
                </div>
            </section>
        </div>
    </main>

    <?php include __DIR__ . '/../includes/footer.php'; ?>
</body>
</html>
