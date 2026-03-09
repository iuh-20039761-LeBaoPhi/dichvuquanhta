<?php
$conn = new mysqli("localhost", "root", "", "garden");

if ($conn->connect_error) {
    die("DB Error: " . $conn->connect_error);
}

/* Chỉ khởi tạo session nếu chưa tồn tại */
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>