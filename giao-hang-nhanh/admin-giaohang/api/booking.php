<?php
/**
 * booking.php
 * API chính cho prefill, reorder và tạo đơn giao hàng trong admin/public flow.
 * File này giữ orchestration:
 * - đọc request
 * - xác thực / truy vấn DB
 * - lưu đơn và trả response
 *
 * Liên quan trực tiếp:
 * - booking_normalize.php: gom alias/fallback/normalize để file này ngắn hơn
 * - dat-lich/flow-submit.js: submit đơn từ frontend
 * - customer-portal.js, shipper-portal.js, tracking modules: đọc dữ liệu đơn trả về
 */
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/settings_helper.php';
require_once __DIR__ . '/booking_normalize.php';

function json_response($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

function build_system_order_code($orderId, $createdAt = null) {
    $numericId = (int) $orderId;
    if ($numericId <= 0) {
        return '';
    }

    $timezone = new DateTimeZone('Asia/Ho_Chi_Minh');
    try {
        $date = $createdAt
            ? new DateTime((string) $createdAt, $timezone)
            : new DateTime('now', $timezone);
    } catch (Exception $exception) {
        $date = new DateTime('now', $timezone);
    }

    return 'GHN-' . $date->format('Ymd') . '-' . str_pad((string) $numericId, 7, '0', STR_PAD_LEFT);
}

function sanitize_filename($name) {
    $base = basename((string) $name);
    $clean = preg_replace('/[^A-Za-z0-9._-]/', '_', $base);
    return $clean !== '' ? $clean : 'file';
}

function save_upload_group($field, $targetDir, array $allowedExts = []) {
    if (!isset($_FILES[$field])) {
        return [];
    }

    $files = $_FILES[$field];
    $names = $files['name'] ?? [];
    $tmpNames = $files['tmp_name'] ?? [];
    $errors = $files['error'] ?? [];

    if (!is_array($names)) {
        $names = [$names];
        $tmpNames = [$tmpNames];
        $errors = [$errors];
    }

    if (!is_dir($targetDir) && !mkdir($targetDir, 0775, true) && !is_dir($targetDir)) {
        throw new Exception('Không thể tạo thư mục lưu file đính kèm.');
    }

    $saved = [];
    foreach ($names as $index => $originalName) {
        if (($errors[$index] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }

        $tmpName = $tmpNames[$index] ?? '';
        if ($tmpName === '' || !is_uploaded_file($tmpName)) {
            continue;
        }

        $safeName = sanitize_filename($originalName);
        $extension = strtolower(pathinfo($safeName, PATHINFO_EXTENSION));
        if (!empty($allowedExts) && $extension !== '' && !in_array($extension, $allowedExts, true)) {
            continue;
        }

        $finalName = $safeName;
        $counter = 1;
        while (file_exists($targetDir . DIRECTORY_SEPARATOR . $finalName)) {
            $finalName = pathinfo($safeName, PATHINFO_FILENAME) . '_' . $counter . ($extension ? '.' . $extension : '');
            $counter++;
        }

        $destination = $targetDir . DIRECTORY_SEPARATOR . $finalName;
        if (move_uploaded_file($tmpName, $destination)) {
            $saved[] = $finalName;
        }
    }

    return $saved;
}

function get_booking_prefill(mysqli $conn, $userId) {
    $prefill = [
        'sender_name' => '',
        'sender_phone' => '',
        'pickup_address' => '',
    ];
    $companyAddress = '';

    $userStmt = $conn->prepare("SELECT ho_ten AS fullname, so_dien_thoai AS phone, dia_chi_cong_ty AS company_address FROM nguoi_dung WHERE id = ? LIMIT 1");
    if ($userStmt) {
        $userStmt->bind_param('i', $userId);
        $userStmt->execute();
        $user = $userStmt->get_result()->fetch_assoc();
        $userStmt->close();

        if ($user) {
            $prefill['sender_name'] = trim((string) ($user['fullname'] ?? ''));
            $prefill['sender_phone'] = trim((string) ($user['phone'] ?? ''));
            $companyAddress = trim((string) ($user['company_address'] ?? ''));
        }
    }

    $savedAddressStmt = $conn->prepare("SELECT so_dien_thoai AS phone, dia_chi AS address FROM dia_chi_da_luu WHERE nguoi_dung_id = ? ORDER BY id DESC LIMIT 1");
    if ($savedAddressStmt) {
        $savedAddressStmt->bind_param('i', $userId);
        $savedAddressStmt->execute();
        $savedAddress = $savedAddressStmt->get_result()->fetch_assoc();
        $savedAddressStmt->close();

        if ($savedAddress) {
            if ($prefill['sender_phone'] === '') {
                $prefill['sender_phone'] = trim((string) ($savedAddress['phone'] ?? ''));
            }
            if ($prefill['pickup_address'] === '') {
                $prefill['pickup_address'] = trim((string) ($savedAddress['address'] ?? ''));
            }
        }
    }

    if ($prefill['pickup_address'] === '' && $companyAddress !== '') {
        $prefill['pickup_address'] = $companyAddress;
    }

    if ($prefill['pickup_address'] === '') {
        $orderStmt = $conn->prepare("SELECT dia_chi_lay_hang AS pickup_address FROM don_hang WHERE nguoi_dung_id = ? AND dia_chi_lay_hang IS NOT NULL AND dia_chi_lay_hang <> '' ORDER BY id DESC LIMIT 1");
        if ($orderStmt) {
            $orderStmt->bind_param('i', $userId);
            $orderStmt->execute();
            $orderRow = $orderStmt->get_result()->fetch_assoc();
            $orderStmt->close();

            if ($orderRow) {
                $prefill['pickup_address'] = trim((string) ($orderRow['pickup_address'] ?? ''));
            }
        }
    }

    return with_booking_prefill_aliases($prefill);
}

function save_recent_pickup_address(mysqli $conn, $userId, $name, $phone, $address) {
    $userId = (int) $userId;
    $name = trim((string) $name);
    $phone = trim((string) $phone);
    $address = trim((string) $address);

    if ($userId <= 0 || $address === '') {
        return;
    }

    $existingStmt = $conn->prepare("SELECT id FROM dia_chi_da_luu WHERE nguoi_dung_id = ? AND dia_chi = ? LIMIT 1");
    if ($existingStmt) {
        $existingStmt->bind_param('is', $userId, $address);
        $existingStmt->execute();
        $existing = $existingStmt->get_result()->fetch_assoc();
        $existingStmt->close();

        if ($existing) {
            $updateStmt = $conn->prepare("UPDATE dia_chi_da_luu SET ten_goi_nho = ?, so_dien_thoai = ? WHERE id = ? AND nguoi_dung_id = ?");
            if ($updateStmt) {
                $addressId = (int) $existing['id'];
                $updateStmt->bind_param('ssii', $name, $phone, $addressId, $userId);
                $updateStmt->execute();
                $updateStmt->close();
            }
            return;
        }
    }

    $insertStmt = $conn->prepare("INSERT INTO dia_chi_da_luu (nguoi_dung_id, ten_goi_nho, so_dien_thoai, dia_chi) VALUES (?, ?, ?, ?)");
    if ($insertStmt) {
        $insertStmt->bind_param('isss', $userId, $name, $phone, $address);
        $insertStmt->execute();
        $insertStmt->close();
    }
}

function format_money_text($value) {
    return number_format((float) $value, 0, ',', '.') . 'đ';
}

function encode_json_for_db($value) {
    $json = json_encode(
        $value,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    return $json !== false ? $json : '{}';
}

function build_slot_datetime($dateValue, $slotValue, $fallback = '08:00') {
    $dateText = trim((string) $dateValue);
    if ($dateText === '') {
        return null;
    }

    $timeText = extract_slot_start_time($slotValue, $fallback);
    $timestamp = strtotime($dateText . ' ' . $timeText);
    if ($timestamp === false) {
        return null;
    }

    return date('Y-m-d H:i:s', $timestamp);
}

function build_estimated_delivery_datetime(array $data, $pickupTime) {
    $deliverySlotLabel = first_non_empty_value($data['delivery_slot_label'] ?? '', $data['delivery_slot'] ?? '');
    $requested = build_slot_datetime($data['delivery_date'] ?? '', $deliverySlotLabel, '09:00');
    if ($requested !== null) {
        return $requested;
    }

    $pickupTimestamp = strtotime((string) $pickupTime);
    $turnaroundMinutes = max(0, (int) ($data['turnaround_minutes'] ?? 0));
    if ($pickupTimestamp === false || $turnaroundMinutes <= 0) {
        return null;
    }

    return date('Y-m-d H:i:s', $pickupTimestamp + ($turnaroundMinutes * 60));
}

function build_structured_order_note(array $data, $originalNote) {
    $cleanOriginalNote = trim((string) $originalNote);
    $noteParts = [];

    if ($cleanOriginalNote !== '') {
        $noteParts[] = $cleanOriginalNote;
    }

    $feePayer = (string) ($data['fee_payer'] ?? 'gui');
    if ($feePayer === 'nhan') {
        $noteParts[] = 'Người trả cước: Người nhận';
    }

    $breakdown = isset($data['pricing_breakdown']) && is_array($data['pricing_breakdown'])
        ? $data['pricing_breakdown']
        : [];
    $insuranceFee = (float) ($breakdown['insuranceFee'] ?? 0);
    if ($insuranceFee > 0) {
        $noteParts[] = '💎 Bảo hiểm hàng hóa: ' . format_money_text($insuranceFee);
    }

    return trim(implode("\n", $noteParts));
}

function build_service_meta_record(array $data) {
    return [
        'service_name' => trim((string) ($data['service_name'] ?? '')),
        'estimated_eta' => trim((string) ($data['estimated_eta'] ?? '')),
        'pickup_date' => trim((string) ($data['pickup_date'] ?? '')),
        'pickup_slot' => trim((string) ($data['pickup_slot'] ?? '')),
        'pickup_slot_label' => trim((string) ($data['pickup_slot_label'] ?? '')),
        'delivery_date' => trim((string) ($data['delivery_date'] ?? '')),
        'delivery_slot' => trim((string) ($data['delivery_slot'] ?? '')),
        'delivery_slot_label' => trim((string) ($data['delivery_slot_label'] ?? '')),
        'turnaround_minutes' => (int) ($data['turnaround_minutes'] ?? 0),
        'turnaround_label' => trim((string) ($data['turnaround_label'] ?? '')),
        'vehicle_key' => trim((string) ($data['vehicle'] ?? '')),
        'vehicle_label' => trim((string) ($data['vehicle_label'] ?? '')),
        'vehicle_suggestion' => trim((string) ($data['vehicle_suggestion'] ?? '')),
        'service_condition_key' => trim((string) ($data['service_condition_key'] ?? '')),
        'service_condition_label' => trim((string) ($data['service_condition_label'] ?? '')),
        'time_surcharge_key' => trim((string) ($data['time_surcharge_key'] ?? '')),
        'time_surcharge_label' => trim((string) ($data['time_surcharge_label'] ?? '')),
        'weather_source' => trim((string) ($data['weather_source'] ?? '')),
        'weather_note' => trim((string) ($data['weather_note'] ?? '')),
        'payer_label' => fee_payer_label((string) ($data['fee_payer'] ?? 'gui')),
        'payment_method_label' => payment_method_label((string) ($data['payment_method'] ?? 'cod')),
        'distance_km' => round((float) ($data['khoang_cach_km'] ?? 0), 2),
        'pickup_lat' => (float) ($data['pickup_lat'] ?? 0),
        'pickup_lng' => (float) ($data['pickup_lng'] ?? 0),
        'delivery_lat' => (float) ($data['delivery_lat'] ?? 0),
        'delivery_lng' => (float) ($data['delivery_lng'] ?? 0),
    ];
}

function doc_gia_tri_breakdown(array $breakdown, array $keys, $default = 0) {
    foreach ($keys as $key) {
        if (array_key_exists($key, $breakdown) && $breakdown[$key] !== null && $breakdown[$key] !== '') {
            return $breakdown[$key];
        }
    }

    return $default;
}

function build_pricing_breakdown_record(array $data, $shippingFee) {
    $breakdown = isset($data['pricing_breakdown']) && is_array($data['pricing_breakdown'])
        ? $data['pricing_breakdown']
        : [];

    return [
        'base_price' => round((float) doc_gia_tri_breakdown($breakdown, ['basePrice', 'tong_gia_van_chuyen', 'gia_co_ban']), 2),
        'goods_fee' => round((float) doc_gia_tri_breakdown($breakdown, ['goodsFee', 'phu_phi_loai_hang']), 2),
        'time_fee' => round((float) doc_gia_tri_breakdown($breakdown, ['timeFee', 'phu_phi_khung_gio']), 2),
        'condition_fee' => round((float) doc_gia_tri_breakdown($breakdown, ['conditionFee', 'phu_phi_thoi_tiet']), 2),
        'vehicle_fee' => round((float) doc_gia_tri_breakdown($breakdown, ['vehicleFee', 'dieu_chinh_theo_xe']), 2),
        'cod_fee' => round((float) doc_gia_tri_breakdown($breakdown, ['codFee', 'phi_cod']), 2),
        'insurance_fee' => round((float) doc_gia_tri_breakdown($breakdown, ['insuranceFee', 'phi_bao_hiem']), 2),
        'don_gia_km' => round((float) doc_gia_tri_breakdown($breakdown, ['don_gia_km']), 2),
        'he_so_xe' => round((float) doc_gia_tri_breakdown($breakdown, ['he_so_xe'], 1), 4),
        'phi_toi_thieu' => round((float) doc_gia_tri_breakdown($breakdown, ['phi_toi_thieu']), 2),
        'ten_loai_xe_tinh_gia' => trim((string) doc_gia_tri_breakdown($breakdown, ['ten_loai_xe_tinh_gia'], '')),
        'ten_khung_gio' => trim((string) doc_gia_tri_breakdown($breakdown, ['ten_khung_gio', 'timeSurchargeLabel'], '')),
        'ten_dieu_kien_thoi_tiet' => trim((string) doc_gia_tri_breakdown($breakdown, ['ten_dieu_kien_thoi_tiet', 'conditionSurchargeLabel'], '')),
        'total_fee' => round((float) $shippingFee, 2),
    ];
}

function get_google_sheets_webhook_url($conn) {
    $envUrl = getenv('GOOGLE_SHEETS_WEBHOOK_URL') ?: getenv('GOOGLE_APPS_SCRIPT_WEBHOOK_URL');
    if ($envUrl) {
        return trim((string) $envUrl);
    }
    return trim((string) getSetting($conn, 'google_sheets_webhook_url', ''));
}

function http_post_json($url, array $payload) {
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($body === false) {
        return ['ok' => false, 'message' => 'Không thể mã hóa dữ liệu đồng bộ Sheets.'];
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => [
                'Accept: application/json',
                'Content-Type: application/json',
                'Content-Length: ' . strlen($body),
            ],
        ]);
        $responseBody = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($responseBody !== false && $httpCode >= 200 && $httpCode < 300) {
            $decoded = json_decode((string) $responseBody, true);
            return ['ok' => true, 'data' => is_array($decoded) ? $decoded : ['raw' => $responseBody]];
        }

        return ['ok' => false, 'message' => $error ?: 'HTTP ' . $httpCode];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'timeout' => 15,
            'header' => "Accept: application/json\r\nContent-Type: application/json\r\n",
            'content' => $body,
        ],
    ]);
    $responseBody = @file_get_contents($url, false, $context);
    if ($responseBody === false) {
        return ['ok' => false, 'message' => 'Không thể gửi dữ liệu đến Google Sheets.'];
    }
    $decoded = json_decode((string) $responseBody, true);
    return ['ok' => true, 'data' => is_array($decoded) ? $decoded : ['raw' => $responseBody]];
}

