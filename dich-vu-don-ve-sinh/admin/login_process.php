<?php
session_start();
$conn = new mysqli("localhost", "root", "", "cleaning_service");
if ($conn->connect_error) die("DB error");

$username = $_POST['username'] ?? '';
$password = $_POST['password'] ?? '';

$stmt = $conn->prepare(
    "SELECT * FROM admins WHERE username = ?"
);
$stmt->bind_param("s", $username);
$stmt->execute();

$result = $stmt->get_result();
$admin = $result->fetch_assoc();

if ($admin && password_verify($password, $admin['password'])) {
    $_SESSION['admin'] = $admin['username'];
    header("Location: dashboard.php");
    exit;
}

echo "Sai tài khoản hoặc mật khẩu!";




