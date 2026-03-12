<?php
require_once "db.php";
session_start();
$customer_id = $_SESSION['customer_id'] ?? null;
if (!$customer_id) {
    header("Location: login.php");
    exit;
}
$customer_name   = $_POST['customer_name'];
$phone           = $_POST['phone'];
$vehicle_type    = $_POST['vehicle_type'];
$pickup_location = $_POST['pickup_location'];
$destination     = $_POST['destination'];
$distance_km     = $_POST['distance_km'];
$pickup_time     = $_POST['pickup_time'];
$note            = $_POST['note'] ?? '';

// Tính tiền
$price_per_km = ($vehicle_type === 'Ô tô') ? 15000 : 8000;
$total_price = $distance_km * $price_per_km;

// Insert DB
$sql = "
    INSERT INTO driver_orders 
    (customer_id, customer_name, phone, vehicle_type, pickup_location, destination, distance_km, total_price, pickup_time, note, status, created_at)
    VALUES
    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    "isssssdsss",
    $customer_id,       
    $customer_name,
    $phone,
    $vehicle_type,
    $pickup_location,
    $destination,
    $distance_km,
    $total_price,
    $pickup_time,
    $note   
);

$stmt->execute();

header("Location: success.php");
exit;
