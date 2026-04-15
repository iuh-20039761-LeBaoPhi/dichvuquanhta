<?php
declare(strict_types=1);

function moving_pricing_service_read_template(string $path): array
{
    if (!is_file($path)) {
        return [];
    }

    $raw = file_get_contents($path);
    if ($raw === false) {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function moving_pricing_service_number($value, $fallback = 0): float
{
    if ($value === null || $value === '') {
        return (float) $fallback;
    }

    return (float) $value;
}

function moving_pricing_service_text($value, string $fallback = ''): string
{
    $text = trim((string) $value);
    return $text !== '' ? $text : $fallback;
}

function moving_pricing_service_group_rows(array $rows, string $serviceKey, string $slugKey): array
{
    $grouped = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $serviceId = trim((string) ($row[$serviceKey] ?? ''));
        $slug = trim((string) ($row[$slugKey] ?? ''));
        if ($serviceId === '' || $slug === '') {
            continue;
        }

        if (!isset($grouped[$serviceId])) {
            $grouped[$serviceId] = [];
        }

        $grouped[$serviceId][$slug] = $row;
    }

    return $grouped;
}

function moving_pricing_service_group_vehicle_rows_ordered(array $rows): array
{
    $grouped = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $serviceId = trim((string) ($row['id_dich_vu'] ?? ''));
        $slug = trim((string) ($row['slug_xe'] ?? ''));
        if ($serviceId === '' || $slug === '') {
            continue;
        }

        if (!isset($grouped[$serviceId])) {
            $grouped[$serviceId] = [];
        }

        $grouped[$serviceId][] = $row;
    }

    return $grouped;
}

function moving_pricing_service_group_item_rows(array $rows): array
{
    $grouped = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $serviceId = trim((string) ($row['id_dich_vu'] ?? ''));
        $groupKey = trim((string) ($row['nhom'] ?? ''));
        $slug = trim((string) ($row['slug_muc'] ?? ''));
        if ($serviceId === '' || $groupKey === '' || $slug === '') {
            continue;
        }

        if (!isset($grouped[$serviceId])) {
            $grouped[$serviceId] = [];
        }
        if (!isset($grouped[$serviceId][$groupKey])) {
            $grouped[$serviceId][$groupKey] = [];
        }

        $grouped[$serviceId][$groupKey][$slug] = $row;
    }

    return $grouped;
}

function moving_pricing_service_group_item_rows_ordered(array $rows): array
{
    $grouped = [];

    foreach ($rows as $row) {
        if (!is_array($row)) {
            continue;
        }

        $serviceId = trim((string) ($row['id_dich_vu'] ?? ''));
        $groupKey = trim((string) ($row['nhom'] ?? ''));
        $slug = trim((string) ($row['slug_muc'] ?? ''));
        if ($serviceId === '' || $groupKey === '' || $slug === '') {
            continue;
        }

        if (!isset($grouped[$serviceId])) {
            $grouped[$serviceId] = [];
        }
        if (!isset($grouped[$serviceId][$groupKey])) {
            $grouped[$serviceId][$groupKey] = [];
        }

        $grouped[$serviceId][$groupKey][] = $row;
    }

    return $grouped;
}

function moving_pricing_service_build_vehicle_entry(array $currentVehicle, array $row): array
{
    return [
        'slug' => moving_pricing_service_text($row['slug_xe'] ?? ($currentVehicle['slug'] ?? '')),
        'ten' => moving_pricing_service_text($row['ten_xe'] ?? ($currentVehicle['ten'] ?? '')),
        'gia_mo_cua' => moving_pricing_service_number($row['gia_mo_cua'] ?? ($currentVehicle['gia_mo_cua'] ?? 0)),
        'pham_vi_mo_cua_km' => 5,
        'bang_gia_km' => [
            [
                'tu_km' => 6,
                'den_km' => 15,
                'don_gia' => moving_pricing_service_number($row['don_gia_km_6_15'] ?? 0),
            ],
            [
                'tu_km' => 16,
                'den_km' => 30,
                'don_gia' => moving_pricing_service_number($row['don_gia_km_16_30'] ?? 0),
            ],
            [
                'tu_km' => 31,
                'den_km' => null,
                'don_gia' => moving_pricing_service_number($row['don_gia_km_31_tro_len'] ?? 0),
            ],
        ],
        'gia_moi_km' => moving_pricing_service_number($row['gia_moi_km_form'] ?? ($currentVehicle['gia_moi_km'] ?? 0)),
        'gia_moi_km_duong_dai' => moving_pricing_service_number($row['gia_moi_km_duong_dai_form'] ?? ($currentVehicle['gia_moi_km_duong_dai'] ?? 0)),
        'phi_toi_thieu' => moving_pricing_service_number($row['phi_toi_thieu_form'] ?? ($currentVehicle['phi_toi_thieu'] ?? 0)),
        'nguong_km_giam_gia' => 20,
        'ty_le_giam_gia_duong_dai' => 0.1,
    ];
}

