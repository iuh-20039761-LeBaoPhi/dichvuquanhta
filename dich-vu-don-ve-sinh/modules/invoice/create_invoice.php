<?php
require_once "../../main/db.php";

$booking_id = isset($_GET['booking_id']) ? (int)$_GET['booking_id'] : 0;

if ($booking_id <= 0) {
    die("Thiếu booking_id");
}

$booking = $conn->query("
    SELECT * FROM bookings 
    WHERE id = $booking_id
")->fetch_assoc();

if (!$booking) {
    die("Không tìm thấy đơn hàng");
}

// ✅ CHỈ CHO PHÉP XUẤT KHI ĐÃ DUYỆT
if ($booking['status'] !== 'approved') {
    die("Đơn hàng chưa được duyệt");
}

// ✅ TRÁNH XUẤT TRÙNG
if ($booking['invoice_status'] === 'issued') {
    die("Hóa đơn đã được xuất");
}

/*
    MOCK API XUẤT HÓA ĐƠN
    (giả lập VNPT / FPT)
*/
$invoice_code = "HD-" . date("Ymd") . "-" . $booking_id;

$conn->query("
    UPDATE bookings 
    SET invoice_status = 'issued',
        invoice_code = '$invoice_code'
    WHERE id = $booking_id
");


echo "<h2>✅ Xuất hóa đơn thành công</h2>";
echo "<p>Mã hóa đơn: <b>$invoice_code</b></p>";
echo "<a href='../../admin/bookings.php'>← Quay lại danh sách</a>";
