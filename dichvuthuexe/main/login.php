<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Đăng nhập</title>
    <link rel="stylesheet" href="../assets/main.css">
    <link rel="stylesheet" href="../assets/form.css">
</head>
<body>

<?php include "../partials/header.php"; ?>

<section class="page">
    <h2 class="section-title">🔐 Đăng nhập</h2>

    <form action="login_process.php" method="POST">
        <input type="tel" name="phone" placeholder="Số điện thoại" required>
        <input type="password" name="password" placeholder="Mật khẩu" required>
        <button>ĐĂNG NHẬP</button>
    </form>
       <div class="auth-extra">
            <span>Bạn chưa có tài khoản?</span>
            <a href="register.php">Đăng ký ngay</a>
        </div>
</section>

<?php include "../partials/footer.php"; ?>

</body>
</html>
