<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đăng ký</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="../assets/form.css">
</head>
<body>

<?php include "../partials/header.php"; ?>

<section class="page">
    <h2 class="section-title">📝 Đăng ký khách hàng</h2>

    <form action="register_submit.php" method="POST">
        <input type="text" name="name" placeholder="Họ và tên" required>
        <input type="tel" name="phone" placeholder="Số điện thoại" required>
        <input type="password" name="password" placeholder="Mật khẩu" required>

        <button type="submit">ĐĂNG KÝ</button>
    </form>
</section>

<?php include "../partials/footer.php"; ?>

</body>
</html>
