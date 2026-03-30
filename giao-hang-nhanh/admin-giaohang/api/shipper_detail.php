<?php
require_once __DIR__ . '/admin_api_helper.php';

admin_api_require_admin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    admin_api_json(['success' => false, 'message' => 'Method không được hỗ trợ.'], 405);
}

$shipperId = intval($_GET['id'] ?? 0);
if ($shipperId <= 0) {
    admin_api_json(['success' => false, 'message' => 'Thiếu id shipper hợp lệ.'], 400);
}

$stmt = $conn->prepare("SELECT id, ten_dang_nhap AS username, ho_ten AS fullname, so_dien_thoai AS phone, email, loai_phuong_tien AS vehicle_type, tao_luc AS created_at, bi_khoa AS is_locked, da_duyet AS is_approved
                        FROM nguoi_dung
                        WHERE id = ? AND vai_tro = 'shipper'
                        LIMIT 1");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$shipper = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$shipper) {
    admin_api_json(['success' => false, 'message' => 'Shipper không tồn tại hoặc ID không hợp lệ.'], 404);
}

$stmt = $conn->prepare("SELECT COUNT(*) AS total FROM don_hang WHERE shipper_id = ?");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$totalOrders = intval(($stmt->get_result()->fetch_assoc()['total'] ?? 0));
$stmt->close();

$stmt = $conn->prepare("SELECT COUNT(*) AS completed FROM don_hang WHERE shipper_id = ? AND trang_thai = 'completed'");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$completedOrders = intval(($stmt->get_result()->fetch_assoc()['completed'] ?? 0));
$stmt->close();

$stmt = $conn->prepare("SELECT AVG(danh_gia_so_sao) AS avg_rating, COUNT(danh_gia_so_sao) AS count_rating
                        FROM don_hang
                        WHERE shipper_id = ? AND danh_gia_so_sao > 0");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$ratingData = $stmt->get_result()->fetch_assoc();
$stmt->close();

$avgRating = !empty($ratingData['avg_rating']) ? round(floatval($ratingData['avg_rating']), 1) : 0.0;
$countRating = intval($ratingData['count_rating'] ?? 0);
$successRate = $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 1) : 0.0;

$feedbacks = [];
$stmt = $conn->prepare("SELECT o.ma_don_hang AS order_code, o.danh_gia_so_sao AS rating, o.phan_hoi AS feedback, o.tao_luc AS created_at, u.ho_ten AS customer_name
                        FROM don_hang o
                        LEFT JOIN nguoi_dung u ON o.nguoi_dung_id = u.id
                        WHERE o.shipper_id = ? AND o.danh_gia_so_sao > 0
                        ORDER BY o.tao_luc DESC
                        LIMIT 5");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $feedbacks[] = [
        'order_code' => $row['order_code'] ?? '',
        'rating' => intval($row['rating'] ?? 0),
        'feedback' => $row['feedback'] ?? '',
        'created_at' => admin_api_value_or_null($row['created_at'] ?? null),
        'customer_name' => $row['customer_name'] ?? '',
    ];
}
$stmt->close();

admin_api_json([
    'success' => true,
    'data' => [
        'shipper' => [
            'id' => intval($shipper['id'] ?? 0),
            'username' => $shipper['username'] ?? '',
            'fullname' => $shipper['fullname'] ?? '',
            'phone' => $shipper['phone'] ?? '',
            'email' => $shipper['email'] ?? '',
            'vehicle_type' => admin_api_value_or_null($shipper['vehicle_type'] ?? null),
            'created_at' => admin_api_value_or_null($shipper['created_at'] ?? null),
            'is_locked' => intval($shipper['is_locked'] ?? 0) === 1,
            'is_approved' => intval($shipper['is_approved'] ?? 0) === 1,
        ],
        'metrics' => [
            'total_orders' => $totalOrders,
            'completed_orders' => $completedOrders,
            'success_rate' => $successRate,
            'avg_rating' => $avgRating,
            'count_rating' => $countRating,
            'bonus_points' => 850,
            'tier' => 'Bạch kim',
        ],
        'feedbacks' => $feedbacks,
    ],
]);
