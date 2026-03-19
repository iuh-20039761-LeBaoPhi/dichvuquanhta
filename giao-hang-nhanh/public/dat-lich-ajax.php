<?php
header('Content-Type: application/json');
session_start();

require_once __DIR__ . '/../config/db.php';

function json_response($payload, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($payload);
    exit;
}

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

function map_package_type_to_item_type($packageType) {
    $normalized = strtolower(trim((string) $packageType));
    $map = [
        'document' => 'thuong',
        'clothes' => 'thuong',
        'food' => 'thuong',
        'other' => 'thuong',
        'electronic' => 'gia-tri-cao',
        'fragile' => 'de-vo',
        'frozen' => 'dong-lanh',
        'liquid' => 'chat-long',
    ];

    return $map[$normalized] ?? 'thuong';
}

function normalize_reorder_payment_method($paymentMethod) {
    $normalized = strtolower(trim((string) $paymentMethod));
    if (in_array($normalized, ['bank', 'bank_transfer', 'transfer', 'chuyen_khoan'], true)) {
        return 'chuyen_khoan';
    }

    return 'tien_mat';
}

function normalize_reorder_vehicle_key($vehicleType) {
    $normalized = strtolower(trim((string) $vehicleType));
    if ($normalized === '') {
        return 'auto';
    }
    if (strpos($normalized, 'xe_may') !== false || strpos($normalized, 'xe máy') !== false) {
        return 'xe_may';
    }
    if (strpos($normalized, 'xe_loi') !== false || strpos($normalized, 'xe lôi') !== false || strpos($normalized, 'ba gác') !== false) {
        return 'xe_loi';
    }
    if (strpos($normalized, 'xe_ban_tai') !== false || strpos($normalized, 'bán tải') !== false || strpos($normalized, 'van') !== false) {
        return 'xe_ban_tai';
    }
    if (strpos($normalized, 'xe_tai') !== false || strpos($normalized, 'xe tải') !== false || strpos($normalized, 'tải nhẹ') !== false) {
        return 'xe_tai';
    }

    return 'auto';
}

function extract_reorder_note_and_fee_payer($note) {
    $noteText = trim((string) $note);
    if ($noteText === '') {
        return ['note' => '', 'fee_payer' => 'gui'];
    }

    $feePayer = 'gui';
    $cleanLines = [];
    foreach (preg_split('/\r\n|\r|\n/', $noteText) as $line) {
        $trimmedLine = trim($line);
        if ($trimmedLine === '') {
            continue;
        }
        if (stripos($trimmedLine, 'Người trả cước:') === 0) {
            if (preg_match('/người nhận/ui', $trimmedLine)) {
                $feePayer = 'nhan';
            }
            continue;
        }
        $cleanLines[] = $trimmedLine;
    }

    return [
        'note' => implode("\n", $cleanLines),
        'fee_payer' => $feePayer,
    ];
}

// Chỉ cho phép người dùng đăng nhập
if (!isset($_SESSION['user_id'])) {
    json_response(['success' => false, 'message' => 'Vui lòng đăng nhập để đặt đơn.'], 401);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['reorder_id'])) {
    $reorderId = intval($_GET['reorder_id']);
    if ($reorderId <= 0) {
        json_response(['success' => false, 'message' => 'Mã đơn đặt lại không hợp lệ.'], 400);
    }

    $userId = intval($_SESSION['user_id']);
    $stmt = $conn->prepare("
        SELECT id, order_code, name, phone, receiver_name, receiver_phone,
               pickup_address, delivery_address, service_type, vehicle_type,
               package_type, weight, cod_amount, note, payment_method
        FROM orders
        WHERE id = ? AND user_id = ?
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
        SELECT item_name, quantity, weight, length, width, height, declared_value
        FROM order_items
        WHERE order_id = ?
        ORDER BY id ASC
    ");
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
        'data' => [
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
        ],
    ]);
}

// Nhận dữ liệu JSON từ Client
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    json_response(['success' => false, 'message' => 'Dữ liệu không hợp lệ.'], 400);
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
    json_response([
        'success' => true, 
        'message' => 'Đặt đơn hàng thành công!',
        'order_code' => $order_code
    ]);

} catch (Exception $e) {
    $conn->rollback();
    json_response([
        'success' => false, 
        'message' => $e->getMessage()
    ], 500);
}
