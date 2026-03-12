<?php
$conn = new mysqli("localhost", "root", "", "cleaning_service");
if ($conn->connect_error) die("DB error");

$id = $_GET['id'] ?? null;
$status = $_GET['status'] ?? null;

$allow = ['approved', 'cancelled'];

if (!$id || !in_array($status, $allow)) {
    die("INVALID_REQUEST");
}

$stmt = $conn->prepare("
    UPDATE driver_orders
    SET 
        status = ?,
        completed_driver_id = driver_id
    WHERE id = ?
");
$stmt->bind_param("si", $status, $id);
$stmt->execute();

header("Location: index.php");
exit;
