<?php
header('Content-Type: application/json; charset=utf-8');

// Kết nối DB
require_once 'db.php';

// Query lấy danh sách hóa đơn (full quyền admin)
$sql = "SELECT 
            i.*,
            u.ten AS employee_name,
            u.dien_thoai AS employee_phone
        FROM hoa_don i
        LEFT JOIN nguoi_dung u ON i.nhan_vien_id = u.id
        ORDER BY i.ngay_tao DESC";

$result = $conn->query($sql);

$invoices = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $invoices[] = $row;
    }
}

// Trả JSON
echo json_encode([
    'success' => true,
    'invoices' => $invoices
], JSON_UNESCAPED_UNICODE);

$conn->close();
?>