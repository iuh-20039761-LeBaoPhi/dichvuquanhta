<?php
declare(strict_types=1);

const GHN_PRICING_META_ACTIVE_VERSION_KEY = 'active_pricing_version_id';
const GHN_PRICING_REGION_BASE_KEY = [
    'cung_quan' => 'cungquan',
    'noi_thanh' => 'khacquan',
    'lien_tinh' => 'lientinh',
];

function pricing_service_load_config(string $fallbackPath): array
{
    $activeVersionId = pricing_service_get_active_version_id();
    if ($activeVersionId > 0) {
        $built = pricing_service_build_config_from_version($activeVersionId);
        if (!empty($built['success'])) {
            return [
                'data' => pricing_service_normalize_display_labels($built['data']),
                'error' => '',
                'source' => 'krud',
                'version_id' => $activeVersionId,
            ];
        }

        return [
            'data' => null,
            'error' => 'KRUD active #' . $activeVersionId . ' đang lỗi đọc dữ liệu: ' . (string) ($built['message'] ?? 'Không rõ lỗi.') . ' JSON cache public chỉ là export nên không dùng để chỉnh bảng giá.',
            'source' => 'krud_error',
            'version_id' => $activeVersionId,
        ];
    }

    if (!is_file($fallbackPath)) {
        return [
            'data' => null,
            'error' => 'Chưa có KRUD active và không tìm thấy file JSON cache pricing-data.json để bootstrap.',
            'source' => 'none',
            'version_id' => 0,
        ];
    }

    $raw = file_get_contents($fallbackPath);
    if ($raw === false) {
        return [
            'data' => null,
            'error' => 'Chưa có KRUD active và không thể đọc file JSON cache pricing-data.json để bootstrap.',
            'source' => 'none',
            'version_id' => 0,
        ];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [
            'data' => null,
            'error' => 'Chưa có KRUD active và nội dung JSON cache pricing-data.json không hợp lệ.',
            'source' => 'none',
            'version_id' => 0,
        ];
    }

    return [
        'data' => $decoded,
        'error' => '',
        'source' => 'json_cache_bootstrap',
        'version_id' => 0,
    ];
}

function pricing_service_export_config_from_version(int $versionId): array
{
    if ($versionId <= 0) {
        return [
            'success' => false,
            'message' => 'Thiếu versionId KRUD để export JSON cache.',
            'data' => [],
        ];
    }

    $built = pricing_service_build_config_from_version($versionId);
    if (empty($built['success'])) {
        return $built;
    }

    return [
        'success' => true,
        'message' => '',
        'data' => pricing_service_strip_krud_meta(
            pricing_service_normalize_display_labels((array) $built['data'])
        ),
    ];
}

function pricing_service_strip_krud_meta(array $pricingData): array
{
    unset($pricingData['_krud_meta']);
    return $pricingData;
}

function pricing_service_service_labels_by_type(array $pricingData): array
{
    $services = $pricingData['BAOGIACHITIET']['noidia']['dichvu'] ?? [];
    $map = [
        'standard' => 'tieuchuan',
        'fast' => 'nhanh',
        'express' => 'hoatoc',
        'instant' => 'laptuc',
    ];
    $labels = [];
    foreach ($map as $serviceType => $jsonKey) {
        $labels[$serviceType] = trim((string) ($services[$jsonKey]['ten'] ?? $jsonKey));
    }
    return $labels;
}

