<?php
declare(strict_types=1);

/**
 * File này dùng chung cho Admin của Dịch Vụ Thuê Tài Xế Lái Xe Hộ
 * KẾT NỐI API dvqt.vn - KHÔNG DÙNG MYSQL LOCAL
 */

// URL API dvqt.vn
define('API_BASE_URL', 'https://api.dvqt.vn');

/**
 * Gọi API dvqt.vn với payload JSON
 */
function callApi(string $endpoint, array $payload): array
{
    $url = API_BASE_URL . $endpoint;
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE);
    
    if ($json === false) {
        return ['success' => false, 'message' => 'Không thể mã hóa JSON'];
    }
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => $json,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 30,
    ]);
    
    $raw = curl_exec($ch);
    $error = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($raw === false) {
        return ['success' => false, 'message' => 'Lỗi CURL: ' . $error];
    }
    
    if ($httpCode >= 400) {
        return ['success' => false, 'message' => 'HTTP ' . $httpCode . ': ' . $raw];
    }
    
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) {
        return ['success' => false, 'message' => 'Phản hồi không hợp lệ'];
    }
    
    if (!empty($decoded['error']) || (isset($decoded['success']) && $decoded['success'] === false)) {
        return ['success' => false, 'message' => $decoded['error'] ?? $decoded['message'] ?? 'Lỗi API'];
    }
    
    return ['success' => true, 'data' => $decoded];
}

// Lấy danh sách từ bảng
if (!function_exists('admin_api_list_table')) {
    function admin_api_list_table(string $table): array
    {
        $allowedTables = ['admin', 'khachhang', 'taixe', 'datlich_taixe', 'dichvu_taixe', 'nguoidung', 'lich_su_lam_viec_taixe', 'config'];
        
        if (!in_array($table, $allowedTables)) {
            return ['rows' => [], 'error' => 'Bảng không hợp lệ.'];
        }
        
        $result = callApi('/list/', ['table' => $table]);
        
        if (!$result['success']) {
            return ['rows' => [], 'error' => $result['message']];
        }
        
        $data = $result['data']['data'] ?? $result['data']['rows'] ?? $result['data'] ?? [];
        
        // Sắp xếp ID giảm dần
        usort($data, function($a, $b) {
            return ($b['id'] ?? 0) <=> ($a['id'] ?? 0);
        });
        
        return ['rows' => $data, 'error' => ''];
    }
}

// Cập nhật dữ liệu
if (!function_exists('admin_api_update_table')) {
    function admin_api_update_table(string $table, int $id, array $data): array
    {
        if ($id <= 0) {
            return ['success' => false, 'message' => 'ID không hợp lệ.'];
        }
        
        $result = callApi('/krud/', [
            'action' => 'update',
            'table' => $table,
            'id' => $id,
            'data' => $data
        ]);
        
        if (!$result['success']) {
            return ['success' => false, 'message' => $result['message']];
        }
        
        return ['success' => true, 'message' => 'Cập nhật thành công.'];
    }
}

// Thêm mới dữ liệu
if (!function_exists('admin_api_insert_table')) {
    function admin_api_insert_table(string $table, array $data): array
    {
        $result = callApi('/krud/', [
            'action' => 'insert',
            'table' => $table,
            'data' => $data
        ]);
        
        if (!$result['success']) {
            return ['success' => false, 'message' => $result['message']];
        }
        
        $insertId = $result['data']['id'] ?? $result['data']['insert_id'] ?? 0;
        
        return [
            'success' => true,
            'message' => 'Thêm mới thành công.',
            'id' => (int)$insertId
        ];
    }
}

// Xóa dữ liệu
if (!function_exists('admin_api_delete_table')) {
    function admin_api_delete_table(string $table, int $id): array
    {
        if ($id <= 0) {
            return ['success' => false, 'message' => 'ID không hợp lệ.'];
        }
        
        $result = callApi('/krud/', [
            'action' => 'delete',
            'table' => $table,
            'id' => $id
        ]);
        
        if (!$result['success']) {
            return ['success' => false, 'message' => $result['message']];
        }
        
        return ['success' => true, 'message' => 'Xóa thành công.'];
    }
}

// Hàm normalize rows (giữ nguyên để tương thích)
if (!function_exists('admin_api_normalize_rows')) {
    function admin_api_normalize_rows($decoded): array
    {
        if (!is_array($decoded)) {
            return [];
        }
        return array_values(array_filter($decoded, static fn($item): bool => is_array($item)));
    }
}
?>