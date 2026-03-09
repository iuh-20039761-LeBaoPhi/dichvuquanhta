<?php
$conn = new mysqli("localhost", "root", "", "cleaning_service");
if ($conn->connect_error) die("DB error");

$id = $_GET['id'] ?? null;
$status = $_GET['status'] ?? null;

$allow = ['approved', 'cancelled'];

if (!$id || !in_array($status, $allow)) {
    die("INVALID_REQUEST");
}

$stmt = $conn->prepare(
    "UPDATE bookings SET status=? WHERE id=?"
);
$stmt->bind_param("si", $status, $id);
$stmt->execute();

header("Location: index.php");
exit;
