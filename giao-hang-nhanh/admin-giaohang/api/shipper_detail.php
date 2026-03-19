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

$stmt = $conn->prepare("SELECT id, username, fullname, phone, email, vehicle_type, created_at, is_locked, is_approved
                        FROM users
                        WHERE id = ? AND role = 'shipper'
                        LIMIT 1");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$shipper = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$shipper) {
    admin_api_json(['success' => false, 'message' => 'Shipper không tồn tại hoặc ID không hợp lệ.'], 404);
}

$stmt = $conn->prepare("SELECT COUNT(*) AS total FROM orders WHERE shipper_id = ?");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$totalOrders = intval(($stmt->get_result()->fetch_assoc()['total'] ?? 0));
$stmt->close();

$stmt = $conn->prepare("SELECT COUNT(*) AS completed FROM orders WHERE shipper_id = ? AND status = 'completed'");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$completedOrders = intval(($stmt->get_result()->fetch_assoc()['completed'] ?? 0));
$stmt->close();

$stmt = $conn->prepare("SELECT AVG(rating) AS avg_rating, COUNT(rating) AS count_rating
                        FROM orders
                        WHERE shipper_id = ? AND rating > 0");
$stmt->bind_param('i', $shipperId);
$stmt->execute();
$ratingData = $stmt->get_result()->fetch_assoc();
$stmt->close();

$avgRating = !empty($ratingData['avg_rating']) ? round(floatval($ratingData['avg_rating']), 1) : 0.0;
$countRating = intval($ratingData['count_rating'] ?? 0);
$successRate = $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 1) : 0.0;

$feedbacks = [];
$stmt = $conn->prepare("SELECT o.order_code, o.rating, o.feedback, o.created_at, u.fullname AS customer_name
                        FROM orders o
                        LEFT JOIN users u ON o.user_id = u.id
                        WHERE o.shipper_id = ? AND o.rating > 0
                        ORDER BY o.created_at DESC
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
