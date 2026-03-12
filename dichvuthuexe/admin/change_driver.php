<?php
require_once "auth.php";
require_once "../main/db.php";

$order_id = $_POST['order_id'];
$old_driver_id = $_POST['old_driver_id'];

// Trả tài xế cũ về free
$conn->query("UPDATE drivers SET status='free' WHERE id=$old_driver_id");

// Xoá gán cũ
$conn->query("UPDATE driver_orders SET driver_id=NULL WHERE id=$order_id");


// Quay lại dashboard
header("Location: dashboard.php");
