<?php
session_start();
require_once "db.php";

$phone = $_POST['phone'] ?? '';
$password = $_POST['password'] ?? '';

$stmt = $conn->prepare("SELECT * FROM customers WHERE phone=?");
$stmt->bind_param("s", $phone);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if (!$user || !password_verify($password, $user['password'])) {
    die("Sai tài khoản hoặc mật khẩu");
}

$_SESSION['customer_id'] = $user['id'];
$_SESSION['customer_name'] = $user['name'];

header("Location: ../customer/dashboard.php");
exit;
