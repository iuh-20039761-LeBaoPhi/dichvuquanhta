<?php
require_once "db.php";

$name     = trim($_POST['full_name']);
$phone    = trim($_POST['phone']);
$email    = trim($_POST['email']);
$password = $_POST['password'];

if (!$name || !$phone || !$email || !$password) {
    header("Location: register_customer.php?error=Thiếu thông tin");
    exit;
}

// hash mật khẩu
$hash = password_hash($password, PASSWORD_DEFAULT);

// kiểm tra trùng
$check = $conn->prepare("SELECT id FROM customers WHERE phone=? OR email=?");
$check->bind_param("ss", $phone, $email);
$check->execute();
$check->store_result();

if ($check->num_rows > 0) {
    header("Location: register_customer.php?error=Tài khoản đã tồn tại");
    exit;
}

// insert
$sql = "INSERT INTO customers (full_name, phone, email, password)
        VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssss", $name, $phone, $email, $hash);
$stmt->execute();

// xong → login
header("Location: login_customer.php");
exit;
