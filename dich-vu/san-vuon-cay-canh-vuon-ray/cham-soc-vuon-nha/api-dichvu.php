<?php
declare(strict_types=1);
/**
 * api-dichvu.php
 * Endpoint công khai: trả về danh sách dịch vụ từ dữ liệu admin (data_dichvu.json)
 * Được gọi bởi trang đặt lịch (dat-lich.html)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/admin/get_dichvu.php';

$result = get_dichvu_data();

if ($result['error'] !== '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $result['error']], JSON_UNESCAPED_UNICODE);
    exit;
}

// Khung giờ mặc định nếu dịch vụ không có time_slots riêng
$defaultTimeSlots = [
    ['value' => '06:00-08:00', 'label' => 'Sáng sớm (06:00 - 08:00)'],
    ['value' => '08:00-10:00', 'label' => 'Sáng (08:00 - 10:00)'],
    ['value' => '10:00-12:00', 'label' => 'Trưa (10:00 - 12:00)'],
    ['value' => '13:00-15:00', 'label' => 'Chiều sớm (13:00 - 15:00)'],
    ['value' => '15:00-17:00', 'label' => 'Chiều (15:00 - 17:00)'],
    ['value' => '17:00-19:00', 'label' => 'Chiều tối (17:00 - 19:00)'],
];

// Chỉ trả về các dịch vụ đang active, bổ sung time_slots mặc định nếu rỗng
$rows = array_values(array_filter($result['rows'], fn($s) => $s['is_active'] !== false));
$rows = array_map(function ($s) use ($defaultTimeSlots) {
    if (empty($s['time_slots'])) {
        $s['time_slots'] = $defaultTimeSlots;
    }
    return $s;
}, $rows);

echo json_encode(['success' => true, 'data' => $rows], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
