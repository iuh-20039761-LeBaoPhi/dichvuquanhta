<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

/**
 * Chuẩn hóa một hàng dữ liệu dựa trên cấu trúc JSON mới
 * Đảm bảo đầu ra tương thích với giao diện "Chăm sóc vườn nhà"
 */
if (!function_exists('dichvu_normalize_row')) {
    function dichvu_normalize_row(array $row): array
    {
        // 1. Xử lý logic giá từ JSON mới sang cấu trúc giao diện
        // Chuyển price_m2_min/max thành mảng pricing để giao diện cũ không lỗi
        $pricing = [
            'type' => 'per_m2',
            'base_price' => (float)($row['price_m2_min'] ?? 0),
            'max_price'  => (float)($row['price_m2_max'] ?? 0),
            'unit'       => (string)($row['area_unit'] ?? 'm²'),
            'note'       => (string)($row['price_note'] ?? '')
        ];

        // 2. Chuyển service_area (chuỗi) thành mảng loai
        $serviceArea = (string)($row['service_area'] ?? '');
        $loai = $serviceArea !== '' ? array_map('trim', explode(',', $serviceArea)) : [];

        // Giữ nguyên time_slots nếu JSON gốc có
        $timeSlots = [];
        if (!empty($row['time_slots']) && is_array($row['time_slots'])) {
            $timeSlots = $row['time_slots'];
        }

        // Giữ nguyên pricing đầy đủ nếu JSON gốc đã lưu (từ lần sửa trước)
        // Nếu JSON gốc có pricing.levels và pricing.estimated thì dùng luôn
        if (!empty($row['pricing']) && is_array($row['pricing'])) {
            $savedPricing = $row['pricing'];
            // Merge: ưu tiên dữ liệu đã lưu, fallback về price_m2_min/max
            if (!isset($savedPricing['base_price']) || (float)$savedPricing['base_price'] === 0.0) {
                $savedPricing['base_price'] = (float)($row['price_m2_min'] ?? 0);
            }
            $pricing = array_merge($pricing, $savedPricing);
        }

        return [
            'id'              => (int)($row['id'] ?? 0),
            'category'        => (string)($row['category'] ?? 'default'),
            'name'            => trim((string)($row['name'] ?? '')),
            'description'     => trim((string)($row['description'] ?? '')),
            'image'           => trim((string)($row['image'] ?? '')),
            'alt'             => (string)($row['seo']['meta_title'] ?? $row['name'] ?? ''),

            // Các trường đã được ánh xạ để tương thích logic cũ
            'loai'            => $loai,
            'service_area'    => $serviceArea,
            'pricing'         => $pricing,
            'includes'        => (array)($row['tags'] ?? []),
            'tags'            => (array)($row['tags'] ?? []),

            // Trường giá gốc từ JSON (để form sửa đọc trực tiếp)
            'price_m2_min'    => (float)($row['price_m2_min'] ?? 0),
            'price_m2_max'    => (float)($row['price_m2_max'] ?? 0),
            'price_note'      => (string)($row['price_note'] ?? ''),

            // Các trường bổ sung
            'rating'          => (float)($row['rating'] ?? 0),
            'reviews'         => (int)($row['total_reviews'] ?? 0),
            'duration'        => (string)($row['duration_estimate'] ?? ''),
            'difficulty'      => (string)($row['difficulty_level'] ?? 'easy'),
            'is_active'       => (bool)($row['is_active'] ?? true),
            'time_slots'      => $timeSlots,
        ];
    }
}

/**
 * Lấy dữ liệu từ file JSON cục bộ thay vì API
 */
if (!function_exists('get_dichvu_data')) {
    function get_dichvu_data(): array
    {
        $filePath = __DIR__ . '/data_dichvu.json'; // Tên file JSON của bạn
        
        if (!file_exists($filePath)) {
            return ['rows' => [], 'error' => 'Không tìm thấy file JSON dữ liệu.'];
        }

        $jsonRaw = file_get_contents($filePath);
        $data = json_decode($jsonRaw, true);

        if ($data === null) {
            return ['rows' => [], 'error' => 'Lỗi định dạng JSON.'];
        }

        // Hỗ trợ cả trường hợp file JSON là 1 mảng các item hoặc chỉ 1 item duy nhất
        $items = isset($data['id']) ? [$data] : $data;

        $normalized = array_map('dichvu_normalize_row', $items);
        
        // Sắp xếp ID mới nhất lên trên
        usort($normalized, fn($a, $b) => $b['id'] <=> $a['id']);

        return [
            'rows' => $normalized,
            'error' => '',
        ];
    }
}

/**
 * Tìm dịch vụ theo ID từ file JSON
 */
