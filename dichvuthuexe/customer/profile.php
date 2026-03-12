<?php
session_start();
require_once "../main/db.php";

if (!isset($_SESSION['customer_id'])) {
    header("Location: login.php");
    exit;
}

$cid = $_SESSION['customer_id'];

$customer = $conn->query("
    SELECT name, phone, email, created_at
    FROM customers
    WHERE id = $cid
")->fetch_assoc();
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Hồ sơ cá nhân</title>
     <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="assets/customer.css">
    <link rel="stylesheet" href="assets/layout.css">
</head>
<body>

<?php include "../partials/header.php"; ?>
<div class="customer-layout">

    <?php include "partials/customer_sidebar.php"; ?>

    <main class="customer-content">
        <h2 class="section-title">👤 Hồ sơ cá nhân</h2>

        <form class="profile-form" action="profile_update.php" method="POST">
            <label>Họ tên</label>
            <input type="text" name="name" value="<?= $customer['name'] ?>" required>

            <label>Số điện thoại</label>
            <input type="text" value="<?= $customer['phone'] ?>" disabled>

            <label>Email</label>
            <input type="email" name="email" value="<?= $customer['email'] ?>">

            <label>Ngày tham gia</label>
            <input type="text" value="<?= date("d/m/Y", strtotime($customer['created_at'])) ?>" disabled>

            <button type="submit">💾 Cập nhật hồ sơ</button>
        </form>
    </main>

</div>

</body>

<?php include "../partials/footer.php"; ?>
</html>
