<?php
require_once 'db.php';

$dien_thoai = isset($_GET['dien_thoai']) ? sanitize($_GET['dien_thoai']) : '';

if (empty($dien_thoai)) {
    echo json_encode(['success' => false, 'message' => 'Vui lòng nhập số điện thoại']);
    exit;
}

if (!isValidPhone($dien_thoai)) {
    echo json_encode(['success' => false, 'message' => 'Số điện thoại không hợp lệ']);
    exit;
}

// Get invoices by dien_thoai, include full employee snapshot fields for lookup detail fallback.
$sql = "SELECT i.*, 
           u.ten as employee_name, 
           u.dien_thoai as employee_phone, 
           u.email as employee_email,
           u.anh_dai_dien as employee_avatar,
           ep.danh_gia as employee_rating,
           ep.kinh_nghiem as employee_kinh_nghiem
    FROM hoa_don i 
    LEFT JOIN nguoi_dung u ON i.nhan_vien_id = u.id 
    LEFT JOIN ho_so_nhan_vien ep ON u.id = ep.nguoi_dung_id
    WHERE i.dien_thoai = ? 
    ORDER BY i.ngay_tao DESC";
$stmt = $conn->prepare($sql);
$stmt->bind_param('s', $dien_thoai);
$stmt->execute();
$result = $stmt->get_result();

$invoices = [];
while ($row = $result->fetch_assoc()) {
    // Get media for this invoice
    $mediaSql = "SELECT im.*, u.ten as uploader_name, u.vai_tro as uploader_role 
                 FROM media_hoa_don im 
                 LEFT JOIN nguoi_dung u ON im.nguoi_dung_id = u.id 
                 WHERE im.hoa_don_id = ?";
    $mediaStmt = $conn->prepare($mediaSql);
    $mediaStmt->bind_param('i', $row['id']);
    $mediaStmt->execute();
    $mediaResult = $mediaStmt->get_result();
    
    $media = [];
    while ($mediaRow = $mediaResult->fetch_assoc()) {
        $media[] = $mediaRow;
    }
    
    $row['media'] = $media;
    $invoices[] = $row;
    $mediaStmt->close();
}

if (count($invoices) === 0) {
    echo json_encode(['success' => false, 'message' => 'Không tìm thấy hóa đơn với số điện thoại này']);
} else {
    echo json_encode([
        'success' => true,
        'invoices' => $invoices
    ]);
}

$stmt->close();
$conn->close();
?>
