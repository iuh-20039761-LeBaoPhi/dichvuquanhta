<?php
require_once "db.php";

$name = trim($_POST['name'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$email = trim($_POST['email'] ?? '');
$message = trim($_POST['message'] ?? '');

if (!$name || !$phone || !$message) {
    die("Thiếu thông tin");
}

$stmt = $conn->prepare("
    INSERT INTO contacts (name, phone, email, message)
    VALUES (?, ?, ?, ?)
");
$stmt->bind_param("ssss", $name, $phone, $email, $message);
$stmt->execute();

header("Location: contact.php?success=1");
exit;
