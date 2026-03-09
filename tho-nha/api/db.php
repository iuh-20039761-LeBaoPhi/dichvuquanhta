<?php
// File: api/db.php
$conn = new mysqli("localhost", "root", "", "thonha_db");

if ($conn->connect_error) {
    die("Kết nối thất bại: " . $conn->connect_error);
}

// Quan trọng: Set charset UTF-8
$conn->set_charset("utf8mb4");
?>