if (!function_exists('get_dichvu_by_id')) {
    function get_dichvu_by_id(int $id): array
    {
        $data = get_dichvu_data();
        if ($data['error'] !== '') return ['row' => null, 'error' => $data['error']];

        foreach ($data['rows'] as $row) {
            if ($row['id'] === $id) {
                return ['row' => $row, 'error' => ''];
            }
        }

        return ['row' => null, 'error' => 'Không tìm thấy dịch vụ ID #' . $id];
    }
}

/**
 * Hàm hỗ trợ hiển thị danh sách (Tags/Includes)
 */
if (!function_exists('dichvu_includes_to_text')) {
    function dichvu_includes_to_text(array $items): string
    {
        return implode("\n", $items);
    }
}

/**
 * Xây dựng dữ liệu gửi đi (Payload) dựa trên cấu trúc JSON mới
 */
if (!function_exists('dichvu_build_payload_from_post')) {
    function dichvu_build_payload_from_post(array $post): array
    {
        $name = trim((string)($post['name'] ?? ''));

        if ($name === '') {
            return ['success' => false, 'message' => 'Tên dịch vụ không được để trống.'];
        }

        // Đọc pricing từ pricing_json (do form JS gửi lên)
        $pricingRaw = trim((string)($post['pricing_json'] ?? ''));
        $pricing = [];
        if ($pricingRaw !== '') {
            $decoded = json_decode($pricingRaw, true);
            if (is_array($decoded)) {
                $pricing = $decoded;
            }
        }

        // Tính price_m2_min / price_m2_max từ pricing
        $pType = (string)($pricing['type'] ?? 'per_m2');
        $priceMin = 0.0;
        $priceMax = 0.0;
        if ($pType === 'per_m2') {
            $basePrice = (float)($pricing['base_price'] ?? 0);
            $levels = (array)($pricing['levels'] ?? []);
            $multipliers = array_values(array_filter(array_map('floatval', $levels)));
            if (!empty($multipliers)) {
                $priceMin = $basePrice * min($multipliers);
                $priceMax = $basePrice * max($multipliers);
            } else {
                $priceMin = $basePrice;
                $priceMax = $basePrice;
            }
        } elseif ($pType === 'package') {
            $packages = (array)($pricing['packages'] ?? []);
            $prices = array_filter(array_map(fn($p) => (float)($p['price'] ?? 0), $packages));
            if (!empty($prices)) {
                $priceMin = min($prices);
                $priceMax = max($prices);
            }
        }

        // Đọc loai_text và includes_text từ form
        $loaiText = trim((string)($post['loai_text'] ?? ''));
        $serviceArea = implode(', ', array_filter(array_map('trim', explode("\n", $loaiText))));

        $includesText = trim((string)($post['includes_text'] ?? ''));
        $tags = array_values(array_filter(array_map('trim', explode("\n", $includesText))));

        // Đọc time_slots từ form
        $tsValues = (array)($post['ts_value'] ?? []);
        $tsLabels = (array)($post['ts_label'] ?? []);
        $timeSlots = [];
        foreach ($tsValues as $i => $v) {
            $v = trim((string)$v);
            $l = trim((string)($tsLabels[$i] ?? ''));
            if ($v !== '' && $l !== '') {
                $timeSlots[] = ['value' => $v, 'label' => $l];
            }
        }

        // Đóng gói theo đúng cấu trúc file JSON
        $data = [
            'id'                => (int)($post['id'] ?? time()),
            'category'          => trim((string)($post['category'] ?? 'coban')),
            'name'              => $name,
            'description'       => trim((string)($post['description'] ?? '')),
            'price_m2_min'      => $priceMin,
            'price_m2_max'      => $priceMax,
            'price_note'        => trim((string)($post['price_note'] ?? '')),
            'area_unit'         => 'm²',
            'service_area'      => $serviceArea,
            'image'             => trim((string)($post['image'] ?? '')),
            'duration_estimate' => trim((string)($post['duration'] ?? '')),
            'difficulty_level'  => trim((string)($post['difficulty'] ?? 'easy')),
            'rating'            => (float)($post['rating'] ?? 5.0),
            'is_active'         => true,
            'tags'              => $tags,
            'time_slots'        => $timeSlots,
            'pricing'           => $pricing,
            'seo' => [
                'meta_title'       => "Dịch vụ $name chuyên nghiệp",
                'meta_description' => mb_substr(trim((string)($post['description'] ?? '')), 0, 150),
            ],
            'updated_at'        => date('Y-m-d'),
        ];

        return [
            'success' => true,
            'message' => '',
            'data'    => $data,
        ];
    }
}