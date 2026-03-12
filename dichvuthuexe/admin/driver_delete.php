<?php
require_once "auth.php";
require_once "../main/db.php";

$id = $_GET['id'] ?? 0;
if (!$id) die("INVALID_ID");

// 1️⃣ Kiểm tra tài xế có đang bận không
$driver = $conn->query("SELECT status FROM drivers WHERE id=$id")->fetch_assoc();
if (!$driver) die("NOT_FOUND");

if ($driver['status'] === 'busy') {
    die("❌ Không thể xóa tài xế đang chạy đơn");
}

// 2️⃣ Kiểm tra có doanh thu không
$used = $conn->query("
    SELECT COUNT(*) total 
    FROM driver_orders 
    WHERE completed_driver_id = $id
")->fetch_assoc()['total'];

if ($used > 0) {
    die("❌ Không thể xóa tài xế đã có doanh thu");
}

// 3️⃣ XÓA
$conn->query("DELETE FROM drivers WHERE id=$id");

header("Location: drivers.php");
