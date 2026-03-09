<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "cleaning_service"; // tên database của ông

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Kết nối DB thất bại: " . $conn->connect_error);
}

$conn->set_charset("utf8mb4");
