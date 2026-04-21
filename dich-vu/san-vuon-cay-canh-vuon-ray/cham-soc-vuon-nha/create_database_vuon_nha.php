<?php
// Tạo database cho dịch vụ vườn nhà
header('Content-Type: application/json; charset=utf-8');

// Kết nối database
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "cham_soc_me_va_be";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Tạo bảng datlich_vuon_nha
    $sql = "CREATE TABLE IF NOT EXISTS `datlich_vuon_nha` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `customer_name` varchar(255) NOT NULL,
        `customer_phone` varchar(20) NOT NULL,
        `customer_email` varchar(255) DEFAULT NULL,
        `customer_address` text NOT NULL,
        `service_type` varchar(100) NOT NULL,
        `service_package` varchar(50) NOT NULL,
        `start_date` date NOT NULL,
        `end_date` date NOT NULL,
        `start_time` time NOT NULL,
        `end_time` time NOT NULL,
        `selected_jobs` text NOT NULL,
        `extra_request` text,
        `customer_note` text,
        `base_price` decimal(10,2) NOT NULL,
        `commission_fee` decimal(10,2) NOT NULL,
        `night_fee` decimal(10,2) DEFAULT 0.00,
        `holiday_fee` decimal(10,2) DEFAULT 0.00,
        `travel_fee` decimal(10,2) NOT NULL,
        `total_price` decimal(10,2) NOT NULL,
        `distance_km` decimal(5,2) NOT NULL,
        `attachments` text,
        `status` enum('pending','confirmed','in_progress','completed','cancelled') DEFAULT 'pending',
        `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
        `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        KEY `idx_status` (`status`),
        KEY `idx_start_date` (`start_date`),
        KEY `idx_customer_phone` (`customer_phone`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $conn->exec($sql);

    echo json_encode([
        'success' => true,
        'message' => 'Database table datlich_vuon_nha created successfully'
    ]);

} catch(PDOException $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn = null;
?>