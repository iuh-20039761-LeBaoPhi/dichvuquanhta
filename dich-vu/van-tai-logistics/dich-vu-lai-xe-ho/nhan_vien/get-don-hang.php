<?php
// get-don-hang.php
require_once __DIR__ . '/../session_user.php';

/**
 * Hàm kiểm tra và lấy danh sách đơn hàng dựa theo session người dùng (tài xế)
 * @return array ['error' => string, 'data' => array]
 */
function get_filtered_invoices() {
    $user = $_SESSION['user'] ?? null;
    if (!$user) {
        return ['error' => 'Chưa đăng nhập', 'data' => []];
    }

    // ============================================
    // ĐÃ SỬA: Kiểm tra id_dichvu có rỗng không
    // Nếu KHÔNG rỗng → là tài xế (có đăng ký dịch vụ)
    // ============================================
    $id_dichvu = trim((string)($user['id_dichvu'] ?? ''));
    $isDriver = $id_dichvu !== '';  // Có id_dichvu → là tài xế
    
    $userPhone = preg_replace('/\D/', '', $user['sodienthoai'] ?? '');
    $userId = (int)($user['id'] ?? 0);

    // API lấy dữ liệu từ bảng đơn hàng thuê tài xế
    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => 'datlich_taixe'], JSON_UNESCAPED_UNICODE);
    
    $opts = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 20,
        ]
    ];
    $context = stream_context_create($opts);
    $raw = @file_get_contents($url, false, $context);

    if (!$raw) {
        return ['error' => 'Không thể kết nối API', 'data' => []];
    }

    $json = json_decode($raw, true);
    $allData = $json['data'] ?? $json['rows'] ?? $json['list'] ?? [];
    $filtered = [];

    foreach ($allData as $item) {
        $isMatch = false;
        
        // ============================================
        // ĐÃ SỬA: Kiểm tra đúng cách
        // ============================================
        if ($isDriver) {
            // Tài xế: lấy đơn hàng:
            // 1. Chưa có tài xế nhận (id_taixe = 0 hoặc rỗng)
            // 2. HOẶC được phân công cho tài xế này (khớp id_taixe)
            // 3. HOẶC khớp số điện thoại tài xế
            $idDriver = (int)($item['id_taixe'] ?? 0);
            $phoneDriver = preg_replace('/\D/', '', $item['sdt_taixe'] ?? '');
            
            if ($idDriver <= 0 || $idDriver === $userId || $phoneDriver === $userPhone) {
                $isMatch = true;
            }
        } else {
            // Khách hàng: khớp số điện thoại khách hàng
            $phoneKH = preg_replace('/\D/', '', $item['sdtkhachhang'] ?? '');
            if ($phoneKH === $userPhone) {
                $isMatch = true;
            }
        }

        if ($isMatch) {
            $filtered[] = $item;
        }
    }

    // Sắp xếp ID giảm dần (mới nhất lên đầu)
    usort($filtered, function($a, $b) {
        return (int)($b['id'] ?? 0) - (int)($a['id'] ?? 0);
    });

    return ['error' => '', 'data' => $filtered];
}

/**
 * Lấy danh sách đơn hàng cho tài xế (chỉ lấy đơn hàng đã được phân công hoặc chưa có ai nhận)
 * @return array ['error' => string, 'data' => array]
 */
function get_driver_invoices() {
    $user = $_SESSION['user'] ?? null;
    if (!$user) {
        return ['error' => 'Chưa đăng nhập', 'data' => []];
    }

    $userPhone = preg_replace('/\D/', '', $user['sodienthoai'] ?? '');
    $userId = (int)($user['id'] ?? 0);

    $url = 'https://api.dvqt.vn/list/';
    $payload = json_encode(['table' => 'datlich_taixe'], JSON_UNESCAPED_UNICODE);
    
    $opts = [
        'http' => [
            'method'  => 'POST',
            'header'  => "Content-Type: application/json\r\n",
            'content' => $payload,
            'timeout' => 20,
        ]
    ];
    $context = stream_context_create($opts);
    $raw = @file_get_contents($url, false, $context);

    if (!$raw) {
        return ['error' => 'Không thể kết nối API', 'data' => []];
    }

    $json = json_decode($raw, true);
    $allData = $json['data'] ?? $json['rows'] ?? $json['list'] ?? [];
    $filtered = [];

    foreach ($allData as $item) {
        $phoneDriver = preg_replace('/\D/', '', $item['sdt_taixe'] ?? '');
        $idDriver = (int)($item['id_taixe'] ?? 0);
        
        // Đơn hàng được phân công cho tài xế này HOẶC đơn hàng chưa có ai nhận
        if ($idDriver === $userId || ($idDriver <= 0 && $phoneDriver === '')) {
            $filtered[] = $item;
        }
    }

    // Sắp xếp ID giảm dần
    usort($filtered, function($a, $b) {
        return (int)($b['id'] ?? 0) - (int)($a['id'] ?? 0);
    });

    return ['error' => '', 'data' => $filtered];
}

/**
 * Lấy thông tin chi tiết một đơn hàng theo ID
 */
function get_invoice_by_id($id) {
    $result = get_filtered_invoices();
    if ($result['error'] !== '') {
        return null;
    }
    
    foreach ($result['data'] as $item) {
        if ((int)($item['id'] ?? 0) === (int)$id) {
            return $item;
        }
    }
    
    return null;
}

/**
 * Cập nhật trạng thái đơn hàng
 */
function update_invoice_status($id, $status) {
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID đơn hàng không hợp lệ'];
    }
    
    $url = 'https://api.dvqt.vn/krud/';
    $payload = json_encode([
        'action' => 'update',
        'table' => 'datlich_taixe',
        'id' => $id,
        'data' => ['trangthai' => $status]
    ], JSON_UNESCAPED_UNICODE);
    
    $opts = ['http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $payload, 'timeout' => 20]];
    $context = stream_context_create($opts);
    $raw = @file_get_contents($url, false, $context);
    
    if (!$raw) return ['success' => false, 'message' => 'Không thể kết nối API'];
    
    $result = json_decode($raw, true);
    if (isset($result['error']) && $result['error']) return ['success' => false, 'message' => $result['error']];
    
    return ['success' => true, 'message' => 'Cập nhật thành công'];
}

// Thực thi
$resHoaDon = get_filtered_invoices();
$rows = $resHoaDon['data'] ?? [];
$loadError = $resHoaDon['error'] ?? '';
$isEmployeeApproved = true;

$driverOrders = get_driver_invoices();
$driverRows = $driverOrders['data'] ?? [];
?>