<?php
require_once "../main/db.php";

$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$password = $_POST['password'] ?? '';

if (!$name || !$phone || !$password) {
    die("Thiếu thông tin");
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("
    INSERT INTO customers (name, phone, password)
    VALUES (?, ?, ?)
");
$stmt->bind_param("sss", $name, $phone, $hash);
$stmt->execute();

header("Location: login.php");
exit;
