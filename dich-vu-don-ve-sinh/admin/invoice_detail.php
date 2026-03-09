<?php
require_once "../main/db.php";

$id = $_GET['id'] ?? 0;

$invoice = $conn->query("
    SELECT * FROM bookings WHERE id = $id
")->fetch_assoc();

if (!$invoice) {
    die("Không tìm thấy hóa đơn");
}
?>

<h2>🧾 Chi tiết hóa đơn</h2>

<p><b>Mã hóa đơn:</b> <?= $invoice['invoice_code'] ?></p>
<p><b>Khách hàng:</b> <?= htmlspecialchars($invoice['customer_name']) ?></p>
<p><b>SĐT (MST mock):</b> <?= $invoice['phone'] ?></p>
<p><b>Ngày đặt:</b> <?= $invoice['created_at'] ?></p>
<p><b>Trạng thái đơn:</b> <?= $invoice['status'] ?></p>
<p><b>Hóa đơn:</b> <?= $invoice['invoice_status'] ?></p>

<hr>
<p><i>
Hóa đơn điện tử được xuất thông qua hệ thống tích hợp API VNPT/FPT  
</i></p>

<a href="invoices.php">← Quay lại danh sách hóa đơn</a>
