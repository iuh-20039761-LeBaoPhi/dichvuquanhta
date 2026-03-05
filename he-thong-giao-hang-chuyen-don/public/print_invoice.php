<?php
session_start();
require_once __DIR__ . '/../config/db.php';

if (!isset($_SESSION['user_id']))
    die("Access Denied");

$id = $_GET['id'] ?? 0;
$stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND user_id = ?");
$stmt->bind_param("ii", $id, $_SESSION['user_id']);
$stmt->execute();
$order = $stmt->get_result()->fetch_assoc();

if (!$order)
    die("Order not found");
?>
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8">
    <title>Hóa đơn #<?php echo $order['order_code']; ?></title>
    <link rel="stylesheet" href="assets/css/print.css?v=<?php echo time(); ?>">
</head>

<body>
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">🖨️ In ngay</button>
    </div>

    <div class="header">
        <h1>FASTGO SHIPPER</h1>
        <p>Biên nhận gửi hàng</p>
        <p>Mã đơn: <strong><?php echo $order['order_code']; ?></strong></p>
        <p>Ngày: <?php echo date('d/m/Y H:i', strtotime($order['created_at'])); ?></p>
    </div>

    <div class="section">
        <h3>Người gửi</h3>
        <div class="row"><span>Tên:</span> <span><?php echo $order['name']; ?></span></div>
        <div class="row"><span>SĐT:</span> <span><?php echo $order['phone']; ?></span></div>
        <div class="row"><span>Địa chỉ:</span> <span><?php echo $order['pickup_address']; ?></span></div>
    </div>

    <div class="section">
        <h3>Người nhận</h3>
        <div class="row"><span>Tên:</span> <span><?php echo $order['receiver_name']; ?></span></div>
        <div class="row"><span>SĐT:</span> <span><?php echo $order['receiver_phone']; ?></span></div>
        <div class="row"><span>Địa chỉ:</span> <span><?php echo $order['delivery_address']; ?></span></div>
    </div>

    <div class="section">
        <h3>Chi tiết hàng hóa</h3>
        <div class="row"><span>Loại:</span> <span><?php echo $order['package_type']; ?></span></div>
        <div class="row"><span>Khối lượng:</span> <span><?php echo $order['weight']; ?> kg</span></div>
        <div class="row"><span>Ghi chú:</span> <span><?php echo $order['note']; ?></span></div>
    </div>

    <div class="section">
        <h3>Thanh toán</h3>
        <div class="row"><span>Phí vận chuyển:</span> <span><?php echo number_format($order['shipping_fee']); ?>đ</span>
        </div>
        <div class="row"><span>Thu hộ (COD):</span> <span><?php echo number_format($order['cod_amount']); ?>đ</span>
        </div>
    </div>

    <div class="total">
        TỔNG CỘNG: <?php echo number_format($order['shipping_fee'] + $order['cod_amount']); ?>đ
    </div>

    <div style="text-align: center; margin-top: 50px; font-size: 12px;">
        <p>Cảm ơn quý khách đã sử dụng dịch vụ của FastGo!</p>
        <p>Hotline: 0123 456 789</p>
    </div>
</body>

</html>