function pricing_service_replace_service_name_for_type(string $text, string $serviceType, array $labels): string
{
    $label = trim((string) ($labels[$serviceType] ?? ''));
    if ($text === '' || $label === '') {
        return $text;
    }

    $patterns = [
        'standard' => ['/Gói\s+Tiêu\s+chuẩn/iu', '/Tiêu\s+Chuẩn/iu', '/Tiêu\s+chuẩn/iu'],
        'fast' => ['/Gói\s+Nhanh/iu', '/Giao\s+Nhanh/iu', '/Giao\s+nhanh/iu'],
        'express' => ['/Gói\s+Hỏa\s+tốc/iu', '/Hỏa\s*Tốc/iu', '/Hỏa\s*tốc/iu'],
        'instant' => [
            '/Giao\s+hàng\s+ngay\s+lập\s+tức/iu',
            '/Giao\s+Ngay\s+Lập\s+Tức/iu',
            '/Giao\s+ngay\s+lập\s+tức/iu',
            '/Giao\s+Ngay/iu',
            '/Giao\s+ngay/iu',
            '/Ngay\s+lập\s+tức/iu',
        ],
    ];

    foreach ($patterns[$serviceType] ?? [] as $pattern) {
        $next = preg_replace($pattern, $label, $text);
        if (is_string($next) && $next !== $text) {
            return $next;
        }
    }

    return $text;
}

function pricing_service_replace_known_service_names(string $text, array $labels): string
{
    foreach (['instant', 'express', 'fast', 'standard'] as $serviceType) {
        $text = pricing_service_replace_service_name_for_type($text, $serviceType, $labels);
    }
    return $text;
}

function pricing_service_build_synced_example_title(string $title, string $serviceType, array $labels): string
{
    $label = trim((string) ($labels[$serviceType] ?? $serviceType ?: 'Dịch vụ'));
    if ($title === '') {
        return 'Ví dụ: ' . $label;
    }
    if (preg_match('/^(Ví dụ(?:\s+\d+)?\s*:)\s*/iu', $title, $matches)) {
        return $matches[1] . ' ' . $label;
    }
    return pricing_service_replace_service_name_for_type($title, $serviceType, $labels);
}

function pricing_service_normalize_display_labels(array $pricingData): array
{
    $labels = pricing_service_service_labels_by_type($pricingData);

    if (isset($pricingData['so_sanh_dich_vu']) && is_array($pricingData['so_sanh_dich_vu'])) {
        foreach ($pricingData['so_sanh_dich_vu'] as &$item) {
            $serviceType = trim((string) ($item['service_type'] ?? ''));
            if ($serviceType !== '' && isset($labels[$serviceType])) {
                $item['goi'] = $labels[$serviceType];
            }
        }
        unset($item);
    }

    if (isset($pricingData['vi_du_hoan_chinh']) && is_array($pricingData['vi_du_hoan_chinh'])) {
        foreach ($pricingData['vi_du_hoan_chinh'] as &$example) {
            $serviceType = trim((string) ($example['service_type'] ?? ''));
            if ($serviceType === '') {
                continue;
            }
            $example['title'] = pricing_service_build_synced_example_title(
                trim((string) ($example['title'] ?? '')),
                $serviceType,
                $labels
            );
            if (!empty($example['summary'])) {
                $example['summary'] = pricing_service_replace_known_service_names((string) $example['summary'], $labels);
            }
        }
        unset($example);
    }

    if (
        isset($pricingData['noi_dung_bang_gia']['phu_phi_dich_vu']['thoi_gian_thoi_tiet']['vi_du'])
        && is_array($pricingData['noi_dung_bang_gia']['phu_phi_dich_vu']['thoi_gian_thoi_tiet']['vi_du'])
    ) {
        $serviceScenario = &$pricingData['noi_dung_bang_gia']['phu_phi_dich_vu']['thoi_gian_thoi_tiet']['vi_du'];
        if (!empty($serviceScenario['title']) && !empty($serviceScenario['service_type'])) {
            $serviceScenario['title'] = pricing_service_replace_service_name_for_type(
                (string) $serviceScenario['title'],
                (string) $serviceScenario['service_type'],
                $labels
            );
        }
        unset($serviceScenario);
    }

    if (
        isset($pricingData['noi_dung_bang_gia']['vi_du_hoan_chinh']['ghi_chu'])
        && is_array($pricingData['noi_dung_bang_gia']['vi_du_hoan_chinh']['ghi_chu'])
    ) {
        $finalNotes = &$pricingData['noi_dung_bang_gia']['vi_du_hoan_chinh']['ghi_chu'];
        $orderedLabels = implode(' → ', array_filter([
            $labels['instant'] ?? '',
            $labels['express'] ?? '',
            $labels['fast'] ?? '',
            $labels['standard'] ?? '',
        ]));
        foreach ($finalNotes as &$note) {
            $text = (string) $note;
            if ($orderedLabels !== '' && strpos($text, '4 ví dụ') !== false && strpos($text, '→') !== false) {
                $note = '<strong>4 ví dụ trên</strong> lần lượt đi theo đúng thứ tự: <strong>' . $orderedLabels . '</strong>, để bạn đối chiếu nhanh từ gói khẩn cấp nhất đến gói tiết kiệm nhất. Đây vẫn là giá tham khảo để bạn ra quyết định nhanh trước khi tạo đơn.';
                continue;
            }
            $note = pricing_service_replace_known_service_names($text, $labels);
        }
        unset($note, $finalNotes);
    }

    return $pricingData;
}

