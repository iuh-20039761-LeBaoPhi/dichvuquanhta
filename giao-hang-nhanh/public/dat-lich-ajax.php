<?php
header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/db.php';

function first_non_empty_value(...$values) {
    foreach ($values as $value) {
        if ($value !== null && $value !== '') {
            return $value;
        }
    }
    return '';
}

function extract_slot_start_time($slotValue, $fallback = '08:00') {
    $slotText = trim((string)$slotValue);
    if ($slotText === '') {
        return $fallback;
    }

    if (preg_match('/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/', $slotText, $matches)) {
        return $matches[1];
    }

    if (preg_match('/(\d{1,2})_(\d{2})_(\d{1,2})_(\d{2})/', $slotText, $matches)) {
        return sprintf('%02d:%02d', intval($matches[1]), intval($matches[2]));
    }

    if (preg_match('/(\d{1,2}:\d{2})/', $slotText, $matches)) {
        return $matches[1];
    }

    return $fallback;
}

// Chỉ cho phép người dùng đăng nhập
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng đăng nhập để đặt đơn.']);
    exit;
}

// Nhận dữ liệu JSON từ Client
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'Dữ liệu không hợp lệ.']);
    exit;
}

$conn->begin_transaction();

try {
    $user_id = $_SESSION['user_id'];
    $order_code = 'ORD' . time();
    
    // Thu thập các thông tin cơ bản
    $name = $data['sender_name'] ?? '';
    $phone = $data['sender_phone'] ?? '';
    $pickup_address = $data['search_pickup'] ?? '';
    $receiver_name = $data['receiver_name'] ?? '';
    $receiver_phone = $data['receiver_phone'] ?? '';
    $delivery_address = $data['search_delivery'] ?? '';
    
    $service_type = $data['service'] ?? '';
    $vehicle_type = first_non_empty_value($data['vehicle_label'] ?? '', $data['vehicle'] ?? '');
    $shipping_fee = floatval($data['total_fee'] ?? 0);
    $cod_amount = floatval($data['cod_value'] ?? 0);
    $note = $data['notes'] ?? '';
    $payment_method = $data['payment_method'] ?? 'cash'; // cash/transfer
    
    // Thời gian lấy hàng
    $pickup_date = $data['pickup_date'] ?? date('Y-m-d');
    $pickup_slot = $data['pickup_slot'] ?? '';
    $pickup_slot_label = first_non_empty_value($data['pickup_slot_label'] ?? '', $pickup_slot);
    $pickup_time_str = $pickup_date . ' ' . extract_slot_start_time($pickup_slot_label);
    
    // Tính tổng trọng lượng
    $total_weight = 0;
    if (isset($data['items']) && is_array($data['items'])) {
        foreach ($data['items'] as $item) {
            $qty = max(1, intval($item['so_luong'] ?? 1));
            $total_weight += floatval($item['can_nang'] ?? 0) * $qty;
        }
    }

    // Insert order chính
    $sql = "INSERT INTO orders (
                order_code, user_id, pickup_address, name, phone, 
                receiver_name, receiver_phone, delivery_address, 
                service_type, vehicle_type, weight, cod_amount, 
                shipping_fee, pickup_time, note, 
                payment_method, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sissssssssdddsss", 
        $order_code, $user_id, $pickup_address, $name, $phone,
        $receiver_name, $receiver_phone, $delivery_address,
        $service_type, $vehicle_type, $total_weight, $cod_amount,
        $shipping_fee, $pickup_time_str, $note,
        $payment_method
    );

    if (!$stmt->execute()) {
        throw new Exception("Lỗi khi tạo đơn hàng chính: " . $stmt->error);
    }

    $order_id = $conn->insert_id;

    // Insert chi tiết món hàng
    if (isset($data['items']) && is_array($data['items'])) {
        $item_sql = "INSERT INTO order_items (
                        order_id, item_name, quantity, weight, 
                        length, width, height, declared_value
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        $item_stmt = $conn->prepare($item_sql);
        
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
            $item_stmt->execute();
        }
    }

    $conn->commit();
    echo json_encode([
        'success' => true, 
        'message' => 'Đặt đơn hàng thành công!',
        'order_code' => $order_code
    ]);

} catch (Exception $e) {
    $conn->rollback();
    echo json_encode([
        'success' => false, 
        'message' => $e->getMessage()
    ]);
}
