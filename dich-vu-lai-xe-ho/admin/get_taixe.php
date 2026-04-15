<?php
declare(strict_types=1);

require_once __DIR__ . '/admin_api_common.php';

/**
 * Lấy danh sách tài xế
 */
function get_all_taixe(): array
{
    $result = admin_api_list_table('taixe');
    if ($result['error'] !== '') {
        return ['rows' => [], 'error' => $result['error']];
    }
    return ['rows' => $result['rows'], 'error' => ''];
}

/**
 * Lấy thông tin tài xế theo ID
 */
function get_taixe_by_id(int $id): array
{
    if ($id <= 0) {
        return ['row' => null, 'error' => 'ID không hợp lệ'];
    }
    
    $result = admin_api_list_table('taixe');
    if ($result['error'] !== '') {
        return ['row' => null, 'error' => $result['error']];
    }
    
    foreach ($result['rows'] as $row) {
        if ((int)($row['id'] ?? 0) === $id) {
            return ['row' => $row, 'error' => ''];
        }
    }
    
    return ['row' => null, 'error' => 'Không tìm thấy tài xế'];
}

/**
 * Duyệt tài xế (chuyển trạng thái từ pending sang active)
 */
function duyet_tai_xe(int $id): array
{
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID tài xế không hợp lệ'];
    }
    
    return admin_api_update_table('taixe', $id, [
        'trangthai' => 'active',
        'ngay_duyet' => date('Y-m-d H:i:s')
    ]);
}

/**
 * Khóa tài xế (chuyển trạng thái sang blocked)
 */
function khoa_tai_xe(int $id): array
{
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID tài xế không hợp lệ'];
    }
    
    return admin_api_update_table('taixe', $id, [
        'trangthai' => 'blocked'
    ]);
}

/**
 * Cập nhật trạng thái tài xế (busy/offline/active)
 */
function cap_nhat_trangthai_taixe(int $id, string $status): array
{
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID tài xế không hợp lệ'];
    }
    
    $allowed = ['active', 'busy', 'offline', 'pending', 'blocked'];
    if (!in_array($status, $allowed)) {
        return ['success' => false, 'message' => 'Trạng thái không hợp lệ'];
    }
    
    return admin_api_update_table('taixe', $id, [
        'trangthai' => $status
    ]);
}

/**
 * Thêm tài xế mới
 */
function them_taixe(array $data): array
{
    if (empty($data['hovaten']) || empty($data['sodienthoai'])) {
        return ['success' => false, 'message' => 'Thiếu thông tin bắt buộc'];
    }
    
    $data['trangthai'] = $data['trangthai'] ?? 'pending';
    $data['created_date'] = date('Y-m-d H:i:s');
    
    return admin_api_insert_table('taixe', $data);
}

/**
 * Cập nhật thông tin tài xế
 */
function sua_taixe(int $id, array $data): array
{
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID tài xế không hợp lệ'];
    }
    
    return admin_api_update_table('taixe', $id, $data);
}

/**
 * Xóa tài xế
 */
function xoa_taixe(int $id): array
{
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID tài xế không hợp lệ'];
    }
    
    return admin_api_delete_table('taixe', $id);
}
?>