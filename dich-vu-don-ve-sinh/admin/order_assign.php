<?php
require_once "../main/db.php";

$id = $_POST['id'];
$supplier = $_POST['supplier_name'];
$executor = $_POST['executor'];

$stmt = $conn->prepare("
UPDATE bookings 
SET supplier_name=?, executor=? 
WHERE id=?");

$stmt->bind_param("ssi",$supplier,$executor,$id);

$stmt->execute();

header("Location: order_detail.php?id=".$id);
exit;