<?php
session_start();
require_once "../main/db.php";

$user = $_POST['username'];
$pass = md5($_POST['password']);

$stmt = $conn->prepare("SELECT * FROM admins WHERE username=? AND password=?");
$stmt->bind_param("ss", $user, $pass);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 1) {
    $_SESSION['admin'] = $user;
    header("Location: dashboard.php");
} else {
    echo "Sai tài khoản hoặc mật khẩu";
}