function pricing_service_get_active_version_id(): int
{
    $metaValue = pricing_service_get_meta_value(GHN_PRICING_META_ACTIVE_VERSION_KEY);
    $versionId = (int) trim($metaValue);
    if ($versionId > 0) {
        return $versionId;
    }

    $listed = pricing_service_list_table('ghn_pricing_versions', [
        ['field' => 'status', 'operator' => '=', 'value' => 'active'],
    ], ['id' => 'desc'], 1, 1);

    if (empty($listed['success']) || empty($listed['rows'][0]['id'])) {
        return 0;
    }

    return (int) $listed['rows'][0]['id'];
}

function pricing_service_get_meta_value(string $metaKey): string
{
    $listed = pricing_service_list_table('ghn_pricing_meta', [
        ['field' => 'meta_key', 'operator' => '=', 'value' => $metaKey],
    ], ['id' => 'desc'], 1, 1);

    if (empty($listed['success']) || empty($listed['rows'][0])) {
        return '';
    }

    return (string) ($listed['rows'][0]['meta_value'] ?? '');
}

function pricing_service_build_config_from_version(int $versionId): array
{
    $regionRows = pricing_service_list_rows_by_version('ghn_vung_giao_hang', $versionId, ['sort_order' => 'asc']);
    $serviceRows = pricing_service_list_rows_by_version('ghn_goi_dich_vu', $versionId, ['sort_order' => 'asc']);
    $servicePriceRows = pricing_service_list_rows_by_version('ghn_gia_goi_theo_vung', $versionId, ['id' => 'asc']);
    $goodsRows = pricing_service_list_rows_by_version('ghn_loai_hang', $versionId, ['sort_order' => 'asc']);
    $timeRows = pricing_service_list_rows_by_version('ghn_khung_gio_dich_vu', $versionId, ['sort_order' => 'asc']);
    $conditionRows = pricing_service_list_rows_by_version('ghn_dieu_kien_giao', $versionId, ['sort_order' => 'asc']);
    $serviceFeeRows = pricing_service_list_rows_by_version('ghn_cau_hinh_phi_dich_vu', $versionId, ['id' => 'asc']);
    $vehicleRows = pricing_service_list_rows_by_version('ghn_phuong_tien', $versionId, ['sort_order' => 'asc']);
    $distanceRows = pricing_service_list_rows_by_version('ghn_cau_hinh_khoang_cach', $versionId, ['id' => 'asc']);
    $financialRows = pricing_service_list_rows_by_version('ghn_cau_hinh_tai_chinh', $versionId, ['id' => 'asc']);
    $cityRows = pricing_service_list_rows_by_version('ghn_thanh_pho', $versionId, ['sort_order' => 'asc']);
    $districtRows = pricing_service_list_rows_by_version('ghn_quan_huyen', $versionId, ['sort_order' => 'asc']);
    $suggestionRows = pricing_service_list_rows_by_version('ghn_goi_y_phuong_tien', $versionId, ['sort_order' => 'asc']);
    $chunkRows = pricing_service_list_rows_by_version('ghn_pricing_chunks', $versionId, ['sort_order' => 'asc']);

    $rowSets = [
        $regionRows,
        $serviceRows,
        $servicePriceRows,
        $goodsRows,
        $timeRows,
        $conditionRows,
        $serviceFeeRows,
        $vehicleRows,
        $distanceRows,
        $financialRows,
        $cityRows,
        $districtRows,
        $suggestionRows,
        $chunkRows,
    ];
    foreach ($rowSets as $rowSet) {
        if (empty($rowSet['success'])) {
            return [
                'success' => false,
                'message' => (string) ($rowSet['message'] ?? 'Không đọc được dữ liệu pricing từ KRUD.'),
                'data' => [],
            ];
        }
    }

    $regions = pricing_service_rows_by_key($regionRows['rows'], 'region_key');
    $services = pricing_service_rows_by_key($serviceRows['rows'], 'service_key');
    $citiesByKey = pricing_service_rows_by_key($cityRows['rows'], 'city_key');
    $krudMeta = [
        'service_ids' => [],
        'service_price_ids' => [],
        'goods_ids' => [],
        'time_ids' => [],
        'condition_ids' => [],
        'service_fee_config_id' => 0,
        'vehicle_ids' => [],
        'distance_config_id' => 0,
        'financial_ids' => [],
    ];

    $serviceBlock = [];
    foreach ($services as $serviceKey => $serviceRow) {
        $krudMeta['service_ids'][$serviceKey] = (int) ($serviceRow['id'] ?? 0);
        $serviceBlock[$serviceKey] = [
            'ten' => (string) ($serviceRow['service_label'] ?? $serviceKey),
            'thoigian' => [],
            'coban' => [
                'cungquan' => 0,
                'khacquan' => 0,
                'lientinh' => 0,
            ],
            'buoctiep' => 0,
            'ap_dung_phi_dich_vu' => (int) ($serviceRow['applies_service_fee'] ?? 0) === 1,
        ];
    }

    foreach ($servicePriceRows['rows'] as $row) {
        $serviceKey = (string) ($row['service_key'] ?? '');
        $regionKey = (string) ($row['region_key'] ?? '');
        if ($serviceKey === '' || $regionKey === '' || !isset($serviceBlock[$serviceKey])) {
            continue;
        }

        $baseKey = GHN_PRICING_REGION_BASE_KEY[$regionKey] ?? $regionKey;
        $serviceBlock[$serviceKey]['coban'][$baseKey] = (int) ($row['base_price'] ?? 0);
        $serviceBlock[$serviceKey]['thoigian'][$regionKey] = (string) ($row['eta_text'] ?? '');
        $serviceBlock[$serviceKey]['buoctiep'] = (int) ($row['next_step_price'] ?? 0);
        $krudMeta['service_price_ids'][$serviceKey][$regionKey] = (int) ($row['id'] ?? 0);
    }

    $goodsFees = [];
    $goodsLabels = [];
    $goodsDescriptions = [];
    $goodsMultipliers = [];
    foreach ($goodsRows['rows'] as $row) {
        $key = (string) ($row['item_type_key'] ?? '');
        if ($key === '') {
            continue;
        }
        $krudMeta['goods_ids'][$key] = (int) ($row['id'] ?? 0);
        $goodsFees[$key] = (int) ($row['fee_amount'] ?? 0);
        $goodsLabels[$key] = (string) ($row['item_type_label'] ?? $key);
        $goodsDescriptions[$key] = (string) ($row['description_text'] ?? '');
        $goodsMultipliers[$key] = (float) ($row['multiplier'] ?? 1);
    }

    $timeBlock = [];
    foreach ($timeRows['rows'] as $row) {
        $key = (string) ($row['slot_key'] ?? '');
        if ($key === '') {
            continue;
        }
        $krudMeta['time_ids'][$key] = (int) ($row['id'] ?? 0);
        $timeBlock[$key] = [
            'ten' => (string) ($row['slot_label'] ?? $key),
            'batdau' => (string) ($row['start_time'] ?? '00:00'),
            'ketthuc' => (string) ($row['end_time'] ?? '23:59'),
            'phicodinh' => (int) ($row['fixed_fee'] ?? 0),
            'heso' => (float) ($row['multiplier'] ?? 1),
        ];
    }

    $conditionBlock = [];
    foreach ($conditionRows['rows'] as $row) {
        $key = (string) ($row['condition_key'] ?? '');
        if ($key === '') {
            continue;
        }
        $krudMeta['condition_ids'][$key] = (int) ($row['id'] ?? 0);
        $conditionBlock[$key] = [
            'ten' => (string) ($row['condition_label'] ?? $key),
            'phicodinh' => (int) ($row['fixed_fee'] ?? 0),
            'heso' => (float) ($row['multiplier'] ?? 1),
        ];
    }

    $serviceFeeNote = '';
    if (!empty($serviceFeeRows['rows'][0]['note_text'])) {
        $serviceFeeNote = (string) $serviceFeeRows['rows'][0]['note_text'];
        $krudMeta['service_fee_config_id'] = (int) ($serviceFeeRows['rows'][0]['id'] ?? 0);
    }

    $distanceConfig = [
        'gia_xe_may_gan' => 0,
        'nguong_xe_may_xa' => 0,
        'gia_xe_may_xa' => 0,
        'can_mien_phi' => 0,
        'he_so_the_tich' => 6000,
        'da_gom_vat' => true,
    ];
    if (!empty($distanceRows['rows'][0])) {
        $row = $distanceRows['rows'][0];
        $krudMeta['distance_config_id'] = (int) ($row['id'] ?? 0);
        $distanceConfig = [
            'gia_xe_may_gan' => (int) ($row['motorbike_near_price'] ?? 0),
            'nguong_xe_may_xa' => (float) ($row['motorbike_far_threshold'] ?? 0),
            'gia_xe_may_xa' => (int) ($row['motorbike_far_price'] ?? 0),
            'can_mien_phi' => (float) ($row['free_weight'] ?? 0),
            'he_so_the_tich' => (int) ($row['volume_divisor'] ?? 6000),
            'da_gom_vat' => (int) ($row['vat_included'] ?? 0) === 1,
        ];
    }

    $financialBlock = [
        'thuho' => ['nguong' => 0, 'kieu' => 0, 'toithieu' => 0],
        'baohiem' => ['nguong' => 0, 'kieu' => 0, 'toithieu' => 0],
    ];
    foreach ($financialRows['rows'] as $row) {
        $key = (string) ($row['finance_key'] ?? '');
        if ($key === '' || !isset($financialBlock[$key])) {
            continue;
        }
        $krudMeta['financial_ids'][$key] = (int) ($row['id'] ?? 0);
        $financialBlock[$key] = [
            'nguong' => (int) ($row['free_threshold'] ?? 0),
            'kieu' => (float) ($row['rate_value'] ?? 0),
            'toithieu' => (int) ($row['minimum_fee'] ?? 0),
        ];
    }

    $cityList = [];
    $citiesBlock = [];
    foreach ($cityRows['rows'] as $row) {
        $cityName = (string) ($row['city_name'] ?? '');
        if ($cityName === '') {
            continue;
        }
        $cityList[] = $cityName;
        $citiesBlock[$cityName] = [];
    }
    foreach ($districtRows['rows'] as $row) {
        $cityKey = (string) ($row['city_key'] ?? '');
        $districtName = (string) ($row['district_name'] ?? '');
        if ($districtName === '' || empty($citiesByKey[$cityKey]['city_name'])) {
            continue;
        }
        $cityName = (string) $citiesByKey[$cityKey]['city_name'];
        $citiesBlock[$cityName][] = $districtName;
    }

    $suggestionsBlock = [];
    foreach ($suggestionRows['rows'] as $row) {
        $key = (string) ($row['suggestion_key'] ?? '');
        if ($key === '') {
            continue;
        }
        $suggestionsBlock[$key] = (string) ($row['suggestion_text'] ?? '');
    }

    $chunks = [];
    foreach ($chunkRows['rows'] as $row) {
        $key = (string) ($row['chunk_key'] ?? '');
        if ($key === '') {
            continue;
        }
        $decoded = json_decode((string) ($row['chunk_json'] ?? ''), true);
        $chunks[$key] = $decoded !== null ? $decoded : (string) ($row['chunk_json'] ?? '');
    }

    $zoneLabels = [
        'cung_quan' => (string) ($regions['cung_quan']['region_label'] ?? 'Nội quận/huyện'),
        'noi_thanh' => (string) ($regions['noi_thanh']['region_label'] ?? 'Nội thành'),
        'lien_tinh' => (string) ($regions['lien_tinh']['region_label'] ?? 'Liên tỉnh'),
    ];

    $legacyCungTinh = [];
    $legacyLienTinh = [];
    foreach ($serviceBlock as $serviceKey => $serviceConfig) {
        $legacyCungTinh[$serviceKey] = [
            'coban' => (int) ($serviceConfig['coban']['cungquan'] ?? 0),
            'tieptheo' => (int) ($serviceConfig['buoctiep'] ?? 0),
            'thoigian' => (string) ($serviceConfig['thoigian']['cung_quan'] ?? ''),
        ];
        $legacyLienTinh[$serviceKey] = [
            'coban' => (int) ($serviceConfig['coban']['lientinh'] ?? 0),
            'tieptheo' => (int) ($serviceConfig['buoctiep'] ?? 0),
            'thoigian' => (string) ($serviceConfig['thoigian']['lien_tinh'] ?? ''),
        ];
    }

    return [
        'success' => true,
        'message' => '',
        'data' => [
            'BANGGIA' => [
                'cungtinh' => $legacyCungTinh,
                'lientinh' => $legacyLienTinh,
                'phuthu' => $financialBlock,
            ],
            'BAOGIACHITIET' => [
                'thanhpho' => $citiesBlock,
                'noidia' => [
                    'danhsachthanhpho' => $cityList,
                    'tenvung' => $zoneLabels,
                    'dichvu' => $serviceBlock,
                    'phidichvu' => [
                        'giaongaylaptuc' => [
                            'ghichu' => $serviceFeeNote,
                            'thoigian' => $timeBlock,
                            'thoitiet' => $conditionBlock,
                        ],
                    ],
                    'philoaihang' => $goodsFees,
                    'tenloaihang' => $goodsLabels,
                    'hesoloaihang' => $goodsMultipliers,
                    'motaloaihang' => $goodsDescriptions,
                    'cauhinh_khoangcach' => $distanceConfig,
                    'goi_y_phuong_tien' => $suggestionsBlock,
                ],
            ],
            'phuong_tien' => array_map(static function (array $row): array {
                return [
                    'key' => (string) ($row['vehicle_key'] ?? ''),
                    'label' => (string) ($row['vehicle_label'] ?? ''),
                    'he_so_xe' => (float) ($row['vehicle_factor'] ?? 1),
                    'gia_co_ban' => (int) ($row['base_price'] ?? 0),
                    'phi_toi_thieu' => (int) ($row['minimum_fee'] ?? 0),
                    'trong_luong_toi_da' => (float) ($row['max_weight'] ?? 0),
                    'description' => (string) ($row['description_text'] ?? ''),
                ];
            }, $vehicleRows['rows']),
            '_krud_meta' => array_merge($krudMeta, [
                'vehicle_ids' => array_reduce($vehicleRows['rows'], static function (array $carry, array $row): array {
                    $key = (string) ($row['vehicle_key'] ?? '');
                    if ($key !== '') {
                        $carry[$key] = (int) ($row['id'] ?? 0);
                    }
                    return $carry;
                }, []),
            ]),
            'vi_du_tinh_phi' => $chunks['vi_du_tinh_phi'] ?? '',
            'noi_dung_bang_gia' => $chunks['noi_dung_bang_gia'] ?? [],
            'vi_du_hoan_chinh' => $chunks['vi_du_hoan_chinh'] ?? [],
            'so_sanh_dich_vu' => $chunks['so_sanh_dich_vu'] ?? [],
        ],
    ];
}