function sync_order_to_google_sheets($conn, array $payload) {
    $webhookUrl = get_google_sheets_webhook_url($conn);
    if ($webhookUrl === '') {
        return ['configured' => false, 'synced' => false];
    }

    $response = http_post_json($webhookUrl, $payload);
    if (!$response['ok']) {
        throw new Exception('Không thể đồng bộ Google Sheets: ' . ($response['message'] ?? 'Lỗi không xác định.'));
    }

    $data = $response['data'] ?? [];
    if (is_array($data) && array_key_exists('success', $data) && !$data['success']) {
        throw new Exception('Google Sheets từ chối dữ liệu: ' . trim((string) ($data['message'] ?? 'Lỗi không xác định.')));
    }

    return ['configured' => true, 'synced' => true];
}

function load_pricing_data_json() {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $path = dirname(__DIR__, 2) . '/public/data/pricing-data.json';
    if (!is_file($path)) {
        $cache = [];
        return $cache;
    }

    $raw = @file_get_contents($path);
    $decoded = json_decode((string) $raw, true);
    $cache = is_array($decoded) ? $decoded : [];
    return $cache;
}

function normalize_fee_rule_map(array $source, array $fallback) {
    $normalized = [];
    foreach (array_merge($fallback, $source) as $key => $value) {
        if (!is_array($value)) {
            continue;
        }
        $normalized[$key] = [
            'key' => $key,
            'label' => trim((string) ($value['ten'] ?? $value['label'] ?? ($fallback[$key]['ten'] ?? $key))),
            'phicodinh' => floatval($value['phicodinh'] ?? 0),
            'heso' => floatval($value['heso'] ?? 1),
            'batdau' => trim((string) ($value['batdau'] ?? '')),
            'ketthuc' => trim((string) ($value['ketthuc'] ?? '')),
        ];
    }
    return $normalized;
}

