<?php
session_start();

$conn = new mysqli("localhost", "root", "", "cleaning_service");
if ($conn->connect_error) {
    die("Kết nối thất bại");
}

// ===== DATA CHÍNH =====
$service_type = $_POST['service_type'] ?? '';
$name         = $_POST['customer_name'] ?? '';
$phone        = $_POST['phone'] ?? '';
$address      = $_POST['address'] ?? '';
$booking_date = $_POST['booking_date'] ?? '';
$note         = $_POST['note'] ?? '';
$total_price = $_POST['total_price'] ?? 0;
if (!$service_type || !$name || !$phone || !$booking_date) {
    die("Thiếu dữ liệu!");
}

// ===== CUSTOM DATA =====
$allowed_fields = [
    'area',
    'rooms',
    'cleaning_level',
    'jobs',
    'sofa_count',
    'carpet_area',
    'pest_type',
    'floors',
    'workers'
];

$custom_data = [];

foreach ($allowed_fields as $field) {
    if (isset($_POST[$field])) {
        $custom_data[$field] = $_POST[$field];
    }
}

// convert jobs array
if (isset($custom_data['jobs']) && is_array($custom_data['jobs'])) {
    $custom_data['jobs'] = implode(", ", $custom_data['jobs']);
}

$custom_data_json = json_encode($custom_data, JSON_UNESCAPED_UNICODE);

// ===== CUSTOMER =====
$customer_id = $_SESSION['customer']['id'] ?? null;

// ===== INSERT =====
$sql = "INSERT INTO bookings
(customer_id, service_type, customer_name, phone, address, booking_date, note, custom_data,total_price)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    die("SQL lỗi: " . $conn->error);
}

$stmt->bind_param(
    "isssssss",
    $customer_id,
    $service_type,
    $name,
    $phone,
    $address,
    $booking_date,
    $note,
    $custom_data_json
);

$stmt->execute();

// ===== SUCCESS =====
header("Location: booking_success.php");
exit();
?>