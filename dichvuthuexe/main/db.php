<?php
$host = "localhost";
$user = "root";
$pass = "";
$db   = "driver_service";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Kết nối DB thất bại: " . $conn->connect_error);
}