function get_instant_surcharge_config() {
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }

    $pricingData = load_pricing_data_json();
    $raw = $pricingData['BAOGIACHITIET']['noidia']['phidichvu']['giaongaylaptuc'] ?? [];
    $weatherSource = isset($raw['thoitiet']) && is_array($raw['thoitiet']) ? $raw['thoitiet'] : $raw;
    $timeSource = isset($raw['thoigian']) && is_array($raw['thoigian']) ? $raw['thoigian'] : [];

    $fallbackWeather = [
        'macdinh' => ['ten' => 'Điều kiện bình thường', 'phicodinh' => 0, 'heso' => 1],
        'muanhe' => ['ten' => 'Mưa nhẹ / đường đông', 'phicodinh' => 10000, 'heso' => 1.03],
        'muato' => ['ten' => 'Mưa lớn / thời tiết xấu', 'phicodinh' => 20000, 'heso' => 1.08],
    ];
    $fallbackTime = [
        'sang_08_10' => ['ten' => 'Khung bình thường 08:00 - 10:00', 'batdau' => '08:00', 'ketthuc' => '10:00', 'phicodinh' => 0, 'heso' => 1],
        'sang_10_12' => ['ten' => 'Khung bình thường 10:00 - 12:00', 'batdau' => '10:00', 'ketthuc' => '12:00', 'phicodinh' => 0, 'heso' => 1],
        'trua_12_14' => ['ten' => 'Khung giờ bận 12:00 - 14:00', 'batdau' => '12:00', 'ketthuc' => '14:00', 'phicodinh' => 5000, 'heso' => 1],
        'chieu_14_16' => ['ten' => 'Khung bình thường 14:00 - 16:00', 'batdau' => '14:00', 'ketthuc' => '16:00', 'phicodinh' => 0, 'heso' => 1],
        'chieu_16_18' => ['ten' => 'Khung giờ bận 16:00 - 18:00', 'batdau' => '16:00', 'ketthuc' => '18:00', 'phicodinh' => 5000, 'heso' => 1],
        'toi_18_20' => ['ten' => 'Giờ cao điểm 18:00 - 20:00', 'batdau' => '18:00', 'ketthuc' => '20:00', 'phicodinh' => 15000, 'heso' => 1.08],
        'dem_20_22' => ['ten' => 'Tối muộn 20:00 - 22:00', 'batdau' => '20:00', 'ketthuc' => '22:00', 'phicodinh' => 25000, 'heso' => 1.15],
        'dem_22_06' => ['ten' => 'Đêm khuya 22:00 - 06:00', 'batdau' => '22:00', 'ketthuc' => '06:00', 'phicodinh' => 30000, 'heso' => 1.18],
    ];

    $cache = [
        'note' => trim((string) ($raw['ghichu'] ?? '')),
        'weather' => normalize_fee_rule_map(is_array($weatherSource) ? $weatherSource : [], $fallbackWeather),
        'time' => normalize_fee_rule_map(is_array($timeSource) ? $timeSource : [], $fallbackTime),
    ];
    return $cache;
}

