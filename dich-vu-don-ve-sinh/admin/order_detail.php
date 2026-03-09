<?php
require_once "auth.php";
require_once "../main/db.php";

$id = $_GET['id'];

$stmt = $conn->prepare("SELECT * FROM bookings WHERE id=?");
$stmt->bind_param("i",$id);
$stmt->execute();

$result = $stmt->get_result();
$row = $result->fetch_assoc();
?>

<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Chi tiết đơn</title>
<link rel="stylesheet" href="../admin/layout/orders.css">
</head>

<body class="admin-page">

<div class="admin-layout">

<?php require_once "../admin/layout/sidebar.php"; ?>

<main class="main-content">

<h1>Chi tiết đơn #<?= $row['id'] ?></h1>

<div class="order-detail">

<p><b>Khách hàng:</b> <?= $row['customer_name'] ?></p>

<p><b>SĐT:</b> <?= $row['phone'] ?></p>

<p><b>Dịch vụ:</b> <?= $row['service_type'] ?></p>

<p><b>Diện tích:</b> <?= $row['area'] ?> m²</p>

<p><b>Số phòng:</b> <?= $row['rooms'] ?></p>

<p><b>Mức độ vệ sinh:</b> <?= $row['cleaning_level'] ?></p>

<p><b>Ngày đặt:</b> <?= $row['booking_date'] ?></p>

<p><b>Địa chỉ:</b>
<?= $row['address'] ?>,
<?= $row['district'] ?>,
<?= $row['city'] ?>
</p>

<p><b>Ghi chú:</b><br>
<?= nl2br($row['note']) ?>
</p>
<p><b>Nhà cung cấp:</b> <?= $row['supplier_name'] ?? '-' ?></p>

<p><b>Người thực hiện:</b> <?= $row['executor'] ?? '-' ?></p>
<hr>

<h2>Phân công công việc</h2>

<form method="post" action="order_assign.php">

<input type="hidden" name="id" value="<?= $row['id'] ?>">

<p>
<label>Nhà cung cấp</label><br>
<select name="supplier_name">
<option value="Đội Care">Đội Care</option>
<option value="Đội A">Đội A</option>
<option value="Đội B">Đội B</option>
</select>
</p>

<p>
<label>Người thực hiện</label><br>
<input type="text" name="executor" placeholder="Tên nhân viên">
</p>

<button type="submit">Lưu phân công</button>

</form>
</div>

</main>
</div>

</body>
</html>