<?php
session_start();
require_once "../main/db.php";

if (!isset($_SESSION['customer_id'])) {
    die("UNAUTHORIZED");
}

$cid = $_SESSION['customer_id'];
$name = trim($_POST['name']);
$email = trim($_POST['email']);

$stmt = $conn->prepare("
    UPDATE customers
    SET name = ?, email = ?
    WHERE id = ?
");
$stmt->bind_param("ssi", $name, $email, $cid);
$stmt->execute();

header("Location: profile.php");
exit;