function time_text_to_minutes($timeText) {
    $text = trim((string) $timeText);
    if ($text === '' || !preg_match('/^(\d{1,2}):(\d{2})$/', $text, $matches)) {
        return -1;
    }
    return intval($matches[1]) * 60 + intval($matches[2]);
}

function normalize_service_type($value) {
    $normalized = strtolower(trim((string) $value));
    $map = [
        'giao_ngay_lap_tuc' => 'instant',
        'giao_hoa_toc' => 'express',
        'giao_nhanh' => 'fast',
        'giao_tieu_chuan' => 'standard',
        'so_luong_lon' => 'bulk',
        'quoc_te_tiet_kiem' => 'intl_economy',
        'quoc_te_hoa_toc' => 'intl_express',
    ];
    return $map[$normalized] ?? $normalized;
}

function to_vn_service_code($value) {
    $normalized = normalize_service_type($value);
    $map = [
        'instant' => 'giao_ngay_lap_tuc',
        'express' => 'giao_hoa_toc',
        'fast' => 'giao_nhanh',
        'standard' => 'giao_tieu_chuan',
        'bulk' => 'so_luong_lon',
        'intl_economy' => 'quoc_te_tiet_kiem',
        'intl_express' => 'quoc_te_hoa_toc',
    ];
    return $map[$normalized] ?? $normalized;
}

function to_vn_weather_source($value) {
    $normalized = strtolower(trim((string) $value));
    $map = [
        'openmeteo_hourly' => 'du_lieu_thoi_tiet_theo_gio',
        'openmeteo_current' => 'du_lieu_thoi_tiet_hien_tai',
        'fallback' => 'du_lieu_tam_tinh',
    ];
    return $map[$normalized] ?? $normalized;
}

function http_get_json($url) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($body !== false && $httpCode >= 200 && $httpCode < 300) {
            $decoded = json_decode($body, true);
            if (is_array($decoded)) {
                return ['ok' => true, 'data' => $decoded];
            }
        }
        return ['ok' => false, 'message' => $error ?: 'HTTP ' . $httpCode];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 10,
            'header' => "Accept: application/json\r\n",
        ],
    ]);
    $body = @file_get_contents($url, false, $context);
    if ($body === false) {
        return ['ok' => false, 'message' => 'Không thể gọi API thời tiết.'];
    }
    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        return ['ok' => false, 'message' => 'Phản hồi thời tiết không hợp lệ.'];
    }
    return ['ok' => true, 'data' => $decoded];
}

function find_closest_openmeteo_hourly_index(array $hourlyTimes, $pickupAtUnix) {
    if ($pickupAtUnix <= 0 || empty($hourlyTimes)) {
        return -1;
    }

    $closestIndex = -1;
    $closestDiff = null;
    foreach ($hourlyTimes as $index => $timeText) {
        $ts = strtotime((string) $timeText);
        if ($ts === false || $ts <= 0) {
            continue;
        }
        $diff = abs($ts - $pickupAtUnix);
        if ($closestDiff === null || $diff < $closestDiff) {
            $closestDiff = $diff;
            $closestIndex = (int) $index;
        }
    }

    return $closestIndex;
}

function map_openmeteo_weather_condition(array $bucket) {
    $weatherCode = intval($bucket['weather_code'] ?? 0);
    $precipitation = floatval($bucket['precipitation'] ?? 0);
    $rain = floatval($bucket['rain'] ?? 0);
    $showers = floatval($bucket['showers'] ?? 0);
    $snowfall = floatval($bucket['snowfall'] ?? 0);
    $windSpeed = floatval($bucket['wind_speed_10m'] ?? 0);

    $thunderstormCodes = [95, 96, 99];
    $heavyRainCodes = [65, 67, 82];
    $lightRainCodes = [51, 53, 55, 56, 57, 61, 63, 66, 80, 81];
    $snowCodes = [71, 73, 75, 77, 85, 86];

    if (
        in_array($weatherCode, $thunderstormCodes, true) ||
        in_array($weatherCode, $heavyRainCodes, true) ||
        in_array($weatherCode, $snowCodes, true) ||
        $precipitation >= 3 ||
        $rain >= 3 ||
        $showers >= 3 ||
        $snowfall >= 1 ||
        $windSpeed >= 36
    ) {
        return [
            'condition_key' => 'muato',
            'condition_label' => 'Mưa lớn / thời tiết xấu',
            'summary' => 'Đã cộng phụ phí thời tiết xấu',
        ];
    }

    if (
        in_array($weatherCode, $lightRainCodes, true) ||
        $precipitation > 0 ||
        $rain > 0 ||
        $showers > 0
    ) {
        return [
            'condition_key' => 'muanhe',
            'condition_label' => 'Mưa nhẹ / đường đông',
            'summary' => 'Đã cộng phụ phí mưa nhẹ',
        ];
    }

    return [
        'condition_key' => 'macdinh',
        'condition_label' => 'Thời tiết bình thường',
        'summary' => 'Chưa phát sinh phụ phí thời tiết',
    ];
}