function moving_pricing_service_build_item_entry(array $currentItem, array $row): array
{
    $slug = moving_pricing_service_text($row['slug_muc'] ?? ($currentItem['slug'] ?? ''));
    $entry = [
        'slug' => $slug,
        'ten' => moving_pricing_service_text($row['ten_muc'] ?? ($currentItem['ten'] ?? '')),
        'don_gia' => moving_pricing_service_number($row['don_gia'] ?? ($currentItem['don_gia'] ?? 0)),
    ];

    $displaySlug = moving_pricing_service_text(
        $currentItem['nguon_hien_thi_slug'] ?? ($row['nguon_hien_thi_slug'] ?? $slug)
    );
    if ($displaySlug !== '') {
        $entry['nguon_hien_thi_slug'] = $displaySlug;
    }

    return $entry;
}

function moving_pricing_service_sync_display_items(array &$service): void
{
    $displayNameMap = [];
    $checkboxItems = $service['bang_gia']['phu_phi']['checkbox'] ?? [];
    foreach ($checkboxItems as $item) {
        $slug = trim((string) ($item['slug'] ?? ''));
        $name = trim((string) ($item['ten'] ?? ''));
        if ($slug === '' || $name === '') {
            continue;
        }
        $displayNameMap[$slug] = $name;
    }

    $openingValues = [];
    foreach (($service['bang_gia']['loai_xe'] ?? []) as $vehicle) {
        $amount = (float) ($vehicle['gia_mo_cua'] ?? 0);
        if ($amount > 0) {
            $openingValues[] = $amount;
        }
    }

    $openingRangeLabel = '';
    if (!empty($openingValues)) {
        sort($openingValues);
        $min = number_format((float) $openingValues[0], 0, ',', '.');
        $max = number_format((float) $openingValues[count($openingValues) - 1], 0, ',', '.');
        $openingRangeLabel = $min === $max ? 'Mở cửa ' . $min : 'Mở cửa ' . $min . ' – ' . $max;
    }

    if (!isset($service['hang_muc_bao_gia']) || !is_array($service['hang_muc_bao_gia'])) {
        return;
    }

    $nextDisplayItems = [];

    foreach ($service['hang_muc_bao_gia'] as &$item) {
        $slug = trim((string) ($item['slug'] ?? ''));
        if ($slug === '') {
            continue;
        }

        $keepStaticItem = $slug === 'cuoc_xe'
            || trim((string) ($item['khoang_gia'] ?? '')) !== ''
            || trim((string) ($item['ghi_chu'] ?? '')) !== '';
        if (!$keepStaticItem && !isset($displayNameMap[$slug])) {
            continue;
        }

        if ($slug === 'cuoc_xe' && $openingRangeLabel !== '') {
            $item['khoang_gia'] = $openingRangeLabel;
        }

        if ($slug === 'khao_sat_truoc') {
            foreach ($checkboxItems as $checkboxItem) {
                if (trim((string) ($checkboxItem['slug'] ?? '')) === 'khao_sat_truoc') {
                    $surveyPrice = (float) ($checkboxItem['don_gia'] ?? 0);
                    if ($surveyPrice > 0) {
                        $item['khoang_gia'] = number_format($surveyPrice, 0, ',', '.');
                    }
                    break;
                }
            }
        }

        if (isset($displayNameMap[$slug]) && $displayNameMap[$slug] !== '') {
            $item['ten'] = $displayNameMap[$slug];
        }

        $nextDisplayItems[] = $item;
    }
    unset($item);

    $service['hang_muc_bao_gia'] = $nextDisplayItems;
}

