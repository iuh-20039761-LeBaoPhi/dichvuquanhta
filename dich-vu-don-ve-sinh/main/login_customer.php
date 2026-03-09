<?php
session_start();
if (isset($_SESSION['customer'])) {
    header("Location: customer_dashboard.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <title>Khách hàng đăng nhập | Vệ Sinh Care</title>
    <link rel="stylesheet" href="../css/login_customer.css">
</head>
<body class="login-page">

<div class="login-wrapper">
    <div class="login-card">

        <!-- Header -->
        <div class="login-header">
            <h1>🧹 VỆ SINH CARE</h1>
            <p>Đăng nhập tài khoản khách hàng</p>
        </div>

        <!-- Form -->
        <form method="POST" action="login_customer_process.php" class="login-form">
            <h2>👤 Đăng nhập</h2>

            <?php if (isset($_GET['error'])): ?>
                <div class="error-msg">❌ Số điện thoại hoặc mật khẩu không đúng</div>
            <?php endif; ?>

            <div class="form-group">
                <label>Số điện thoại</label>
                <input type="text" name="phone" placeholder="0989xxxxxx" required>
            </div>

            <div class="form-group">
                <label>Mật khẩu</label>
                <input type="password" name="password" placeholder="••••••••" required>
            </div>

            <button type="submit" class="login-btn">
                Đăng nhập
            </button>

            <div class="login-footer">
                Chưa có tài khoản?
                <a href="register_customer.php">Đăng ký ngay</a>
            </div>
        </form>

    </div>
</div>

</body>
</html>
