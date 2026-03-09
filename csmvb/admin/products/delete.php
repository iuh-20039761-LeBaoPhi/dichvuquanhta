<?php
require_once '../../config/database.php';
require_once '../../config/auth_unified.php';
require_once '../../includes/functions.php';

requireAdmin();

$db = new Database();
$conn = $db->getConnection();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Đổi tên biến từ productId thành serviceId để phù hợp ngữ cảnh dịch vụ
    $serviceId = intval($_POST['product_id'] ?? 0); 

    if ($serviceId <= 0) {
        setFlashMessage('ID dịch vụ không hợp lệ', 'error');
        header('Location: index.php');
        exit();
    }

    try {
        // Lấy thông tin dịch vụ từ bảng dichvu
        $stmt = $conn->prepare("SELECT * FROM dichvu WHERE id = ?");
        $stmt->execute([$serviceId]);
        $service = $stmt->fetch();

        if (!$service) {
            setFlashMessage('Không tìm thấy dịch vụ', 'error');
            header('Location: index.php');
            exit();
        }

        // Logic đảo ngược trạng thái: 
        // Trong csmvb.sql, status là tinyint(1) (1: đang hoạt động, 0: tạm ẩn)
        $newStatus = ($service['status'] == 1) ? 0 : 1;
        
        $stmt = $conn->prepare("UPDATE dichvu SET status = ?, updated_at = NOW() WHERE id = ?");
        $stmt->execute([$newStatus, $serviceId]);

        $action = ($newStatus == 0) ? 'vô hiệu hóa' : 'kích hoạt';
        setFlashMessage("Đã {$action} dịch vụ '{$service['tendichvu']}' thành công!", 'success');

    } catch (PDOException $e) {
        setFlashMessage('Lỗi hệ thống: ' . $e->getMessage(), 'error');
    }

    header('Location: index.php');
    exit();
}

// Nếu không phải POST request, quay về trang chủ
header('Location: index.php');
exit();