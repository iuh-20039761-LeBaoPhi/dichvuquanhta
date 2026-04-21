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

    // Kiểm tra xem user có phải là tài xế không (id_dichvu chứa '1' hoặc role là driver)
    $id_dichvu = (int)($user['id_dichvu'] ?? 0);
    $userPhone = preg_replace('/\D/', '', $user['sodienthoai'] ?? '');

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
        
        // Kiểm tra nếu user là tài xế (nhà cung cấp)
        if ($id_dichvu === 1) {
            // Tài xế: lấy đơn hàng có trạng thái null HOẶC khớp số điện thoại tài xế
            $trangthai = $item['trangthai'] ?? null;
            $phoneDriver = preg_replace('/\D/', '', $item['sdt_taixe'] ?? '');
            
            // Đơn hàng chưa có tài xế nhận (trạng thái null hoặc rỗng) hoặc đã được phân công cho tài xế này
            if ($trangthai === null || $trangthai === '' || $phoneDriver === $userPhone) {
                $isMatch = true;
            }
        } else {
            // Khách hàng: khớp số điện thoại khách hàng (dùng cho trường hợp khách hàng đăng nhập)
            $phoneKH = preg_replace('/\D/', '', $item['sdtkhachhang'] ?? '');
            if ($phoneKH === $userPhone) {
                $isMatch = true;
            }
        }

        if ($isMatch) {
            // Truyền trực tiếp dữ liệu theo tên cột
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
        
        // Đơn hàng được phân công cho tài xế này HOẶC đơn hàng chưa có ai nhận (id_taixe = 0 hoặc null)
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
 * @param int $id ID đơn hàng
 * @return array|null Thông tin đơn hàng hoặc null
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
 * @param int $id ID đơn hàng
 * @param string $status Trạng thái mới
 * @return array Kết quả cập nhật
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
        return ['success' => false, 'message' => 'Không thể kết nối API'];
    }
    
    $result = json_decode($raw, true);
    if (isset($result['error']) && $result['error']) {
        return ['success' => false, 'message' => $result['error']];
    }
    
    return ['success' => true, 'message' => 'Cập nhật thành công'];
}

/**
 * Phân công tài xế cho đơn hàng
 * @param int $id ID đơn hàng
 * @param array $driverInfo Thông tin tài xế
 * @return array Kết quả phân công
 */
function assign_driver_to_invoice($id, $driverInfo) {
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID đơn hàng không hợp lệ'];
    }
    
    $url = 'https://api.dvqt.vn/krud/';
    $payload = json_encode([
        'action' => 'update',
        'table' => 'datlich_taixe',
        'id' => $id,
        'data' => [
            'id_taixe' => $driverInfo['id'] ?? 0,
            'ten_taixe' => $driverInfo['hovaten'] ?? '',
            'sdt_taixe' => $driverInfo['sodienthoai'] ?? '',
            'email_taixe' => $driverInfo['email'] ?? '',
            'diachi_taixe' => $driverInfo['diachi'] ?? '',
            'avatar_taixe' => $driverInfo['anh_dai_dien'] ?? '',
            'trangthai' => 'đã nhận',
            'ngaynhan' => date('Y-m-d H:i:s')
        ]
    ], JSON_UNESCAPED_UNICODE);
    
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
        return ['success' => false, 'message' => 'Không thể kết nối API'];
    }
    
    $result = json_decode($raw, true);
    if (isset($result['error']) && $result['error']) {
        return ['success' => false, 'message' => $result['error']];
    }
    
    return ['success' => true, 'message' => 'Nhận việc thành công'];
}

/**
 * Cập nhật thời gian bắt đầu/thực tế của đơn hàng
 * @param int $id ID đơn hàng
 * @param string $type 'start' hoặc 'end'
 * @return array Kết quả cập nhật
 */
function update_invoice_time($id, $type) {
    if ($id <= 0) {
        return ['success' => false, 'message' => 'ID đơn hàng không hợp lệ'];
    }
    
    $now = date('Y-m-d H:i:s');
    $data = [];
    
    if ($type === 'start') {
        $data['thoigian_batdau_thucte'] = $now;
        $data['trangthai'] = 'đang thực hiện';
    } elseif ($type === 'end') {
        $data['thoigian_ketthuc_thucte'] = $now;
        $data['trangthai'] = 'hoàn thành';
        $data['tien_do'] = 100;
    } else {
        return ['success' => false, 'message' => 'Loại cập nhật không hợp lệ'];
    }
    
    $url = 'https://api.dvqt.vn/krud/';
    $payload = json_encode([
        'action' => 'update',
        'table' => 'datlich_taixe',
        'id' => $id,
        'data' => $data
    ], JSON_UNESCAPED_UNICODE);
    
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
        return ['success' => false, 'message' => 'Không thể kết nối API'];
    }
    
    $result = json_decode($raw, true);
    if (isset($result['error']) && $result['error']) {
        return ['success' => false, 'message' => $result['error']];
    }
    
    return ['success' => true, 'message' => 'Cập nhật thành công'];
}

// Thực thi và gán vào các biến dùng chung cho giao diện HTML
$resHoaDon = get_filtered_invoices();
$rows = $resHoaDon['data'] ?? [];
$loadError = $resHoaDon['error'] ?? '';
$isEmployeeApproved = true; // Cho phép hiển thị giao diện khi session hợp lệ

// Lấy danh sách đơn hàng dành riêng cho tài xế (đã nhận hoặc chưa có ai nhận)
$driverOrders = get_driver_invoices();
$driverRows = $driverOrders['data'] ?? [];
?>