function pricing_service_list_rows_by_version(string $table, int $versionId, array $sort = []): array
{
    return pricing_service_list_table($table, [
        ['field' => 'pricing_version_id', 'operator' => '=', 'value' => $versionId],
    ], $sort, 1, 500);
}

function pricing_service_rows_by_key(array $rows, string $field): array
{
    $indexed = [];
    foreach ($rows as $row) {
        $key = (string) ($row[$field] ?? '');
        if ($key === '') {
            continue;
        }
        $indexed[$key] = $row;
    }

    return $indexed;
}

function pricing_service_list_table(string $table, array $where = [], array $sort = [], int $page = 1, int $limit = 200): array
{
    $payload = [
        'table' => $table,
        'page' => max(1, $page),
        'limit' => max(1, $limit),
    ];
    if ($where) {
        $payload['where'] = array_values($where);
    }
    if ($sort) {
        $payload['sort'] = $sort;
    }

    $result = pricing_service_api_request('https://api.dvqt.vn/list/', $payload);
    if (empty($result['success'])) {
        return [
            'success' => false,
            'message' => (string) ($result['message'] ?? 'Không gọi được API list.'),
            'rows' => [],
        ];
    }

    return [
        'success' => true,
        'message' => '',
        'rows' => pricing_service_extract_rows((array) ($result['data'] ?? [])),
    ];
}