function pick_openmeteo_bucket(array $payload, $pickupAtUnix) {
    $current = isset($payload['current']) && is_array($payload['current']) ? $payload['current'] : [];
    $hourly = isset($payload['hourly']) && is_array($payload['hourly']) ? $payload['hourly'] : [];
    $hourlyTimes = isset($hourly['time']) && is_array($hourly['time']) ? $hourly['time'] : [];
    $hourlyIndex = find_closest_openmeteo_hourly_index($hourlyTimes, $pickupAtUnix);
    if ($hourlyIndex >= 0) {
        return [
            [
                'weather_code' => $hourly['weather_code'][$hourlyIndex] ?? null,
                'precipitation' => $hourly['precipitation'][$hourlyIndex] ?? null,
                'rain' => $hourly['rain'][$hourlyIndex] ?? null,
                'showers' => $hourly['showers'][$hourlyIndex] ?? null,
                'snowfall' => $hourly['snowfall'][$hourlyIndex] ?? null,
                'wind_speed_10m' => $hourly['wind_speed_10m'][$hourlyIndex] ?? null,
            ],
            'openmeteo_hourly',
        ];
    }

    return [$current, 'openmeteo_current'];
}

function get_openmeteo_forecast_days($pickupAtUnix) {
    $now = time();
    if ($pickupAtUnix <= 0) {
        return 3;
    }
    $daysAhead = (int) ceil(($pickupAtUnix - $now) / 86400);
    if ($daysAhead <= 1) {
        return 2;
    }
    if ($daysAhead <= 3) {
        return 3;
    }
    return min(7, max(3, $daysAhead + 1));
}

function get_weather_quote_data($conn, $lat, $lng, $pickupAtUnix, $mode = 'instant') {
    $fallback = [
        'condition_key' => 'macdinh',
        'condition_label' => 'Thời tiết bình thường',
        'summary' => 'Tạm tính theo điều kiện thời tiết bình thường',
        'note' => 'Chưa lấy được dữ liệu thời tiết tự động từ Open-Meteo.',
        'source' => 'fallback',
        'checked_at' => date('Y-m-d H:i'),
        'effective_at' => date('Y-m-d H:i', $pickupAtUnix),
        'is_fallback' => true,
        'mode' => $mode,
    ];

    $forecastDays = get_openmeteo_forecast_days($pickupAtUnix);
    $url = sprintf(
        'https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&timezone=Asia/Bangkok&forecast_days=%s&current=weather_code,precipitation,rain,showers,wind_speed_10m&hourly=weather_code,precipitation,rain,showers,snowfall,wind_speed_10m',
        rawurlencode((string) $lat),
        rawurlencode((string) $lng),
        rawurlencode((string) $forecastDays)
    );
    $response = http_get_json($url);
    if (!$response['ok']) {
        $fallback['note'] = 'Không gọi được Open-Meteo: ' . ($response['message'] ?? 'Lỗi không xác định.');
        return $fallback;
    }

    [$bucket, $source] = pick_openmeteo_bucket($response['data'], $pickupAtUnix);
    $mapped = map_openmeteo_weather_condition($bucket);
    return array_merge($fallback, $mapped, [
        'note' => $mapped['condition_key'] === 'macdinh'
            ? 'Hệ thống tự kiểm tra thời tiết tại điểm lấy hàng. Hiện chưa cần cộng phụ phí thời tiết.'
            : 'Hệ thống đã tự lấy dữ liệu Open-Meteo để cộng phụ phí thời tiết. Khách hàng không cần chọn tay.',
        'source' => $source,
        'is_fallback' => false,
    ]);
}

function get_service_condition_fee_config($conditionKey) {
    $config = get_instant_surcharge_config();
    $weather = $config['weather'] ?? [];
    $normalizedKey = strtolower(trim((string) $conditionKey));
    return $weather[$normalizedKey] ?? ($weather['macdinh'] ?? ['phicodinh' => 0, 'heso' => 1, 'label' => 'Điều kiện bình thường']);
}

function get_instant_time_fee_config($pickupAtUnix) {
    $config = get_instant_surcharge_config();
    $rules = array_values($config['time'] ?? []);
    $fallback = end($rules);
    if (!is_array($fallback)) {
        $fallback = ['phicodinh' => 0, 'heso' => 1, 'label' => 'Khung thời gian hiện tại'];
    }

    $targetMinutes = intval(date('G', $pickupAtUnix)) * 60 + intval(date('i', $pickupAtUnix));
    foreach ($rules as $rule) {
        $start = time_text_to_minutes($rule['batdau'] ?? '');
        $end = time_text_to_minutes($rule['ketthuc'] ?? '');
        if ($start < 0 || $end < 0) {
            continue;
        }
        if ($end <= $start) {
            if ($targetMinutes >= $start || $targetMinutes < $end) {
                return $rule;
            }
            continue;
        }
        if ($targetMinutes >= $start && $targetMinutes < $end) {
            return $rule;
        }
    }

    if ($targetMinutes < 8 * 60) {
        foreach ($rules as $rule) {
            if (strpos((string) ($rule['key'] ?? ''), 'dem_22_06') !== false) {
                return $rule;
            }
        }
    }

    return $fallback;
}

function calculate_surcharge_fee($transportSubtotal, array $config) {
    $heSo = floatval($config['heso'] ?? 1);
    $phiCoDinh = floatval($config['phicodinh'] ?? 0);
    return ($transportSubtotal * max($heSo - 1, 0)) + $phiCoDinh;
}

