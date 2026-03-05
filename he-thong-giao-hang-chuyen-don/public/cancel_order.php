<?php
session_start();
require_once __DIR__ . '/../config/db.php';

// Kiểm tra quyền Admin
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    header("Location: index.php");
    exit;
}

// Lấy ID đơn hàng từ URL
$id = $_GET['id'] ?? 0;

if ($id) {
    // Cập nhật trạng thái thành 'cancelled' (Đã hủy)
    $stmt = $conn->prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $stmt->close();
}

// Quay lại trang quản lý
header("Location: orders_manage.php");
exit;
?>
