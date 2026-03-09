<?php
require_once "auth.php";
require_once "../main/db.php";

$id = $_GET['id'];
$action = $_GET['action'];

$status = ($action == 'approve') ? 'approved' : 'cancelled';

$stmt = $conn->prepare("UPDATE bookings SET status=? WHERE id=?");
$stmt->bind_param("si", $status, $id);
$stmt->execute();

header("Location: orders.php");
