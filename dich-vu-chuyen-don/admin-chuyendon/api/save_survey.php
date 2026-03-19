<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method Not Allowed']);
    exit;
}

require_once '../config/db.php';

function json_error($message, $statusCode = 400) {
    http_response_code($statusCode);
    echo json_encode(['status' => 'error', 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function normalize_uploads($files) {
    $normalized = [];
    if (!isset($files['name']) || !is_array($files['name'])) {
      return $normalized;
    }

    $count = count($files['name']);
    for ($i = 0; $i < $count; $i++) {
        if (($files['error'][$i] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        $normalized[] = [
            'name' => $files['name'][$i] ?? '',
            'type' => $files['type'][$i] ?? '',
            'tmp_name' => $files['tmp_name'][$i] ?? '',
            'error' => $files['error'][$i] ?? UPLOAD_ERR_NO_FILE,
            'size' => $files['size'][$i] ?? 0,
        ];
    }

    return $normalized;
}

$serviceLabels = [
    'moving_house' => 'Chuyển nhà trọn gói',
    'moving_office' => 'Chuyển văn phòng',
    'moving_warehouse' => 'Chuyển kho bãi',
];

$timeSlotLabels = [
    'sang' => 'Sáng (08:00 - 11:30)',
    'chieu' => 'Chiều (13:30 - 17:00)',
    'toi' => 'Tối (Sau 17:00)',
    'bat-ky' => 'Bất cứ lúc nào (Linh động)',
];

$service_type = isset($_POST['service_type']) ? trim($_POST['service_type']) : '';
$customer_name = isset($_POST['name']) ? trim($_POST['name']) : '';
$customer_phone = isset($_POST['phone']) ? trim($_POST['phone']) : '';
$survey_address = isset($_POST['survey_address']) ? trim($_POST['survey_address']) : '';
$survey_lat = isset($_POST['survey_lat']) ? trim($_POST['survey_lat']) : '';
$survey_lng = isset($_POST['survey_lng']) ? trim($_POST['survey_lng']) : '';
$survey_date = isset($_POST['moving_survey_date']) ? trim($_POST['moving_survey_date']) : '';
$survey_time_slot = isset($_POST['moving_survey_time_slot']) ? trim($_POST['moving_survey_time_slot']) : '';
$survey_fee = isset($_POST['survey_fee']) ? floatval($_POST['survey_fee']) : 50000;
$note = isset($_POST['note']) ? trim($_POST['note']) : '';

if (!$customer_name || !$customer_phone || !$service_type || !$survey_address || !$survey_date || !$survey_time_slot) {
    json_error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
}

if (!isset($serviceLabels[$service_type])) {
    json_error('Loại dịch vụ không hợp lệ.');
}

if (!preg_match('/^0\d{9,10}$/', $customer_phone)) {
    json_error('Số điện thoại không hợp lệ.');
}

if (!isset($timeSlotLabels[$survey_time_slot])) {
    json_error('Khung giờ khảo sát không hợp lệ.');
}

$dateObj = DateTime::createFromFormat('Y-m-d', $survey_date);
$dateErrors = DateTime::getLastErrors();
if (
    !$dateObj ||
    ($dateErrors && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
) {
    json_error('Ngày khảo sát không hợp lệ.');
}

$today = new DateTime('today');
if ($dateObj < $today) {
    json_error('Không thể đặt khảo sát cho ngày trong quá khứ.');
}

$service_details = [
    'service_type' => $service_type,
    'service_label' => $serviceLabels[$service_type],
    'survey_address' => $survey_address,
    'survey_lat' => $survey_lat,
    'survey_lng' => $survey_lng,
    'survey_date' => $survey_date,
    'survey_time_slot' => $survey_time_slot,
    'survey_time_slot_label' => $timeSlotLabels[$survey_time_slot],
    'contact' => [
        'name' => $customer_name,
        'phone' => $customer_phone,
    ],
];

if ($service_type === 'moving_house') {
    $service_details['house'] = [
        'house_type' => isset($_POST['survey_house_type']) ? trim($_POST['survey_house_type']) : '',
        'floors' => isset($_POST['survey_house_floors']) ? trim($_POST['survey_house_floors']) : '',
        'has_elevator' => isset($_POST['survey_elevator']),
        'truck_access' => isset($_POST['survey_house_truck']),
    ];
}

if ($service_type === 'moving_office') {
    $service_details['office'] = [
        'staff_count' => isset($_POST['survey_office_staff']) ? intval($_POST['survey_office_staff']) : 0,
        'area' => isset($_POST['survey_office_area']) ? trim($_POST['survey_office_area']) : '',
        'complex_it' => isset($_POST['survey_office_it']),
        'needs_dismantle' => isset($_POST['survey_office_dismantle']),
    ];
}

if ($service_type === 'moving_warehouse') {
    $service_details['warehouse'] = [
        'warehouse_type' => isset($_POST['survey_warehouse_type']) ? trim($_POST['survey_warehouse_type']) : '',
        'estimated_volume' => isset($_POST['survey_warehouse_vol']) ? trim($_POST['survey_warehouse_vol']) : '',
        'needs_crane' => isset($_POST['survey_warehouse_crane']),
        'needs_wrapping' => isset($_POST['survey_warehouse_wrapping']),
    ];
}

$uploadedFilesMeta = [];
$uploads = isset($_FILES['survey_files']) ? normalize_uploads($_FILES['survey_files']) : [];
if (count($uploads) > 8) {
    json_error('Chỉ được tải tối đa 8 tệp cho một yêu cầu khảo sát.');
}

if (!empty($uploads)) {
    $uploadRoot = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'surveys';
    if (!is_dir($uploadRoot) && !mkdir($uploadRoot, 0775, true) && !is_dir($uploadRoot)) {
        json_error('Không thể tạo thư mục lưu tệp khảo sát.', 500);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    foreach ($uploads as $file) {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            json_error('Có tệp tải lên bị lỗi.');
        }

        if (($file['size'] ?? 0) > 15 * 1024 * 1024) {
            json_error('Mỗi tệp tải lên phải nhỏ hơn hoặc bằng 15MB.');
        }

        $detectedMime = $finfo ? finfo_file($finfo, $file['tmp_name']) : ($file['type'] ?? '');
        if (strpos($detectedMime, 'image/') !== 0 && strpos($detectedMime, 'video/') !== 0) {
            json_error('Chỉ chấp nhận tệp hình ảnh hoặc video.');
        }

        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $safeBaseName = preg_replace('/[^A-Za-z0-9_-]/', '-', pathinfo($file['name'], PATHINFO_FILENAME));
        $safeBaseName = trim($safeBaseName, '-');
        if ($safeBaseName === '') {
            $safeBaseName = 'survey-file';
        }

        $storedName = uniqid('survey_', true) . '_' . $safeBaseName;
        if ($extension !== '') {
            $storedName .= '.' . $extension;
        }

        $destination = $uploadRoot . DIRECTORY_SEPARATOR . $storedName;
        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            json_error('Không thể lưu tệp đính kèm.', 500);
        }

        $uploadedFilesMeta[] = [
            'original_name' => $file['name'],
            'stored_name' => $storedName,
            'mime_type' => $detectedMime,
            'size' => intval($file['size']),
            'path' => 'admin-chuyendon/uploads/surveys/' . $storedName,
        ];
    }

    if ($finfo) {
        finfo_close($finfo);
    }
}

if (!empty($uploadedFilesMeta)) {
    $service_details['uploaded_files'] = $uploadedFilesMeta;
}

$order_code = 'MVS-SV-' . date('Ymd') . '-' . strtoupper(substr(uniqid(), -4));
$delivery_address = 'Khảo sát tại địa chỉ khách cung cấp';
$service_details_json = json_encode(
    $service_details,
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);

try {
    $stmt = $conn->prepare("INSERT INTO chuyen_don_orders
        (order_code, service_type, customer_name, customer_phone, pickup_address, delivery_address, survey_date, survey_time_slot, survey_fee, service_details, note, status)
        VALUES
        (:order_code, :service_type, :customer_name, :customer_phone, :pickup_address, :delivery_address, :survey_date, :survey_time_slot, :survey_fee, :service_details, :note, 'pending_survey')");

    $stmt->bindParam(':order_code', $order_code);
    $stmt->bindParam(':service_type', $service_type);
    $stmt->bindParam(':customer_name', $customer_name);
    $stmt->bindParam(':customer_phone', $customer_phone);
    $stmt->bindParam(':pickup_address', $survey_address);
    $stmt->bindParam(':delivery_address', $delivery_address);
    $stmt->bindParam(':survey_date', $survey_date);
    $stmt->bindParam(':survey_time_slot', $survey_time_slot);
    $stmt->bindParam(':survey_fee', $survey_fee);
    $stmt->bindParam(':service_details', $service_details_json);
    $stmt->bindParam(':note', $note);

    if (!$stmt->execute()) {
        json_error('Có lỗi xảy ra khi lưu yêu cầu khảo sát.', 500);
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Đặt lịch khảo sát thành công!',
        'order_code' => $order_code,
    ], JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    json_error('Lỗi hệ thống: ' . $e->getMessage(), 500);
}