function pricing_service_api_request(string $url, array $payload): array
{
    if (!function_exists('curl_init')) {
        return [
            'success' => false,
            'message' => 'PHP hiện không có curl để gọi KRUD API.',
            'data' => [],
        ];
    }

    $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($encoded === false) {
        return [
            'success' => false,
            'message' => 'Không encode được payload API.',
            'data' => [],
        ];
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $encoded,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 30,
    ]);

    $raw = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if (!is_string($raw) || $raw === '') {
        return [
            'success' => false,
            'message' => $error !== '' ? $error : 'Không nhận được phản hồi từ KRUD API.',
            'data' => [],
        ];
    }

    if ($httpCode >= 400) {
        return [
            'success' => false,
            'message' => 'KRUD API trả về HTTP ' . $httpCode . '.',
            'data' => [],
        ];
    }

    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return [
            'success' => false,
            'message' => 'Phản hồi KRUD API không hợp lệ.',
            'data' => [],
        ];
    }

    if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return [
            'success' => false,
            'message' => (string) ($decoded['error'] ?? $decoded['message'] ?? 'KRUD API trả lỗi không xác định.'),
            'data' => $decoded,
        ];
    }

    return [
        'success' => true,
        'message' => '',
        'data' => $decoded,
    ];
}

function pricing_service_extract_rows(array $decoded): array
{
    foreach (['data', 'rows', 'items', 'list', 'result', 'payload'] as $key) {
        if (isset($decoded[$key]) && is_array($decoded[$key])) {
            return array_values(array_filter($decoded[$key], static fn($item): bool => is_array($item)));
        }
    }

    $isList = array_keys($decoded) === range(0, count($decoded) - 1);
    return $isList
        ? array_values(array_filter($decoded, static fn($item): bool => is_array($item)))
        : [];
}
