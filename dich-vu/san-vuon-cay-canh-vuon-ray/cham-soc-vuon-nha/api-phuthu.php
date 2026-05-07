<?php
declare(strict_types=1);
/**
 * api-phuthu.php
 * Endpoint công khai: trả về danh sách phụ thu từ bảng phu_thu_dac_biet (admin)
 * Được gọi bởi trang đặt lịch (dat-lich.html)
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/admin/admin_api_common.php';

$result = admin_api_list_table('phu_thu_dac_biet');

if ($result['error'] !== '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $result['error']], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['success' => true, 'data' => $result['rows']], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
