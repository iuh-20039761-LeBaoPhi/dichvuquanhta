<?php
require_once "auth.php";
require_once "../main/db.php";
require_once "calc_price.php";

$order_id = $_POST['order_id'];
$driver_id = $_POST['driver_id'];

// Lấy km + giờ từ đơn
$order = $conn->query("SELECT distance_km, duration_hour FROM driver_orders WHERE id=$order_id")->fetch_assoc();

$price = calcPrice($order['distance_km'], $order['duration_hour']);

// Gán tài xế + cập nhật giá
$conn->query("
   UPDATE driver_orders 
SET driver_id=$driver_id, total_price=$price 
WHERE id=$order_id

");

// Tài xế bận
$conn->query("UPDATE drivers SET status='busy' WHERE id=$driver_id");

header("Location: dashboard.php");
