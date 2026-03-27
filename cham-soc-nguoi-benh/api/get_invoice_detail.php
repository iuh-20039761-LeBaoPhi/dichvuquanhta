<?php
session_start();
require_once 'db.php';
$isLoggedIn = isset($_SESSION['nguoi_dung_id']);
$userId = $isLoggedIn ? intval($_SESSION['nguoi_dung_id']) : 0;
$userRole = $isLoggedIn ? $_SESSION['vai_tro'] : '';

$requestData = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawInput = file_get_contents('php://input');
    $decodedInput = json_decode($rawInput, true);
    if (is_array($decodedInput)) {
        $requestData = $decodedInput;
    }
}

$invoiceId = isset($requestData['hoa_don_id'])
    ? intval($requestData['hoa_don_id'])
    : (isset($_GET['hoa_don_id']) ? intval($_GET['hoa_don_id']) : 0);

$lookupPhoneRaw = isset($requestData['dien_thoai'])
    ? $requestData['dien_thoai']
    : (isset($_GET['dien_thoai']) ? $_GET['dien_thoai'] : '');
$lookupPhone = sanitize((string)$lookupPhoneRaw);

if ($invoiceId === 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid invoice ID']);
    exit;
}

// Get full invoice info
$invoiceSql = "SELECT * FROM hoa_don WHERE id = ?";
$invoiceStmt = $conn->prepare($invoiceSql);
$invoiceStmt->bind_param('i', $invoiceId);
$invoiceStmt->execute();
$invoiceResult = $invoiceStmt->get_result();

if ($invoiceResult->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Không tìm thấy hóa đơn']);
    exit;
}

$invoice = $invoiceResult->fetch_assoc();

// Check permissions
if ($isLoggedIn) {
    if ($userRole === 'khach_hang') {
        // Customer can only view their own invoices
        if ($invoice['khach_hang_id'] != $userId) {
            echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xem hóa đơn này']);
            exit;
        }
    } else if ($userRole === 'nhan_vien') {
        // Employee can only view invoices assigned to them
        if ($invoice['nhan_vien_id'] != $userId) {
            echo json_encode(['success' => false, 'message' => 'Bạn không có quyền xem hóa đơn này']);
            exit;
        }
    }
} else {
    // Public lookup flow: allow only when phone matches invoice phone.
    if (empty($lookupPhone) || $lookupPhone !== $invoice['dien_thoai']) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }
}

// Get customer info WITHOUT CCCD (phân quyền)
$customer = null;
if ($invoice['khach_hang_id']) {
    $customerSql = "SELECT id, ten, dien_thoai, email, dia_chi, anh_dai_dien FROM nguoi_dung WHERE id = ?";
    $customerStmt = $conn->prepare($customerSql);
    $customerStmt->bind_param('i', $invoice['khach_hang_id']);
    $customerStmt->execute();
    $customerResult = $customerStmt->get_result();
    if ($customerResult->num_rows > 0) {
        $customer = $customerResult->fetch_assoc();
    }
    $customerStmt->close();
}

// Get employee info WITHOUT CCCD (phân quyền)
$employee = null;
if ($invoice['nhan_vien_id']) {
    $employeeSql = "SELECT u.id, u.ten, u.dien_thoai, u.email, u.dia_chi, u.anh_dai_dien, 
                           ep.danh_gia, ep.kinh_nghiem 
                    FROM nguoi_dung u 
                    LEFT JOIN ho_so_nhan_vien ep ON u.id = ep.nguoi_dung_id 
                    WHERE u.id = ?";
    $employeeStmt = $conn->prepare($employeeSql);
    $employeeStmt->bind_param('i', $invoice['nhan_vien_id']);
    $employeeStmt->execute();
    $employeeResult = $employeeStmt->get_result();
    if ($employeeResult->num_rows > 0) {
        $employee = $employeeResult->fetch_assoc();
    }
    $employeeStmt->close();
}

// Get all media (images and videos)
$mediaSql = "SELECT im.*, u.ten as uploader_name, u.vai_tro as uploader_role 
             FROM media_hoa_don im 
             LEFT JOIN nguoi_dung u ON im.nguoi_dung_id = u.id 
             WHERE im.hoa_don_id = ? 
             ORDER BY im.ngay_tao DESC";
$mediaStmt = $conn->prepare($mediaSql);
$mediaStmt->bind_param('i', $invoiceId);
$mediaStmt->execute();
$mediaResult = $mediaStmt->get_result();

$media = [];
while ($row = $mediaResult->fetch_assoc()) {
    $media[] = $row;
}

echo json_encode([
    'success' => true,
    'invoice' => $invoice,
    'khach_hang' => $customer,
    'nhan_vien' => $employee,
    'media' => $media
]);

$invoiceStmt->close();
$mediaStmt->close();
$conn->close();
?>