function apply_server_side_instant_pricing(&$data, &$shippingFee, $conn) {
    $serviceType = normalize_service_type($data['service'] ?? '');
    if ($serviceType !== 'instant') {
        return;
    }

    $pickupLat = floatval($data['pickup_lat'] ?? 0);
    $pickupLng = floatval($data['pickup_lng'] ?? 0);
    $pickupAtUnix = time();

    $weatherQuote = get_weather_quote_data($conn, $pickupLat, $pickupLng, $pickupAtUnix, 'instant');
    $conditionConfig = get_service_condition_fee_config($weatherQuote['condition_key']);
    $timeConfig = get_instant_time_fee_config($pickupAtUnix);
    $data['service_condition_key'] = $weatherQuote['condition_key'];
    $data['service_condition_label'] = trim((string) ($conditionConfig['label'] ?? $weatherQuote['condition_label'] ?? 'Thời tiết bình thường'));
    $data['time_surcharge_key'] = trim((string) ($timeConfig['key'] ?? ''));
    $data['time_surcharge_label'] = trim((string) ($timeConfig['label'] ?? ''));
    $data['weather_source'] = to_vn_weather_source($weatherQuote['source']);
    $data['weather_note'] = $weatherQuote['note'];

    $breakdown = isset($data['pricing_breakdown']) && is_array($data['pricing_breakdown'])
        ? $data['pricing_breakdown']
        : [];
    if (array_key_exists('don_gia_km', $breakdown)) {
        return;
    }
    $transportSubtotal = floatval(($breakdown['tong_gia_van_chuyen'] ?? ($breakdown['basePrice'] ?? 0)))
        + floatval($breakdown['weightFee'] ?? 0)
        + floatval($breakdown['goodsFee'] ?? 0);

    if ($transportSubtotal <= 0) {
        return;
    }

    $serverTimeFee = round(calculate_surcharge_fee($transportSubtotal, $timeConfig));
    $serverConditionFee = round(calculate_surcharge_fee($transportSubtotal, $conditionConfig));

    $existingTimeFee = floatval($breakdown['timeFee'] ?? 0);
    $existingConditionFee = floatval($breakdown['conditionFee'] ?? 0);
    $shippingFee += ($serverTimeFee - $existingTimeFee) + ($serverConditionFee - $existingConditionFee);
    $shippingFee = max(0, $shippingFee);

    $data['pricing_breakdown']['timeFee'] = $serverTimeFee;
    $data['pricing_breakdown']['conditionFee'] = $serverConditionFee;
    $data['pricing_breakdown']['serviceFee'] = $serverTimeFee + $serverConditionFee;
    $data['total_fee'] = $shippingFee;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'weather_quote') {
    $lat = floatval($_GET['lat'] ?? 0);
    $lng = floatval($_GET['lng'] ?? 0);
    $mode = trim((string) ($_GET['mode'] ?? 'instant'));
    $pickupAt = trim((string) ($_GET['pickup_at'] ?? ''));

    if (!$lat || !$lng) {
        json_response(['success' => false, 'message' => 'Thiếu tọa độ để kiểm tra thời tiết.'], 400);
    }

    $pickupAtUnix = $pickupAt !== '' ? strtotime($pickupAt) : time();
    if (!$pickupAtUnix) {
        $pickupAtUnix = time();
    }

    json_response([
        'success' => true,
        'data' => get_weather_quote_data($conn, $lat, $lng, $pickupAtUnix, $mode),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'prefill') {
    if (!isset($_SESSION['user_id'])) {
        json_response(['success' => false, 'message' => 'Vui lòng đăng nhập để dùng tính năng tự điền.'], 401);
    }
    $userId = intval($_SESSION['user_id']);
    json_response([
        'success' => true,
        'data' => get_booking_prefill($conn, $userId),
    ]);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['reorder_id'])) {
    if (!isset($_SESSION['user_id'])) {
        json_response(['success' => false, 'message' => 'Vui lòng đăng nhập để đặt lại đơn cũ.'], 401);
    }
    $reorderId = intval($_GET['reorder_id']);
    if ($reorderId <= 0) {
        json_response(['success' => false, 'message' => 'Mã đơn đặt lại không hợp lệ.'], 400);
    }

    $userId = intval($_SESSION['user_id']);
    $stmt = $conn->prepare("
        SELECT id, ma_don_hang AS order_code, ten_nguoi_gui AS name, so_dien_thoai_nguoi_gui AS phone, ten_nguoi_nhan AS receiver_name, so_dien_thoai_nguoi_nhan AS receiver_phone,
               dia_chi_lay_hang AS pickup_address, dia_chi_giao_hang AS delivery_address, loai_dich_vu AS service_type, loai_phuong_tien AS vehicle_type,
               loai_goi_hang AS package_type, tong_can_nang AS weight, so_tien_cod AS cod_amount, ghi_chu AS note, phuong_thuc_thanh_toan AS payment_method
        FROM don_hang
        WHERE id = ? AND nguoi_dung_id = ?
        LIMIT 1
    ");
    $stmt->bind_param("ii", $reorderId, $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $order = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    if (!$order) {
        json_response(['success' => false, 'message' => 'Không tìm thấy đơn hàng để đặt lại.'], 404);
    }

    $itemType = map_package_type_to_item_type($order['package_type'] ?? '');
    $itemStmt = $conn->prepare("
        SELECT ten_mat_hang AS item_name, so_luong AS quantity, can_nang AS weight, chieu_dai AS length, chieu_rong AS width, chieu_cao AS height, gia_tri_khai_bao AS declared_value
        FROM don_hang_mat_hang
        WHERE don_hang_id = ?
        ORDER BY id ASC
    ");
    if (!$itemStmt) {
        json_response([
            'success' => false,
            'message' => 'Không thể tải chi tiết hàng hóa của đơn cũ. Có thể bảng order_items trong database chưa được cập nhật.',
        ], 500);
    }
    $itemStmt->bind_param("i", $reorderId);
    $itemStmt->execute();
    $itemsResult = $itemStmt->get_result();
    $items = [];
    while ($row = $itemsResult->fetch_assoc()) {
        $items[] = [
            'loai_hang' => $itemType,
            'ten_hang' => $row['item_name'] ?? 'Hàng hóa',
            'so_luong' => max(1, intval($row['quantity'] ?? 1)),
            'gia_tri_khai_bao' => floatval($row['declared_value'] ?? 0),
            'can_nang' => max(0.1, floatval($row['weight'] ?? 0.1)),
            'chieu_dai' => max(0, floatval($row['length'] ?? 0)),
            'chieu_rong' => max(0, floatval($row['width'] ?? 0)),
            'chieu_cao' => max(0, floatval($row['height'] ?? 0)),
        ];
    }
    $itemStmt->close();

    if (empty($items)) {
        $items[] = [
            'loai_hang' => $itemType,
            'ten_hang' => 'Hàng hóa',
            'so_luong' => 1,
            'gia_tri_khai_bao' => 0,
            'can_nang' => max(0.1, floatval($order['weight'] ?? 0.1)),
            'chieu_dai' => 0,
            'chieu_rong' => 0,
            'chieu_cao' => 0,
        ];
    }

    $noteData = extract_reorder_note_and_fee_payer($order['note'] ?? '');
    json_response([
        'success' => true,
        'data' => with_booking_reorder_aliases([
            'source_order_id' => intval($order['id']),
            'source_order_code' => $order['order_code'] ?? '',
            'sender_name' => $order['name'] ?? '',
            'sender_phone' => $order['phone'] ?? '',
            'receiver_name' => $order['receiver_name'] ?? '',
            'receiver_phone' => $order['receiver_phone'] ?? '',
            'pickup_address' => $order['pickup_address'] ?? '',
            'delivery_address' => $order['delivery_address'] ?? '',
            'service_type' => $order['service_type'] ?? '',
            'vehicle' => normalize_reorder_vehicle_key($order['vehicle_type'] ?? ''),
            'payment_method' => normalize_reorder_payment_method($order['payment_method'] ?? ''),
            'fee_payer' => $noteData['fee_payer'],
            'cod_value' => floatval($order['cod_amount'] ?? 0),
            'notes' => $noteData['note'],
            'items' => $items,
        ]),
    ]);
}

// Nhận dữ liệu JSON hoặc multipart từ Client
$data = null;
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (strpos($contentType, 'multipart/form-data') !== false) {
    $payload = trim((string) ($_POST['payload'] ?? ''));
    if ($payload !== '') {
        $data = json_decode($payload, true);
    }
} else {
    $json = file_get_contents('php://input');
    if ($json !== false && trim($json) !== '') {
        $data = json_decode($json, true);
    }
}

if (!is_array($data)) {
    json_response(['success' => false, 'message' => 'Dữ liệu không hợp lệ.'], 400);
}

$data = normalize_booking_payload($data);

$conn->begin_transaction();

try {
    $user_id = isset($_SESSION['user_id']) ? intval($_SESSION['user_id']) : null;
    $order_code = 'TMP' . date('YmdHis') . '-' . bin2hex(random_bytes(3));
    
    // Thu thập các thông tin cơ bản
    $name = $data['sender_name'] ?? '';
    $phone = $data['sender_phone'] ?? '';
    $pickup_address = $data['search_pickup'] ?? '';
    $receiver_name = $data['receiver_name'] ?? '';
    $receiver_phone = $data['receiver_phone'] ?? '';
    $delivery_address = $data['search_delivery'] ?? '';
    
    $service_type_raw = $data['service'] ?? '';
    $vehicle_type = first_non_empty_value($data['vehicle_label'] ?? '', $data['vehicle'] ?? '');
    $shipping_fee = floatval($data['total_fee'] ?? 0);
    $cod_amount = floatval($data['cod_value'] ?? 0);
    apply_server_side_instant_pricing($data, $shipping_fee, $conn);
    $service_type_internal = normalize_service_type($service_type_raw);
    $data['service'] = to_vn_service_code($service_type_internal);
    $service_type = $data['service'];
    $data['weather_source'] = to_vn_weather_source($data['weather_source'] ?? '');
    $note = build_structured_order_note($data, $data['notes'] ?? '');
    $service_meta_json = encode_json_for_db(build_service_meta_record($data));
    $pricing_breakdown_json = encode_json_for_db(build_pricing_breakdown_record($data, $shipping_fee));
    $booking_payload_json = encode_json_for_db($data);
    $payment_method = normalize_db_payment_method($data['payment_method'] ?? 'cod');
    
    // Thời gian lấy hàng
    $pickup_date = $data['pickup_date'] ?? date('Y-m-d');
    $pickup_slot = $data['pickup_slot'] ?? '';
    $pickup_slot_label = first_non_empty_value($data['pickup_slot_label'] ?? '', $pickup_slot);
    $pickup_time_str = build_slot_datetime($pickup_date, $pickup_slot_label, '08:00');
    if ($pickup_time_str === null) {
        $pickup_time_str = date('Y-m-d H:i:s');
    }

    $pickup_lat = round((float) ($data['pickup_lat'] ?? 0), 8);
    $pickup_lng = round((float) ($data['pickup_lng'] ?? 0), 8);
    $delivery_lat = round((float) ($data['delivery_lat'] ?? 0), 8);
    $delivery_lng = round((float) ($data['delivery_lng'] ?? 0), 8);
    $service_condition_key = trim((string) ($data['service_condition_key'] ?? ''));
    $distance_km = round((float) ($data['khoang_cach_km'] ?? 0), 2);
    $requested_delivery_time = build_slot_datetime(
        $data['delivery_date'] ?? '',
        first_non_empty_value($data['delivery_slot_label'] ?? '', $data['delivery_slot'] ?? ''),
        '09:00'
    );
    $estimated_delivery = build_estimated_delivery_datetime($data, $pickup_time_str);
    $weather_source = trim((string) ($data['weather_source'] ?? ''));
    $weather_note = trim((string) ($data['weather_note'] ?? ''));
    
    // Tính tổng trọng lượng
    $total_weight = 0;
    if (isset($data['items']) && is_array($data['items'])) {
        foreach ($data['items'] as $item) {
            $qty = max(1, intval($item['so_luong'] ?? 1));
            $total_weight += floatval($item['can_nang'] ?? 0) * $qty;
        }
    }

    $kiem_tra_xe_may = kiem_tra_hang_hoa_xe_may($data['items'] ?? [], $vehicle_type);
    if (!$kiem_tra_xe_may['hop_le']) {
        $conn->rollback();
        json_response([
            'success' => false,
            'message' => $kiem_tra_xe_may['ly_do'],
        ], 422);
    }

    // Insert order chính
    $sql = "INSERT INTO don_hang (
                ma_don_hang, nguoi_dung_id, dia_chi_lay_hang, vi_do_lay_hang, kinh_do_lay_hang, ten_nguoi_gui, so_dien_thoai_nguoi_gui,
                ten_nguoi_nhan, so_dien_thoai_nguoi_nhan, dia_chi_giao_hang, vi_do_giao_hang, kinh_do_giao_hang,
                loai_dich_vu, ma_dieu_kien_dich_vu, loai_phuong_tien, khoang_cach_km, tong_can_nang, so_tien_cod,
                phi_van_chuyen, thoi_gian_lay_hang, thoi_gian_giao_hang_yeu_cau, thoi_gian_giao_hang_du_kien, ghi_chu,
                du_lieu_dich_vu_json, chi_tiet_gia_json, du_lieu_dat_lich_json,
                nguon_thoi_tiet, ghi_chu_thoi_tiet, phuong_thuc_thanh_toan, trang_thai, tao_luc
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Không thể tạo câu lệnh lưu đơn hàng: " . $conn->error);
    }
    $stmt->bind_param("sisddsssssddsssddddssssssssss", 
        $order_code, $user_id, $pickup_address, $pickup_lat, $pickup_lng, $name, $phone,
        $receiver_name, $receiver_phone, $delivery_address, $delivery_lat, $delivery_lng,
        $service_type, $service_condition_key, $vehicle_type, $distance_km, $total_weight, $cod_amount,
        $shipping_fee, $pickup_time_str, $requested_delivery_time, $estimated_delivery, $note,
        $service_meta_json, $pricing_breakdown_json, $booking_payload_json,
        $weather_source, $weather_note, $payment_method
    );

    if (!$stmt->execute()) {
        throw new Exception("Lỗi khi tạo đơn hàng chính: " . $stmt->error);
    }

    $order_id = $conn->insert_id;
    $order_code = build_system_order_code($order_id);
    if ($order_code === '') {
        throw new Exception("Không thể tạo mã đơn hàng từ ID hệ thống.");
    }

    $updateCodeStmt = $conn->prepare("UPDATE don_hang SET ma_don_hang = ? WHERE id = ? LIMIT 1");
    if (!$updateCodeStmt) {
        throw new Exception("Không thể cập nhật mã đơn hàng: " . $conn->error);
    }
    $updateCodeStmt->bind_param("si", $order_code, $order_id);
    if (!$updateCodeStmt->execute()) {
        throw new Exception("Không thể cập nhật mã đơn hàng: " . $updateCodeStmt->error);
    }
    $updateCodeStmt->close();

    // Insert chi tiết món hàng
    if (isset($data['items']) && is_array($data['items'])) {
        $item_sql = "INSERT INTO don_hang_mat_hang (
                        don_hang_id, ten_mat_hang, so_luong, can_nang,
                        chieu_dai, chieu_rong, chieu_cao, gia_tri_khai_bao
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $item_stmt = $conn->prepare($item_sql);
        if (!$item_stmt) {
            throw new Exception("Không thể lưu chi tiết hàng hóa. Có thể bảng order_items trong database chưa được cập nhật.");
        }
        
        foreach ($data['items'] as $item) {
            $item_name = first_non_empty_value($item['ten_hang'] ?? '', 'Hàng hóa');
            $qty = max(1, intval($item['so_luong'] ?? 1));
            $w = floatval($item['can_nang'] ?? 0);
            $l = floatval($item['chieu_dai'] ?? 0);
            $wd = floatval($item['chieu_rong'] ?? 0);
            $h = floatval($item['chieu_cao'] ?? 0);
            $decl = floatval($item['gia_tri_khai_bao'] ?? 0);

            $item_stmt->bind_param("isiddddd", 
                $order_id, $item_name, $qty, $w, 
                $l, $wd, $h, $decl
            );
            if (!$item_stmt->execute()) {
                throw new Exception("Lỗi khi lưu chi tiết hàng hóa: " . $item_stmt->error);
            }
        }
        $item_stmt->close();
    }

    save_recent_pickup_address($conn, $user_id, $name, $phone, $pickup_address);

    $uploadDir = dirname(__DIR__) . '/public/uploads/order_attachments/' . $order_code;
    $uploadedMedia = save_upload_group('goods_media', $uploadDir, [
        'jpg',
        'jpeg',
        'png',
        'webp',
        'gif',
        'bmp',
        'heic',
        'mp4',
        'mov',
        'webm',
        'm4v',
        'avi',
        'mkv',
    ]);

    $googleSheetsSync = sync_order_to_google_sheets($conn, [
        'order_id' => $order_id,
        'order_code' => $order_code,
        'created_at' => date('Y-m-d H:i:s'),
        'sender_name' => $name,
        'sender_phone' => $phone,
        'receiver_name' => $receiver_name,
        'receiver_phone' => $receiver_phone,
        'pickup_address' => $pickup_address,
        'delivery_address' => $delivery_address,
        'service_type' => $service_type,
        'vehicle_type' => $vehicle_type,
        'distance_km' => $distance_km,
        'total_weight' => $total_weight,
        'cod_amount' => $cod_amount,
        'shipping_fee' => $shipping_fee,
        'pickup_time' => $pickup_time_str,
        'requested_delivery_time' => $requested_delivery_time,
        'estimated_delivery' => $estimated_delivery,
        'payment_method' => $payment_method,
        'service_condition_key' => $service_condition_key,
        'weather_source' => $weather_source,
        'weather_note' => $weather_note,
        'items' => $data['items'] ?? [],
        'uploaded_files' => $uploadedMedia,
        'booking_payload' => $data,
    ]);

    $conn->commit();
    json_response([
        'success' => true, 
        'message' => 'Đặt đơn hàng thành công!',
        'order_id' => $order_id,
        'order_code' => $order_code,
        'ma_don_hang' => $order_code,
        'uploaded_files' => $uploadedMedia,
        'tep_da_tai_len' => $uploadedMedia,
        'google_sheets_synced' => (bool) ($googleSheetsSync['synced'] ?? false),
        'google_sheets_configured' => (bool) ($googleSheetsSync['configured'] ?? false),
    ]);

} catch (Exception $e) {
    $conn->rollback();
    json_response([
        'success' => false, 
        'message' => $e->getMessage()
    ], 500);
}