function moving_pricing_service_build_json_from_rows(
    array $templateData,
    array $vehicleRows,
    array $itemRows
): array {
    $vehicleMap = moving_pricing_service_group_rows($vehicleRows, 'id_dich_vu', 'slug_xe');
    $itemMap = moving_pricing_service_group_item_rows($itemRows);
    $orderedVehicleMap = moving_pricing_service_group_vehicle_rows_ordered($vehicleRows);
    $orderedItemMap = moving_pricing_service_group_item_rows_ordered($itemRows);

    foreach ($templateData as &$service) {
        if (!is_array($service)) {
            continue;
        }

        $serviceId = trim((string) ($service['id'] ?? ''));
        if ($serviceId === '') {
            continue;
        }

        if (isset($service['bang_gia']['loai_xe']) && is_array($service['bang_gia']['loai_xe'])) {
            if (!empty($orderedVehicleMap[$serviceId])) {
                $currentVehicleMap = [];
                foreach ($service['bang_gia']['loai_xe'] as $vehicle) {
                    $slug = trim((string) ($vehicle['slug'] ?? ''));
                    if ($slug !== '') {
                        $currentVehicleMap[$slug] = $vehicle;
                    }
                }

                $service['bang_gia']['loai_xe'] = array_values(array_map(
                    static function (array $row) use ($currentVehicleMap): array {
                        $slug = trim((string) ($row['slug_xe'] ?? ''));
                        $currentVehicle = $currentVehicleMap[$slug] ?? [];
                        return moving_pricing_service_build_vehicle_entry($currentVehicle, $row);
                    },
                    $orderedVehicleMap[$serviceId]
                ));
            } else {
                foreach ($service['bang_gia']['loai_xe'] as &$vehicle) {
                    $slug = trim((string) ($vehicle['slug'] ?? ''));
                    if ($slug === '') {
                        continue;
                    }

                    $row = $vehicleMap[$serviceId][$slug] ?? null;
                    if (!is_array($row)) {
                        continue;
                    }

                    $vehicle = moving_pricing_service_build_vehicle_entry($vehicle, $row);
                }
                unset($vehicle);
            }
        }

        foreach (['checkbox', 'khung_gio', 'thoi_tiet'] as $groupKey) {
            if (!isset($service['bang_gia']['phu_phi'][$groupKey]) || !is_array($service['bang_gia']['phu_phi'][$groupKey])) {
                continue;
            }

            if (!empty($orderedItemMap[$serviceId][$groupKey])) {
                $currentItemMap = [];
                foreach ($service['bang_gia']['phu_phi'][$groupKey] as $item) {
                    $slug = trim((string) ($item['slug'] ?? ''));
                    if ($slug !== '') {
                        $currentItemMap[$slug] = $item;
                    }
                }

                $service['bang_gia']['phu_phi'][$groupKey] = array_values(array_map(
                    static function (array $row) use ($currentItemMap): array {
                        $slug = trim((string) ($row['slug_muc'] ?? ''));
                        $currentItem = $currentItemMap[$slug] ?? [];
                        return moving_pricing_service_build_item_entry($currentItem, $row);
                    },
                    $orderedItemMap[$serviceId][$groupKey]
                ));
            } else {
                foreach ($service['bang_gia']['phu_phi'][$groupKey] as &$item) {
                    $slug = trim((string) ($item['slug'] ?? ''));
                    if ($slug === '') {
                        continue;
                    }

                    $row = $itemMap[$serviceId][$groupKey][$slug] ?? null;
                    if (!is_array($row)) {
                        continue;
                    }

                    $item = moving_pricing_service_build_item_entry($item, $row);
                }
                unset($item);
            }
        }

        moving_pricing_service_sync_display_items($service);
    }
    unset($service);

    return $templateData;
}
